import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './auth.dto'

const COOKIE_NAME = 'refresh_session'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.login(input.email, input.password)
    this.setRefreshCookie(response, tokens.refreshToken)
    return { accessToken: tokens.accessToken, expiresIn: 900 }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.refresh(request.cookies?.[COOKIE_NAME])
    this.setRefreshCookie(response, tokens.refreshToken)
    return { accessToken: tokens.accessToken, expiresIn: 900 }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[COOKIE_NAME])
    response.clearCookie(COOKIE_NAME, { path: '/api/auth' })
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: THIRTY_DAYS_MS,
    })
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
