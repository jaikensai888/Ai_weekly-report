import { LogEntry, Summary, SummaryTemplate, User } from './types'

const API_BASE = '/api'

// ==================== 认证相关 ====================

// 获取当前用户
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`)
    if (!res.ok) return null
    const data = await res.json()
    return data.user
  } catch {
    return null
  }
}

// 登录
export async function login(username: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || '登录失败')
  }
  const data = await res.json()
  return data.user
}

// 注册
export async function register(username: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || '注册失败')
  }
  const data = await res.json()
  return data.user
}

// 退出登录
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST' })
}

// ==================== 日志相关 ====================

// 获取所有日志
export async function fetchLogs(): Promise<LogEntry[]> {
  const res = await fetch(`${API_BASE}/logs`)
  if (!res.ok) throw new Error('获取日志失败')
  return res.json()
}

// 创建日志
export async function createLog(data: Partial<LogEntry>): Promise<LogEntry> {
  const res = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('创建日志失败')
  return res.json()
}

// 更新日志
export async function updateLog(id: number, data: Partial<LogEntry>): Promise<LogEntry> {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('更新日志失败')
  return res.json()
}

// 删除日志（软删除）
export async function deleteLog(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('删除日志失败')
}

// 生成周报摘要
export async function generateSummary(logs: LogEntry[], templateId?: number): Promise<string> {
  const res = await fetch(`${API_BASE}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs, templateId })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || '生成周报失败')
  }
  const data = await res.json()
  return data.summary
}

// 生成并保存周报
export async function generateAndSaveSummary(
  logs: LogEntry[],
  title?: string,
  templateId?: number
): Promise<{ summary: string; savedSummary: any }> {
  const res = await fetch(`${API_BASE}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      logs,
      shouldSave: true,
      summaryTitle: title,
      templateId
    })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || '生成并保存周报失败')
  }
  return res.json()
}

// 获取所有周报
export async function fetchSummaries(): Promise<Summary[]> {
  const res = await fetch(`${API_BASE}/summaries`)
  if (!res.ok) throw new Error('获取周报列表失败')
  return res.json()
}

// 更新周报
export async function updateSummary(id: number, data: Partial<Summary>): Promise<Summary> {
  const res = await fetch(`${API_BASE}/summaries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('更新周报失败')
  return res.json()
}

// 删除周报（软删除）
export async function deleteSummary(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/summaries/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('删除周报失败')
}

// 获取所有周报模板
export async function fetchTemplates(): Promise<SummaryTemplate[]> {
  const res = await fetch(`${API_BASE}/templates`)
  if (!res.ok) throw new Error('获取模板列表失败')
  return res.json()
}

// 创建周报模板
export async function createTemplate(data: Partial<SummaryTemplate>): Promise<SummaryTemplate> {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('创建模板失败')
  return res.json()
}

// 更新周报模板
export async function updateTemplate(id: number, data: Partial<SummaryTemplate>): Promise<SummaryTemplate> {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('更新模板失败')
  return res.json()
}

// 删除周报模板
export async function deleteTemplate(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('删除模板失败')
}
