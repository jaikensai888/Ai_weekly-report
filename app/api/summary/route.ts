import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// 强制动态渲染，防止构建时查询数据库
export const dynamic = 'force-dynamic'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: 'DeepSeek API 密钥未配置，请在环境变量中设置 DEEPSEEK_API_KEY' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { logs, shouldSave, summaryTitle, templateId } = body

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: '请选择要汇总的日志' }, { status: 400 })
    }

    // 按日期排序日志
    const sortedLogs = [...logs].sort(
      (a: any, b: any) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
    )

    let promptContext = '以下是这段时间的工作日志：\n\n'

    sortedLogs.forEach((log: any) => {
      const dateStr = new Date(log.createTime).toLocaleDateString('zh-CN')
      promptContext += `--- 日期: ${dateStr}，标题: ${log.title} ---\n`
      promptContext += `${log.content}\n\n`
    })

    // 如果指定了模板，使用模板内容作为系统提示词
    let systemPrompt = `你是一个专业的工作周报助手。请根据用户提供的工作日志，生成一份专业的工作周报。
请使用以下结构：
1. **本周概述**：简要总结主要工作内容
2. **完成事项**：已完成的任务（以要点形式列出）
3. **进行中**：正在进行或未完成的任务
4. **下周计划**：根据日志内容建议的后续工作

请用中文输出，格式使用 Markdown。`

    if (templateId) {
      try {
        const template = await prisma.summaryTemplate.findUnique({
          where: { id: templateId }
        })
        if (template && template.content) {
          systemPrompt = `你是一个专业的工作周报助手。请根据用户提供的工作日志，按照以下模板结构生成工作周报：

${template.content}

请保持模板的结构和格式，用中文输出，格式使用 Markdown。`
        }
      } catch (e) {
        console.error('获取模板失败:', e)
      }
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptContext }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content || '生成摘要失败'

    // 如果需要保存周报到数据库
    if (shouldSave) {
      const logIds = sortedLogs.map((log: any) => log.id).join(',')
      const title = summaryTitle || `工作周报 - ${new Date().toLocaleDateString('zh-CN')}`

      const savedSummary = await prisma.summary.create({
        data: {
          title,
          content: summary,
          logIds,
          creatorId: user.userId
        }
      })

      return NextResponse.json({ summary, savedSummary })
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('生成周报失败:', error)
    return NextResponse.json(
      { error: `生成周报失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}
