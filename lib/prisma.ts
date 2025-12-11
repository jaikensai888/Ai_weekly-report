import { PrismaClient } from '@prisma/client'
import path from 'path'

// 动态计算数据库绝对路径
const getDatabaseUrl = () => {
  // 数据库固定在 prisma/dev.db（相对于项目根目录）
  const absolutePath = path.resolve(process.cwd(), 'prisma', 'dev.db')
  return `file:${absolutePath}`
}

// 防止开发模式下创建多个 Prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

