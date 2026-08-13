import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok' }
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ok' }
    } catch {
      throw new HttpException('database_unavailable', HttpStatus.SERVICE_UNAVAILABLE)
    }
  }
}
