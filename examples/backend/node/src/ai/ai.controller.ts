import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { CurrentPrincipal } from '../auth/current-principal'
import type { Principal } from '../auth/auth.types'
import { CreateChatRunDto, CreateDocumentDto } from './ai.dto'
import { AiService } from './ai.service'

@Controller()
@UseGuards(AccessTokenGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('knowledge-bases')
  knowledgeBases(@CurrentPrincipal() principal: Principal) { return this.ai.knowledgeBases(principal) }

  @Post('knowledge-bases/:knowledgeBaseId/documents')
  @HttpCode(202)
  document(
    @CurrentPrincipal() principal: Principal,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() input: CreateDocumentDto,
  ) { return this.ai.createDocument(principal, knowledgeBaseId, input.fileId) }

  @Post('chat-runs')
  @HttpCode(202)
  chat(@CurrentPrincipal() principal: Principal, @Body() input: CreateChatRunDto) {
    return this.ai.createChatRun(principal, input.knowledgeBaseId, input.question)
  }
}
