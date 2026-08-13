import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

type ExceptionBody = string | { code?: string; message?: string | string[]; detail?: string }

@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<Request>()
    const response = context.getResponse<Response>()
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const body = error instanceof HttpException ? error.getResponse() as ExceptionBody : 'internal_error'
    const requestId = request.header('x-request-id') || randomUUID()
    const detail = typeof body === 'string'
      ? body
      : body.detail ?? (Array.isArray(body.message) ? body.message.join('; ') : body.message) ?? 'request_failed'
    const code = typeof body === 'object' && body.code
      ? body.code
      : this.defaultCode(status, detail)

    response
      .status(status)
      .type('application/problem+json')
      .setHeader('x-request-id', requestId)
      .json({ status, code, detail, requestId })
  }

  private defaultCode(status: number, detail: string): string {
    if (/^[a-z][a-z0-9_]+$/.test(detail)) return detail
    return ({
      400: 'bad_request',
      401: 'unauthenticated',
      403: 'forbidden',
      404: 'resource_not_found',
      409: 'conflict',
      422: 'invalid_field',
      503: 'service_unavailable',
    } as Record<number, string>)[status] ?? 'internal_error'
  }
}
