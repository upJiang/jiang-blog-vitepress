import { Injectable, NotFoundException } from '@nestjs/common'
import type { Principal } from '../auth/auth.types'
import { PrismaService } from '../prisma.service'

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async get(principal: Principal, taskId: string) {
    const task = await this.prisma.backgroundTask.findFirst({
      where: { id: taskId, tenantId: principal.tenantId },
    })
    if (!task) throw new NotFoundException('task_not_found')
    return {
      id: task.id,
      type: task.taskType,
      status: task.status,
      progress: task.progress,
      attempt: task.attempt,
      result: task.resultJson,
    }
  }

  async events(principal: Principal, taskId: string, after: bigint) {
    await this.get(principal, taskId)
    return this.prisma.taskEvent.findMany({
      where: { taskId, sequence: { gt: after } },
      orderBy: { sequence: 'asc' },
    })
  }
}
