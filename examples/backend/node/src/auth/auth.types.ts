import type { Request } from 'express'

export type Principal = {
  sub: string
  tenantId: string
  sessionId: string
  permissions: string[]
}

export type RequestWithPrincipal = Request & { principal: Principal }
