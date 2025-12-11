import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

// 获取单个日志
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const log = await prisma.logEntry.findFirst({
      where: { 
        id: parseInt(params.id),
        status: 1,
        creatorId: user.userId
      }
    })

    if (!log) {
      return NextResponse.json({ error: '日志不存在' }, { status: 404 })
    }

    return NextResponse.json(log)
  } catch (error) {
    console.error('获取日志失败:', error)
    return NextResponse.json({ error: '获取日志失败' }, { status: 500 })
  }
}

// 更新日志
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 验证日志属于当前用户
    const existingLog = await prisma.logEntry.findFirst({
      where: { id: parseInt(params.id), creatorId: user.userId }
    })
    if (!existingLog) {
      return NextResponse.json({ error: '日志不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content } = body

    const log = await prisma.logEntry.update({
      where: { id: parseInt(params.id) },
      data: { title, content }
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('更新日志失败:', error)
    return NextResponse.json({ error: '更新日志失败' }, { status: 500 })
  }
}

// 删除日志（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 验证日志属于当前用户
    const existingLog = await prisma.logEntry.findFirst({
      where: { id: parseInt(params.id), creatorId: user.userId }
    })
    if (!existingLog) {
      return NextResponse.json({ error: '日志不存在' }, { status: 404 })
    }

    await prisma.logEntry.update({
      where: { id: parseInt(params.id) },
      data: { status: 0 }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除日志失败:', error)
    return NextResponse.json({ error: '删除日志失败' }, { status: 500 })
  }
}
