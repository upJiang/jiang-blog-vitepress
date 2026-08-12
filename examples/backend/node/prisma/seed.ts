import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { email: 'demo@example.test' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'demo@example.test',
      passwordHash: await argon2.hash('local-password', { type: argon2.argon2id }),
    },
  })
}

void main().finally(() => prisma.$disconnect())
