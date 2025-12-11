// 用户类型
export interface User {
  id: number
  username: string
}

// 日志条目类型
export interface LogEntry {
  id: number
  createTime: Date | string
  updateTime: Date | string
  status: number
  creatorId: number
  title: string
  content: string
}

// 周报类型
export interface Summary {
  id: number
  createTime: Date | string
  updateTime: Date | string
  status: number
  creatorId: number
  title: string
  content: string
  logIds: string
}

// 周报模板类型
export interface SummaryTemplate {
  id: number
  createTime: Date | string
  updateTime: Date | string
  status: number
  creatorId: number
  name: string
  content: string
  isDefault: number
}

// 视图模式
export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SUMMARY = 'SUMMARY'
}

// 编辑器块类型
export type BlockType = 'paragraph' | 'todo' | 'h1' | 'h2' | 'h3'

export interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean
}

// 状态枚举
export enum Status {
  DELETED = 0,
  ACTIVE = 1
}
