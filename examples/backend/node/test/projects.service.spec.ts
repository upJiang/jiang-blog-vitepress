import { ConflictException } from '@nestjs/common'
import { ProjectsService } from '../src/projects/projects.service'

describe('ProjectsService', () => {
  const principal = { sub: 'user-a', tenantId: 'tenant-a', sessionId: 'session-a' }

  it('places tenant and version in the update predicate', async () => {
    const project = { id: 'project-a', tenantId: 'tenant-a', version: 2 }
    const prisma = {
      project: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(project),
      },
    }
    const service = new ProjectsService(prisma as never)
    await expect(service.update(principal, 'project-a', { name: 'next', expectedVersion: 1 }))
      .resolves.toEqual(project)
    expect(prisma.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a', version: 1 }),
    }))
  })

  it('returns a conflict when the scoped project still exists', async () => {
    const prisma = {
      project: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'project-a', version: 2 }),
      },
    }
    const service = new ProjectsService(prisma as never)
    await expect(service.update(principal, 'project-a', { name: 'stale', expectedVersion: 1 }))
      .rejects.toBeInstanceOf(ConflictException)
  })
})
