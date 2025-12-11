import { Block } from './types'

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 解析Markdown为块
export const parseMarkdownToBlocks = (markdown: string): Block[] => {
  if (!markdown) return [{ id: generateId(), type: 'paragraph', content: '' }]

  return markdown.split('\n').map(line => {
    // 检查三级标题格式: "### " （需要先于二级标题检查）
    const h3Match = line.match(/^###\s+(.*)/)
    if (h3Match) {
      return {
        id: generateId(),
        type: 'h3',
        content: h3Match[1]
      }
    }

    // 检查二级标题格式: "## " （需要先于一级标题检查）
    const h2Match = line.match(/^##\s+(.*)/)
    if (h2Match) {
      return {
        id: generateId(),
        type: 'h2',
        content: h2Match[1]
      }
    }

    // 检查一级标题格式: "# "
    const h1Match = line.match(/^#\s+(.*)/)
    if (h1Match) {
      return {
        id: generateId(),
        type: 'h1',
        content: h1Match[1]
      }
    }

    // 检查任务格式: "- [x] " 或 "- [ ] "
    const taskMatch = line.match(/^(-\s|\d+\.\s|)\s*\[([xX ])\]\s+(.*)/)
    if (taskMatch) {
      return {
        id: generateId(),
        type: 'todo',
        checked: taskMatch[2].toLowerCase() === 'x',
        content: taskMatch[3]
      }
    }

    // 检查列表项格式
    const listMatch = line.match(/^(\d+\.|-|\*)\s+(.*)/)
    if (listMatch) {
      return {
        id: generateId(),
        type: 'todo',
        checked: false,
        content: listMatch[2]
      }
    }

    // 普通文本
    return {
      id: generateId(),
      type: 'paragraph',
      content: line
    }
  })
}

// 块转换为Markdown
export const blocksToMarkdown = (blocks: Block[]): string => {
  return blocks.map(block => {
    if (block.type === 'h1') {
      return `# ${block.content}`
    }
    if (block.type === 'h2') {
      return `## ${block.content}`
    }
    if (block.type === 'h3') {
      return `### ${block.content}`
    }
    if (block.type === 'todo') {
      return `- [${block.checked ? 'x' : ' '}] ${block.content}`
    }
    return block.content
  }).join('\n')
}

// 提取未完成任务（包含上级标题）
export const extractUnfinishedTasks = (content: string): Block[] => {
  const blocks = parseMarkdownToBlocks(content)
  const result: Block[] = []

  // 记录当前的标题上下文
  let currentH1: Block | null = null
  let currentH2: Block | null = null

  // 记录已添加的标题，避免重复
  let h1Added = false
  let h2Added = false

  for (const block of blocks) {
    // 更新标题上下文
    if (block.type === 'h1') {
      currentH1 = block
      currentH2 = null  // 遇到新的 h1，重置 h2
      h1Added = false
      h2Added = false
    } else if (block.type === 'h2') {
      currentH2 = block
      h2Added = false
    } else if (block.type === 'todo' && !block.checked && block.content.trim().length > 0) {
      // 发现未完成的待办事项，先添加其上级标题

      // 添加 h1 标题（如果有且未添加过）
      if (currentH1 && !h1Added) {
        result.push({
          ...currentH1,
          id: generateId()
        })
        h1Added = true
      }

      // 添加 h2 标题（如果有且未添加过）
      if (currentH2 && !h2Added) {
        result.push({
          ...currentH2,
          id: generateId()
        })
        h2Added = true
      }

      // 添加待办事项
      result.push({
        ...block,
        id: generateId()
      })
    }
  }

  return result
}

// 格式化日期（中文格式）
export const formatDate = (timestamp: Date | string | number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化简短日期
export const formatShortDate = (timestamp: Date | string | number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

// 获取周标识 (用于分组)
export const getWeekKey = (date: Date | string | number): string => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  // 获取当月的第一天
  const firstDayOfMonth = new Date(year, d.getMonth(), 1)
  const firstDayWeekday = firstDayOfMonth.getDay() || 7 // 周日为7

  // 计算当前是当月的第几周
  const currentDay = d.getDate()
  const weekNumber = Math.ceil((currentDay + firstDayWeekday - 1) / 7)

  return `${year}-${month}-W${weekNumber}`
}

// 获取周标签 (用于显示)
export const getWeekLabel = (date: Date | string | number, isCurrentWeek: boolean = false): string => {
  if (isCurrentWeek) {
    return '本周'
  }

  const d = new Date(date)
  const now = new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  // 获取当月的第一天
  const firstDayOfMonth = new Date(year, d.getMonth(), 1)
  const firstDayWeekday = firstDayOfMonth.getDay() || 7

  // 计算当前是当月的第几周
  const currentDay = d.getDate()
  const weekNumber = Math.ceil((currentDay + firstDayWeekday - 1) / 7)

  // 判断是否为上周
  const lastWeekStart = new Date(now)
  lastWeekStart.setDate(now.getDate() - 7)
  const lastWeekEnd = new Date(now)
  lastWeekEnd.setDate(now.getDate() - 1)

  if (d >= lastWeekStart && d <= lastWeekEnd) {
    return '上周'
  }

  // 其他情况显示：月份 + 周数
  return `${month}月第${weekNumber}周`
}

// 判断是否为本周
export const isThisWeek = (date: Date | string | number): boolean => {
  const d = new Date(date)
  const now = new Date()

  // 获取本周一的日期
  const today = now.getDay() || 7 // 周日为7
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - today + 1)
  thisMonday.setHours(0, 0, 0, 0)

  // 获取下周一的日期
  const nextMonday = new Date(thisMonday)
  nextMonday.setDate(thisMonday.getDate() + 7)

  return d >= thisMonday && d < nextMonday
}

// 格式化日期为 yyyyMMdd 格式
export const formatDateToYYYYMMDD = (date: Date | string | number): string => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// 生成周报标题：根据日志列表生成日期范围标题
export const generateWeeklySummaryTitle = (logs: { createTime: Date | string | number }[]): string => {
  if (logs.length === 0) {
    return `${formatDateToYYYYMMDD(new Date())}周报`
  }

  // 获取所有日志的日期
  const dates = logs.map(log => new Date(log.createTime))

  // 找到最早和最晚的日期
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

  const startStr = formatDateToYYYYMMDD(minDate)
  const endStr = formatDateToYYYYMMDD(maxDate)

  // 如果是同一天，只显示一个日期
  if (startStr === endStr) {
    return `${startStr}周报`
  }

  return `${startStr}-${endStr}周报`
}
