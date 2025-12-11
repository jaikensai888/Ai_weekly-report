import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

// 更新周报模板
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
        
        // 验证模板属于当前用户
        const existingTemplate = await prisma.summaryTemplate.findFirst({
            where: { id, creatorId: user.userId }
        })
        if (!existingTemplate) {
            return NextResponse.json({ error: '模板不存在' }, { status: 404 })
        }

        const body = await request.json()
        const { name, content, isDefault } = body

        // 如果设置为默认模板,需要先将其他模板的默认状态取消
        if (isDefault === 1) {
            await prisma.summaryTemplate.updateMany({
                where: {
                    isDefault: 1,
                    id: { not: id },
                    creatorId: user.userId
                },
                data: { isDefault: 0 }
            })
        }

        const template = await prisma.summaryTemplate.update({
            where: { id },
            data: {
                name,
                content,
                isDefault: isDefault || 0,
                updateTime: new Date()
            }
        })

        return NextResponse.json(template)
    } catch (error) {
        console.error('更新周报模板失败:', error)
        return NextResponse.json(
            { error: '更新周报模板失败' },
            { status: 500 }
        )
    }
}

// 删除周报模板
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
        
        // 验证模板属于当前用户
        const existingTemplate = await prisma.summaryTemplate.findFirst({
            where: { id, creatorId: user.userId }
        })
        if (!existingTemplate) {
            return NextResponse.json({ error: '模板不存在' }, { status: 404 })
        }

        await prisma.summaryTemplate.update({
            where: { id },
            data: { status: 0 }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('删除周报模板失败:', error)
        return NextResponse.json(
            { error: '删除周报模板失败' },
            { status: 500 }
        )
    }
}
