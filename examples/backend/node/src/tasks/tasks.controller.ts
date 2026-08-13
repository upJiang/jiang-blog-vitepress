import { Controller, Get, Headers, Param, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { CurrentPrincipal } from '../auth/current-principal'
import type { Principal } from '../auth/auth.types'
import { TasksService } from './tasks.service'

@Controller('tasks')
@UseGuards(AccessTokenGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get(':taskId')
  get(@CurrentPrincipal() principal: Principal, @Param('taskId') taskId: string) {
    return this.tasks.get(principal, taskId)
  }

  @Get(':taskId/events')
  async events(
    @CurrentPrincipal() principal: Principal,
    @Param('taskId') taskId: string,
    @Headers('last-event-id') lastEventId: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const after = /^\d+$/.test(lastEventId ?? '') ? BigInt(lastEventId!) : 0n
    const [task, events] = await Promise.all([
      this.tasks.get(principal, taskId),
      this.tasks.events(principal, taskId, after),
    ])
    response.status(200)
    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    for (const event of events) {
      response.write(`id: ${event.sequence.toString()}\n`)
      response.write(`event: ${event.eventType}\n`)
      response.write(`data: ${JSON.stringify(event.dataJson)}\n\n`)
    }
    response.write(`event: snapshot\ndata: ${JSON.stringify(task)}\n\n`)
    response.end()
  }
}
