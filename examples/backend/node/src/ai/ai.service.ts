import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import type { Principal } from '../auth/auth.types'
import { PrismaService } from '../prisma.service'
import { jsonValue } from '../json-value'

type KnowledgeBaseRow = { id: string }
type FileRow = { id: string }

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async knowledgeBases(principal: Principal) {
    const items = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, tenant_id AS tenantId, name, active_version AS activeVersion,
             CAST(version AS CHAR) AS version, created_at AS createdAt
      FROM knowledge_bases WHERE tenant_id = ${principal.tenantId} ORDER BY id LIMIT 100
    `)
    return { items: jsonValue(items), nextCursor: null }
  }

  async createDocument(principal: Principal, knowledgeBaseId: string, fileId: string) {
    return this.prisma.$transaction(async (tx) => {
      const knowledgeBases = await tx.$queryRaw<KnowledgeBaseRow[]>(Prisma.sql`
        SELECT id FROM knowledge_bases WHERE id = ${knowledgeBaseId} AND tenant_id = ${principal.tenantId}
        FOR UPDATE
      `)
      if (!knowledgeBases[0]) throw new NotFoundException('knowledge_base_not_found')
      const files = await tx.$queryRaw<FileRow[]>(Prisma.sql`
        SELECT id FROM files
        WHERE id = ${fileId} AND tenant_id = ${principal.tenantId} AND status NOT IN ('deleted', 'deleting', 'rejected')
        FOR UPDATE
      `)
      if (!files[0]) throw new NotFoundException('file_not_found')
      const task = this.task('document.parse', { knowledgeBaseId, fileId })
      const documentId = randomUUID()
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO tasks
          (id, tenant_id, task_type, status, progress, attempt, input_json)
        VALUES
          (${task.id}, ${principal.tenantId}, ${task.type}, 'queued', 0, 0, ${JSON.stringify(task.input)})
      `)
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO task_events (task_id, sequence, event_type, data_json)
        VALUES (${task.id}, 1, 'task.queued', ${JSON.stringify({ progress: 0 })})
      `)
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO documents
          (id, tenant_id, knowledge_base_id, file_id, task_id, status)
        VALUES
          (${documentId}, ${principal.tenantId}, ${knowledgeBaseId}, ${fileId}, ${task.id}, 'queued')
      `)
      await this.enqueue(tx, principal.tenantId, 'document', documentId, 'document.parse.requested', task)
      return this.taskResponse(task)
    })
  }

  async createChatRun(principal: Principal, knowledgeBaseId: string, question: string) {
    return this.prisma.$transaction(async (tx) => {
      const knowledgeBases = await tx.$queryRaw<KnowledgeBaseRow[]>(Prisma.sql`
        SELECT id FROM knowledge_bases WHERE id = ${knowledgeBaseId} AND tenant_id = ${principal.tenantId}
        FOR UPDATE
      `)
      if (!knowledgeBases[0]) throw new NotFoundException('knowledge_base_not_found')
      const task = this.task('chat.run', { knowledgeBaseId, question: question.trim() })
      const runId = randomUUID()
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO tasks
          (id, tenant_id, task_type, status, progress, attempt, input_json)
        VALUES
          (${task.id}, ${principal.tenantId}, ${task.type}, 'queued', 0, 0, ${JSON.stringify(task.input)})
      `)
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO task_events (task_id, sequence, event_type, data_json)
        VALUES (${task.id}, 1, 'task.queued', ${JSON.stringify({ progress: 0 })})
      `)
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO chat_runs
          (id, tenant_id, knowledge_base_id, task_id, question, status)
        VALUES
          (${runId}, ${principal.tenantId}, ${knowledgeBaseId}, ${task.id}, ${question.trim()}, 'accepted')
      `)
      await this.enqueue(tx, principal.tenantId, 'chat_run', runId, 'chat.run.requested', task)
      return this.taskResponse(task)
    })
  }

  private task(type: string, input: Record<string, unknown>) {
    return { id: randomUUID(), type, input }
  }

  private taskResponse(task: { id: string; type: string }) {
    return { id: task.id, type: task.type, status: 'queued', progress: 0, attempt: 0, result: null }
  }

  private async enqueue(
    tx: Prisma.TransactionClient,
    tenantId: string,
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: unknown,
  ): Promise<void> {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO outbox_events
        (id, tenant_id, aggregate_type, aggregate_id, event_type, payload_json)
      VALUES
        (${randomUUID()}, ${tenantId}, ${aggregateType}, ${aggregateId}, ${eventType}, ${JSON.stringify(payload)})
    `)
  }
}
