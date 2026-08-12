import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { RequestWithPrincipal, Principal } from './auth.types'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>()
    const authorization = request.headers.authorization
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) throw new UnauthorizedException('access_token_missing')

    try {
      request.principal = this.jwt.verify<Principal>(token, {
        audience: 'enterprise-admin-api',
        issuer: 'fullstack-pilot-node',
      })
      return true
    } catch {
      throw new UnauthorizedException('access_token_invalid')
    }
  }
}
