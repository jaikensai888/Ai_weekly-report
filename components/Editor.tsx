'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LogEntry, Block } from '@/lib/types'
import {
  parseMarkdownToBlocks,
  blocksToMarkdown,
  generateId,
  extractUnfinishedTasks,
  formatDate
} from '@/lib/utils'
import { CornerDownRight, Save, GripVertical, CheckSquare, Square, Trash2, Heading1, Heading2, Heading3, ChevronDown } from 'lucide-react'

interface EditorProps {
  log: LogEntry
  previousLog?: LogEntry
  onUpdate: (updatedLog: LogEntry) => void
  onDelete: (id: number) => void
}

const Editor: React.FC<EditorProps> = ({ log, previousLog, onUpdate, onDelete }) => {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [title, setTitle] = useState(log.title)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [headingMenuOpen, setHeadingMenuOpen] = useState<string | null>(null) // 存储打开菜单的 block id
  const itemRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({})
  const isLocalChange = useRef(false)
  const lastLogId = useRef<number | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // 只在切换日志时初始化
  useEffect(() => {
    if (log.id !== lastLogId.current) {
      lastLogId.current = log.id
      setBlocks(parseMarkdownToBlocks(log.content))
      setTitle(log.title)
      isLocalChange.current = false
    }
  }, [log.id, log.content, log.title])

  // 保存更改 - 使用 useCallback 稳定引用
  const saveChanges = useCallback(async () => {
    if (!isLocalChange.current) return

    const content = blocksToMarkdown(blocks)
    if (content !== log.content || title !== log.title) {
      setIsSaving(true)
      try {
        await onUpdate({ ...log, content, title })
      } finally {
        setIsSaving(false)
      }
    }
    isLocalChange.current = false
  }, [blocks, title, log, onUpdate])

  // 防抖保存
  useEffect(() => {
    if (!isLocalChange.current) return

    const timer = setTimeout(saveChanges, 800)
    return () => clearTimeout(timer)
  }, [blocks, title, saveChanges])

  // 处理自动聚焦
  useEffect(() => {
    if (focusId && itemRefs.current[focusId]) {
      const el = itemRefs.current[focusId]
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
      setFocusId(null)
    }
  }, [focusId, blocks])

  // 点击外部关闭标题选择菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headingMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setHeadingMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [headingMenuOpen])

  const handleImportTasks = () => {
    if (!previousLog) return
    const unfinishedBlocks = extractUnfinishedTasks(previousLog.content)

    // 只统计待办事项数量（不含标题）
    const todoCount = unfinishedBlocks.filter(b => b.type === 'todo').length
    if (todoCount === 0) {
      alert('上一篇日志中没有未完成的任务')
      return
    }

    isLocalChange.current = true
    setBlocks(prev => {
      const newBlocks = [...prev]
      // 移除末尾的空段落
      if (newBlocks.length > 0 && newBlocks[newBlocks.length - 1].content === '' && newBlocks[newBlocks.length - 1].type === 'paragraph') {
        newBlocks.pop()
      }

      // 添加分隔说明
      newBlocks.push({
        id: generateId(),
        type: 'h2',
        content: `待办事项 (来自 ${formatDate(previousLog.createTime)})`
      })

      return [...newBlocks, ...unfinishedBlocks]
    })
  }

  const updateBlock = (index: number, updates: Partial<Block>) => {
    isLocalChange.current = true
    setBlocks(prev => {
      const newBlocks = [...prev]
      newBlocks[index] = { ...newBlocks[index], ...updates }
      return newBlocks
    })
  }

  const addBlock = (index: number, type: 'paragraph' | 'todo' = 'paragraph') => {
    isLocalChange.current = true
    const newBlock: Block = { id: generateId(), type, content: '', checked: false }
    setBlocks(prev => {
      const newBlocks = [...prev]
      newBlocks.splice(index + 1, 0, newBlock)
      return newBlocks
    })
    setFocusId(newBlock.id)
  }

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return
    isLocalChange.current = true
    setBlocks(prev => prev.filter((_, i) => i !== index))
    if (index > 0) {
      setFocusId(blocks[index - 1].id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const block = blocks[index]

    if (e.key === 'Enter') {
      e.preventDefault()
      if (block.type === 'todo' && block.content === '') {
        updateBlock(index, { type: 'paragraph' })
      } else if ((block.type === 'h1' || block.type === 'h2' || block.type === 'h3') && block.content === '') {
        // 空标题转为普通段落
        updateBlock(index, { type: 'paragraph' })
      } else {
        // 标题后面创建普通段落，todo 后面继续 todo
        const nextType = block.type === 'todo' ? 'todo' : 'paragraph'
        addBlock(index, nextType)
      }
    } else if (e.key === 'Backspace') {
      const target = e.target as HTMLTextAreaElement
      const cursorPosition = target.selectionStart

      // 只有在光标在最前面且内容为空时才降级或删除
      if (block.content === '' && cursorPosition === 0) {
        e.preventDefault()
        if (block.type === 'todo') {
          updateBlock(index, { type: 'paragraph' })
        } else if (block.type === 'h1') {
          // 一级标题降级为二级标题
          updateBlock(index, { type: 'h2' })
        } else if (block.type === 'h2') {
          // 二级标题降级为三级标题
          updateBlock(index, { type: 'h3' })
        } else if (block.type === 'h3') {
          // 三级标题降级为普通段落
          updateBlock(index, { type: 'paragraph' })
        } else {
          removeBlock(index)
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault()
        itemRefs.current[blocks[index - 1].id]?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      if (index < blocks.length - 1) {
        e.preventDefault()
        itemRefs.current[blocks[index + 1].id]?.focus()
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    const val = e.target.value

    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'

    if (blocks[index].type === 'paragraph') {
      // 输入 "# " 转为一级标题
      if (val === '# ') {
        updateBlock(index, { type: 'h1', content: '' })
        return
      }
      // 输入 "## " 转为二级标题
      if (val === '## ') {
        updateBlock(index, { type: 'h2', content: '' })
        return
      }
      // 输入 "### " 转为三级标题
      if (val === '### ') {
        updateBlock(index, { type: 'h3', content: '' })
        return
      }
      // 输入列表标记转为待办
      if (val === '1. ' || val === '- ' || val === '* ') {
        updateBlock(index, { type: 'todo', content: '' })
        return
      }
    }

    updateBlock(index, { content: val })
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isLocalChange.current = true
    setTitle(e.target.value)
  }

  useEffect(() => {
    blocks.forEach(block => {
      const el = itemRefs.current[block.id]
      if (el) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
    })
  }, [blocks])

  const isEmpty = blocks.length === 0 || (blocks.length === 1 && blocks[0].content === '')
  const hasUnfinishedPrevious = previousLog && extractUnfinishedTasks(previousLog.content).length > 0

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 gap-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="日志标题"
          className="bg-transparent text-xl font-bold text-slate-800 placeholder-gray-400 focus:outline-none flex-1 min-w-0"
        />

        <div className="flex items-center gap-2 flex-shrink-0">
          {previousLog && (
            <button
              onClick={handleImportTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors whitespace-nowrap"
              title="导入上一篇日志的未完成任务"
            >
              <CornerDownRight size={16} />
              <span className="hidden sm:inline">导入待办</span>
            </button>
          )}
          <button
            onClick={() => onDelete(log.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors whitespace-nowrap"
            title="删除此日志"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">删除</span>
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-2">

          {/* 空状态提示 */}
          {isEmpty && hasUnfinishedPrevious && (
            <div className="mb-8 p-4 bg-primary-50/50 border border-primary-100 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-primary-900 text-sm">继续上次的工作？</h4>
                <p className="text-xs text-primary-600 mt-0.5">
                  您在 {formatDate(previousLog!.createTime)} 有未完成的任务
                </p>
              </div>
              <button
                onClick={handleImportTasks}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-primary-200 shadow-sm rounded-lg text-primary-700 text-sm font-medium hover:bg-primary-50 hover:border-primary-300 transition-all"
              >
                <CornerDownRight size={14} />
                导入未完成任务
              </button>
            </div>
          )}

          {blocks.map((block, index) => (
            <div key={block.id} className="group flex items-start -ml-8 pl-8 relative">
              {/* 拖拽手柄 */}
              <div className={`absolute left-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-300 ${block.type === 'h1' ? 'top-2.5' : block.type === 'h2' ? 'top-2' : block.type === 'h3' ? 'top-1.5' : 'top-1.5'
                }`}>
                <GripVertical size={16} />
              </div>

              {/* 标题图标 - 可点击切换 */}
              {(block.type === 'h1' || block.type === 'h2' || block.type === 'h3') && (
                <div className="relative" ref={headingMenuOpen === block.id ? menuRef : null}>
                  <button
                    onClick={() => setHeadingMenuOpen(headingMenuOpen === block.id ? null : block.id)}
                    className={`flex items-center gap-0.5 mr-2 flex-shrink-0 rounded px-1 py-0.5 transition-all hover:bg-gray-100 ${block.type === 'h1' ? 'mt-1.5 text-primary-500' :
                      block.type === 'h2' ? 'mt-1 text-primary-400' :
                        'mt-0.5 text-primary-300'
                      }`}
                    title="点击切换标题级别"
                  >
                    {block.type === 'h1' && <Heading1 size={22} />}
                    {block.type === 'h2' && <Heading2 size={20} />}
                    {block.type === 'h3' && <Heading3 size={18} />}
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>

                  {/* 标题级别选择菜单 */}
                  {headingMenuOpen === block.id && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => {
                          updateBlock(index, { type: 'h1' })
                          setHeadingMenuOpen(null)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${block.type === 'h1' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                          }`}
                      >
                        <Heading1 size={18} />
                        <span className="text-sm">一级标题</span>
                      </button>
                      <button
                        onClick={() => {
                          updateBlock(index, { type: 'h2' })
                          setHeadingMenuOpen(null)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${block.type === 'h2' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                          }`}
                      >
                        <Heading2 size={18} />
                        <span className="text-sm">二级标题</span>
                      </button>
                      <button
                        onClick={() => {
                          updateBlock(index, { type: 'h3' })
                          setHeadingMenuOpen(null)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${block.type === 'h3' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                          }`}
                      >
                        <Heading3 size={18} />
                        <span className="text-sm">三级标题</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => {
                          updateBlock(index, { type: 'paragraph' })
                          setHeadingMenuOpen(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-[18px] text-center text-xs">T</span>
                        <span className="text-sm">正文</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 待办复选框 */}
              {block.type === 'todo' && (
                <button
                  onClick={() => updateBlock(index, { checked: !block.checked })}
                  className={`mt-1.5 mr-3 flex-shrink-0 transition-all ${block.checked ? 'text-primary-500' : 'text-gray-300 hover:text-primary-400'
                    }`}
                >
                  {block.checked ? (
                    <CheckSquare size={20} className="drop-shadow-sm" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
              )}

              {/* 文本输入 */}
              <textarea
                ref={el => { itemRefs.current[block.id] = el }}
                value={block.content}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={
                  block.type === 'h1' ? "一级标题..." :
                    block.type === 'h2' ? "二级标题..." :
                      block.type === 'h3' ? "三级标题..." :
                        block.type === 'todo' ? "待办事项" :
                          "输入 '# ' 一级标题，'## ' 二级标题，'### ' 三级标题，'1. ' 待办..."
                }
                rows={1}
                className={`w-full bg-transparent resize-none focus:outline-none transition-colors leading-relaxed py-1
                  ${block.type === 'h1' ? 'text-2xl font-bold text-slate-800' : ''}
                  ${block.type === 'h2' ? 'text-xl font-semibold text-slate-700' : ''}
                  ${block.type === 'h3' ? 'text-lg font-semibold text-slate-600' : ''}
                  ${block.type === 'todo' && block.checked ? 'line-through text-gray-400 decoration-gray-300' : ''}
                  ${block.type === 'todo' && !block.checked ? 'text-slate-700' : ''}
                  ${block.type === 'paragraph' ? 'text-slate-700' : ''}
                `}
                style={{ minHeight: block.type === 'h1' ? '40px' : block.type === 'h2' ? '36px' : block.type === 'h3' ? '32px' : '28px' }}
              />
            </div>
          ))}

          {blocks.length === 0 && (
            <div className="text-gray-300 italic">点击这里开始输入...</div>
          )}

          {/* 底部点击区域 */}
          <div
            className="h-20 cursor-text"
            onClick={() => {
              if (blocks.length === 0) addBlock(-1)
              else {
                const lastId = blocks[blocks.length - 1].id
                itemRefs.current[lastId]?.focus()
              }
            }}
          />
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
        <span>{blocks.filter(b => b.type === 'todo').length} 个任务（已完成 {blocks.filter(b => b.checked).length} 个）</span>
        <span className="flex items-center gap-1">
          <Save size={10} />
          {isSaving ? '保存中...' : '已保存'}
        </span>
      </div>
    </div>
  )
}

export default Editor
