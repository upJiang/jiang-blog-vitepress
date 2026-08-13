import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { CurrentPrincipal } from '../auth/current-principal'
import type { Principal } from '../auth/auth.types'
import { FileIntentDto } from './files.dto'
import { FilesService } from './files.service'

@Controller('files')
@UseGuards(AccessTokenGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('presign')
  presign(@CurrentPrincipal() principal: Principal, @Body() input: FileIntentDto) {
    return this.files.presign(principal, input)
  }

  @Get(':fileId/download')
  async download(
    @CurrentPrincipal() principal: Principal,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(302, await this.files.download(principal, fileId))
  }
}
