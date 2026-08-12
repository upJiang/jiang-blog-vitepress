import 'reflect-metadata'
import cookieParser from 'cookie-parser'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
  app.setGlobalPrefix('api')
  app.enableShutdownHooks()
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0')
}

void bootstrap()
