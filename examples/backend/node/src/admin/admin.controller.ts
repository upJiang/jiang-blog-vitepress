import { Controller, Get, UseGuards } from '@nestjs/common'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { CurrentPrincipal } from '../auth/current-principal'
import type { Principal } from '../auth/auth.types'
import { AdminService } from './admin.service'

@Controller()
@UseGuards(AccessTokenGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('tenants') tenants(@CurrentPrincipal() principal: Principal) { return this.admin.list(principal, 'tenants') }
  @Get('departments') departments(@CurrentPrincipal() principal: Principal) { return this.admin.list(principal, 'departments') }
  @Get('users') users(@CurrentPrincipal() principal: Principal) { return this.admin.list(principal, 'users') }
  @Get('roles') roles(@CurrentPrincipal() principal: Principal) { return this.admin.list(principal, 'roles') }
  @Get('permissions') permissions(@CurrentPrincipal() principal: Principal) { return this.admin.list(principal, 'permissions') }
  @Get('audit-logs') auditLogs(@CurrentPrincipal() principal: Principal) { return this.admin.list(principal, 'audit-logs') }
}
