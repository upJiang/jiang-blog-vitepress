import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { CurrentPrincipal } from '../auth/current-principal'
import type { Principal } from '../auth/auth.types'
import { CreateProjectDto, UpdateProjectDto } from './projects.dto'
import { ProjectsService } from './projects.service'

@Controller('projects')
@UseGuards(AccessTokenGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentPrincipal() principal: Principal) {
    return this.projects.list(principal)
  }

  @Post()
  create(@CurrentPrincipal() principal: Principal, @Body() input: CreateProjectDto) {
    return this.projects.create(principal, input)
  }

  @Patch(':projectId')
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('projectId') projectId: string,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projects.update(principal, projectId, input)
  }
}
