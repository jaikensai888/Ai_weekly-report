import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

// 获取当前用户的周报模板
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const templates = await prisma.summaryTemplate.findMany({
            where: { 
                status: 1,
                creatorId: user.userId
            },
            orderBy: [
                { isDefault: 'desc' },
                { createTime: 'desc' }
            ]
        })
        return NextResponse.json(templates)
    } catch (error) {
        console.error('获取周报模板列表失败:', error)
        return NextResponse.json(
            { error: '获取周报模板列表失败' },
            { status: 500 }
        )
    }
}

// 创建新周报模板
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const body = await request.json()
        const { name, content, isDefault } = body

        // 如果设置为默认模板,需要先将其他模板的默认状态取消
        if (isDefault === 1) {
            await prisma.summaryTemplate.updateMany({
                where: { isDefault: 1, creatorId: user.userId },
                data: { isDefault: 0 }
            })
        }

        const template = await prisma.summaryTemplate.create({
            data: {
                name,
                content,
                isDefault: isDefault || 0,
                creatorId: user.userId
            }
        })

        return NextResponse.json(template)
    } catch (error) {
        console.error('创建周报模板失败:', error)
        return NextResponse.json(
            { error: '创建周报模板失败' },
            { status: 500 }
        )
    }
}
