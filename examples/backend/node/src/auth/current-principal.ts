import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { RequestWithPrincipal } from './auth.types'

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestWithPrincipal>().principal,
)
