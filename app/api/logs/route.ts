import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

// 获取当前用户的日志
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const logs = await prisma.logEntry.findMany({
      where: { 
        status: 1,
        creatorId: user.userId
      },
      orderBy: { createTime: 'desc' }
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error('获取日志失败:', error)
    return NextResponse.json({ error: '获取日志失败' }, { status: 500 })
  }
}

// 创建新日志
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content } = body

    const log = await prisma.logEntry.create({
      data: {
        title: title || '新日志',
        content: content || '',
        creatorId: user.userId
      }
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('创建日志失败:', error)
    return NextResponse.json({ error: '创建日志失败' }, { status: 500 })
  }
}
