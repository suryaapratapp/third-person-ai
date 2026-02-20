import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

async function main() {
  const prisma = new PrismaClient()

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('Database connection: OK')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Database connection failed')
  console.error(error)
  process.exit(1)
})
