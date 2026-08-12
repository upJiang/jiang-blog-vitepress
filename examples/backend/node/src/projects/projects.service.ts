import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma.service'
import type { Principal } from '../auth/auth.types'
import type { CreateProjectDto, UpdateProjectDto } from './projects.dto'

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(principal: Principal) {
    return this.prisma.project.findMany({
      where: { tenantId: principal.tenantId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 50,
    })
  }

  async create(principal: Principal, input: CreateProjectDto) {
    try {
      return await this.prisma.project.create({
        data: {
          id: randomUUID(),
          tenantId: principal.tenantId,
          ownerId: principal.sub,
          name: input.name.trim(),
          description: input.description?.trim() || null,
        },
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
        version: input.expectedVersion,
        deletedAt: null,
      },
      data: { name: input.name.trim(), version: { increment: 1 } },
    })
    if (changed.count === 1) return this.findScoped(principal, projectId)

    const current = await this.findScoped(principal, projectId, false)
    if (!current) throw new NotFoundException('project_not_found')
    throw new ConflictException({ code: 'project_version_conflict', current })
  }

  private async findScoped(principal: Principal, projectId: string, required = true) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: principal.tenantId, deletedAt: null },
    })
    if (!project && required) throw new NotFoundException('project_not_found')
    return project
  }
}
