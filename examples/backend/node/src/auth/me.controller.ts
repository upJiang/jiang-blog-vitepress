import { Controller, Get, UseGuards } from '@nestjs/common'
import { AccessTokenGuard } from './access-token.guard'
import { CurrentPrincipal } from './current-principal'
import type { Principal } from './auth.types'

@Controller()
@UseGuards(AccessTokenGuard)
export class MeController {
  @Get('me')
  current(@CurrentPrincipal() principal: Principal) {
    return {
      userId: principal.sub,
      tenantId: principal.tenantId,
      permissions: principal.permissions,
    }
  }
}
