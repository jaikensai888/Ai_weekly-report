import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

// 获取当前用户的周报
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const summaries = await prisma.summary.findMany({
            where: { 
                status: 1,
                creatorId: user.userId
            },
            orderBy: { createTime: 'desc' }
        })
        return NextResponse.json(summaries)
    } catch (error) {
        console.error('获取周报列表失败:', error)
        return NextResponse.json(
            { error: '获取周报列表失败' },
            { status: 500 }
        )
    }
}
