import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

// 获取单个周报
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const id = parseInt(params.id)
        const summary = await prisma.summary.findFirst({
            where: { id, creatorId: user.userId }
        })

        if (!summary) {
            return NextResponse.json({ error: '周报不存在' }, { status: 404 })
        }

        return NextResponse.json(summary)
    } catch (error) {
        console.error('获取周报失败:', error)
        return NextResponse.json(
            { error: '获取周报失败' },
            { status: 500 }
        )
    }
}

// 更新周报
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const id = parseInt(params.id)
        
        // 验证周报属于当前用户
        const existingSummary = await prisma.summary.findFirst({
            where: { id, creatorId: user.userId }
        })
        if (!existingSummary) {
            return NextResponse.json({ error: '周报不存在' }, { status: 404 })
        }

        const body = await request.json()
        const { title, content } = body

        const updatedSummary = await prisma.summary.update({
            where: { id },
            data: { title, content, updateTime: new Date() }
        })

        return NextResponse.json(updatedSummary)
    } catch (error) {
        console.error('更新周报失败:', error)
        return NextResponse.json(
            { error: '更新周报失败' },
            { status: 500 }
        )
    }
}

// 删除周报（软删除）
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const id = parseInt(params.id)
        
        // 验证周报属于当前用户
        const existingSummary = await prisma.summary.findFirst({
            where: { id, creatorId: user.userId }
        })
        if (!existingSummary) {
            return NextResponse.json({ error: '周报不存在' }, { status: 404 })
        }

        await prisma.summary.update({
            where: { id },
            data: { status: 0 }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('删除周报失败:', error)
        return NextResponse.json(
            { error: '删除周报失败' },
            { status: 500 }
        )
    }
}
