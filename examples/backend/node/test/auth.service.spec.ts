import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../src/auth/auth.service'

describe('AuthService refresh reuse', () => {
  it('commits family revocation before returning an unauthorized result', async () => {
    const revoked = jest.fn().mockResolvedValue({ count: 2 })
    const tx = {
      authSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-old',
          userId: 'user-a',
          tokenFamilyId: 'family-a',
          refreshTokenHash: Buffer.alloc(32),
          expiresAt: new Date(Date.now() + 60_000),
          rotatedAt: new Date(),
          revokedAt: null,
          user: { tenantId: 'tenant-a' },
        }),
        updateMany: revoked,
      },
    }
    const prisma = { $transaction: (work: (client: typeof tx) => unknown) => work(tx) }
    const service = new AuthService(prisma as never, {} as never)

    await expect(service.refresh('stolen-old-token')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(revoked).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ revokeReason: 'refresh_reuse' }),
    }))
  })
})
