import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 数据迁移：创建 tao 用户并将现有数据关联到该用户
export async function POST() {
  try {
    // 检查 tao 用户是否已存在
    let taoUser = await prisma.user.findUnique({
      where: { username: 'tao' }
    })

    if (!taoUser) {
      // 创建 tao 用户，密码是 123456
      taoUser = await prisma.user.create({
        data: {
          username: 'tao',
          password: hashPassword('123456')
        }
      })
      console.log('创建 tao 用户成功，ID:', taoUser.id)
    } else {
      console.log('tao 用户已存在，ID:', taoUser.id)
    }

    // 将所有 creatorId 为 0 的数据关联到 tao 用户
    const [logsUpdated, summariesUpdated, templatesUpdated] = await Promise.all([
      prisma.logEntry.updateMany({
        where: { creatorId: 0 },
        data: { creatorId: taoUser.id }
      }),
      prisma.summary.updateMany({
        where: { creatorId: 0 },
        data: { creatorId: taoUser.id }
      }),
      prisma.summaryTemplate.updateMany({
        where: { creatorId: 0 },
        data: { creatorId: taoUser.id }
      })
    ])

    return NextResponse.json({
      success: true,
      message: '数据迁移完成',
      userId: taoUser.id,
      updated: {
        logs: logsUpdated.count,
        summaries: summariesUpdated.count,
        templates: templatesUpdated.count
      }
    })
  } catch (error) {
    console.error('数据迁移失败:', error)
    return NextResponse.json(
      { error: '数据迁移失败' },
      { status: 500 }
    )
  }
}

