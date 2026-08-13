import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma.service'
import type { Principal } from './auth.types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email, status: 'active' } })
    if (!user || !await argon2.verify(user.passwordHash, password)) {
      throw new UnauthorizedException('invalid_credentials')
    }
    const refreshToken = this.randomToken()
    const session = await this.prisma.authSession.create({
      data: {
        id: randomUUID(),
        tenantId: user.tenantId,
        userId: user.id,
        tokenFamilyId: randomUUID(),
        refreshTokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      },
    })
    return { accessToken: this.sign(user.id, user.tenantId, session.id), refreshToken }
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('refresh_token_missing')
    const presentedHash = this.hash(rawToken)
    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.authSession.findUnique({
        where: { refreshTokenHash: presentedHash },
        include: { user: true },
      })
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('session_invalid')
      }
      if (session.rotatedAt) {
        await tx.authSession.updateMany({
          where: { tokenFamilyId: session.tokenFamilyId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'refresh_reuse' },
        })
        // 返回标记使撤销事务先提交，不能在这里抛错导致撤销回滚。
        return { kind: 'reused' as const }
      }

      const claimed = await tx.authSession.updateMany({
        where: { id: session.id, rotatedAt: null, revokedAt: null },
        data: { rotatedAt: new Date(), lastUsedAt: new Date() },
      })
      if (claimed.count !== 1) {
        await tx.authSession.updateMany({
          where: { tokenFamilyId: session.tokenFamilyId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'refresh_reuse' },
        })
        return { kind: 'reused' as const }
      }

      const refreshToken = this.randomToken()
      const next = await tx.authSession.create({
        data: {
          id: randomUUID(),
          tenantId: session.user.tenantId,
          userId: session.userId,
          tokenFamilyId: session.tokenFamilyId,
          refreshTokenHash: this.hash(refreshToken),
          expiresAt: session.expiresAt,
        },
      })
      return {
        kind: 'rotated' as const,
        accessToken: this.sign(session.userId, session.user.tenantId, next.id),
        refreshToken,
      }
    })
    if (result.kind === 'reused') throw new UnauthorizedException('session_reused')
    return result
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: this.hash(rawToken) },
    })
    if (!session) return
    await this.prisma.authSession.updateMany({
      where: { tokenFamilyId: session.tokenFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'logout' },
    })
  }

  private sign(userId: string, tenantId: string, sessionId: string): string {
    return this.jwt.sign({
      sub: userId,
      tenantId,
      sessionId,
      permissions: ['project.read', 'project.write', 'file.write', 'task.read'],
    } satisfies Principal)
  }

  private randomToken(): string {
    return randomBytes(32).toString('base64url')
  }

  private hash(token: string): Buffer {
    return createHash('sha256').update(token).digest()
  }
}
