import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { AccessTokenGuard } from './auth/access-token.guard'
import { ProjectsController } from './projects/projects.controller'
import { ProjectsService } from './projects/projects.service'
import { PrismaService } from './prisma.service'

@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET ?? 'local-development-secret-at-least-32-chars',
    signOptions: {
      audience: 'enterprise-admin-api',
      issuer: 'fullstack-pilot-node',
      expiresIn: '15m',
    },
  })],
  controllers: [AuthController, ProjectsController],
  providers: [PrismaService, AuthService, AccessTokenGuard, ProjectsService],
})
export class AppModule {}
