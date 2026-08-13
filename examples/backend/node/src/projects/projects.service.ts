import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import { PrismaService } from '../prisma.service'
import type { Principal } from '../auth/auth.types'
import type { CreateProjectDto, UpdateProjectDto } from './projects.dto'

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(principal: Principal) {
    const items = await this.prisma.project.findMany({
      where: { tenantId: principal.tenantId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 50,
    })
    return { items: items.map((item) => this.toJson(item)), nextCursor: null }
  }

  async get(principal: Principal, projectId: string) {
    const project = await this.findScoped(principal, projectId)
    if (!project) throw new NotFoundException('project_not_found')
    return this.toJson(project)
  }

  async create(principal: Principal, idempotencyKey: string, input: CreateProjectDto) {
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new UnprocessableEntityException('idempotency_key_invalid')
    }
    const normalized = { name: input.name.trim(), description: input.description?.trim() || null }
    const requestHash = createHash('sha256').update(JSON.stringify(normalized)).digest()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.idempotencyKey.findUnique({
          where: { tenantId_scope_idemKey: { tenantId: principal.tenantId, scope: 'projects.create', idemKey: idempotencyKey } },
        })
        if (existing) {
          if (!Buffer.from(existing.requestHash).equals(requestHash)) {
            throw new ConflictException('idempotency_key_reused')
          }
          if (existing.status === 'completed' && existing.responseJson) return existing.responseJson
          throw new ConflictException('idempotency_request_in_progress')
        }
        await tx.idempotencyKey.create({
          data: {
            tenantId: principal.tenantId,
            scope: 'projects.create',
            idemKey: idempotencyKey,
            requestHash,
            status: 'processing',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
        const project = await tx.project.create({
          data: {
            id: randomUUID(),
            tenantId: principal.tenantId,
            ownerId: principal.sub,
            name: normalized.name,
            description: normalized.description,
          },
        })
        const response = this.toJson(project)
        await tx.idempotencyKey.update({
          where: { tenantId_scope_idemKey: { tenantId: principal.tenantId, scope: 'projects.create', idemKey: idempotencyKey } },
          data: { status: 'completed', responseStatus: 201, responseJson: response },
        })
        return response
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('project_name_exists')
      }
      throw error
    }
  }

  async update(principal: Principal, projectId: string, input: UpdateProjectDto) {
    const changed = await this.prisma.project.updateMany({
      where: {
        id: projectId,
        tenantId: principal.tenantId,
        version: input.version,
        deletedAt: null,
      },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined ? {} : { description: input.description?.trim() || null }),
        version: { increment: 1 },
      },
    })
    if (changed.count === 1) {
      const project = await this.findScoped(principal, projectId)
      if (!project) throw new NotFoundException('project_not_found')
      return this.toJson(project)
    }

    const current = await this.findScoped(principal, projectId, false)
    if (!current) throw new NotFoundException('project_not_found')
    throw new ConflictException({ code: 'project_version_conflict', current })
  }

  async delete(principal: Principal, projectId: string): Promise<void> {
    const changed = await this.prisma.project.updateMany({
      where: { id: projectId, tenantId: principal.tenantId, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    })
    if (changed.count !== 1) throw new NotFoundException('project_not_found')
  }

  private async findScoped(principal: Principal, projectId: string, required = true) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: principal.tenantId, deletedAt: null },
    })
    if (!project && required) throw new NotFoundException('project_not_found')
    return project
  }

  private toJson(project: { version: bigint | number; [key: string]: unknown }) {
    return { ...project, version: Number(project.version) }
  }
}
