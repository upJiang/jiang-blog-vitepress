import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { MeController } from './auth/me.controller'
import { AccessTokenGuard } from './auth/access-token.guard'
import { HealthController } from './health.controller'
import { FilesController } from './files/files.controller'
import { FilesService } from './files/files.service'
import { ProjectsController } from './projects/projects.controller'
import { ProjectsService } from './projects/projects.service'
import { PrismaService } from './prisma.service'
import { TasksController } from './tasks/tasks.controller'
import { TasksService } from './tasks/tasks.service'
import { AdminController } from './admin/admin.controller'
import { AdminService } from './admin/admin.service'
import { AiController } from './ai/ai.controller'
import { AiService } from './ai/ai.service'
import { CommerceController } from './commerce/commerce.controller'
import { CommerceService } from './commerce/commerce.service'

@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET ?? 'local-development-secret-at-least-32-chars',
    signOptions: {
      audience: 'enterprise-admin-api',
      issuer: 'fullstack-pilot-node',
      expiresIn: '15m',
    },
  })],
  controllers: [
    AuthController,
    MeController,
    HealthController,
    ProjectsController,
    FilesController,
    TasksController,
    AdminController,
    CommerceController,
    AiController,
  ],
  providers: [
    PrismaService,
    AuthService,
    AccessTokenGuard,
    ProjectsService,
    FilesService,
    TasksService,
    AdminService,
    CommerceService,
    AiService,
  ],
})
export class AppModule {}
