'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { LogEntry, Block } from '@/lib/types'
import {
  parseMarkdownToBlocks,
  blocksToMarkdown,
  generateId,
  extractUnfinishedTasks,
  formatDate
} from '@/lib/utils'
import { CornerDownRight, Save, GripVertical, CheckSquare, Square, Trash2, Heading1, Heading2, Heading3, ChevronDown, ChevronRight, Copy, Check, Eye, EyeOff } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface EditorProps {
  log: LogEntry
  previousLog?: LogEntry
  onUpdate: (updatedLog: LogEntry) => void
  onDelete: (id: number) => void
}

// BlockItem 组件的 Props
interface BlockItemProps {
  block: Block
  index: number
  updateBlock: (index: number, updates: Partial<Block>) => void
  toggleCollapse: (index: number) => void
  togglePrivate: (index: number) => void
  headingMenuOpen: string | null
  setHeadingMenuOpen: (id: string | null) => void
  menuRef: React.RefObject<HTMLDivElement | null>
  itemRefs: React.MutableRefObject<{ [key: string]: HTMLTextAreaElement | null }>
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => void
  handleKeyDown: (e: React.KeyboardEvent, index: number) => void
  dragListeners?: any
}

// Block 渲染组件
const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  updateBlock,
  toggleCollapse,
  togglePrivate,
  headingMenuOpen,
  setHeadingMenuOpen,
  menuRef,
  itemRefs,
  handleChange,
  handleKeyDown,
  dragListeners,
}) => {
  return (
    <div className="group flex items-start -ml-8 pl-8 relative">
      {/* 拖拽手柄 */}
      <div
        {...dragListeners}
        className={`absolute left-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-300 ${
          block.type === 'h1' ? 'top-2.5' : block.type === 'h2' ? 'top-2' : block.type === 'h3' ? 'top-1.5' : 'top-1.5'
        }`}
      >
        <GripVertical size={16} />
      </div>

      {/* 标题隐私按钮 - 在拖拽手柄旁边 */}
      {(block.type === 'h1' || block.type === 'h2' || block.type === 'h3') && (
        <button
          onClick={() => togglePrivate(index)}
          className={`absolute left-4 rounded p-0.5 transition-all opacity-0 group-hover:opacity-100 ${
            block.isPrivate
              ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 opacity-100'
              : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
          } ${block.type === 'h1' ? 'top-2.5' : block.type === 'h2' ? 'top-2' : 'top-1.5'}`}
          title={block.isPrivate ? "取消隐私标记" : "标记为隐私"}
        >
          {block.isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}

      {/* 标题折叠按钮 */}
      {(block.type === 'h1' || block.type === 'h2' || block.type === 'h3') && (
        <button
          onClick={() => toggleCollapse(index)}
          className={`absolute -left-6 flex-shrink-0 rounded p-0.5 transition-all hover:bg-gray-100 text-gray-400 hover:text-gray-600 ${
            block.type === 'h1' ? 'top-2' : block.type === 'h2' ? 'top-1.5' : 'top-1'
          }`}
          title={block.collapsed ? "展开" : "折叠"}
        >
          {block.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {/* 标题图标 - 可点击切换 */}
      {(block.type === 'h1' || block.type === 'h2' || block.type === 'h3') && (
        <div className="relative" ref={headingMenuOpen === block.id ? menuRef : null}>
          <button
            onClick={() => setHeadingMenuOpen(headingMenuOpen === block.id ? null : block.id)}
            className={`flex items-center gap-0.5 mr-2 flex-shrink-0 rounded px-1 py-0.5 transition-all hover:bg-gray-100 ${
              block.type === 'h1' ? 'mt-1.5 text-primary-500' :
              block.type === 'h2' ? 'mt-1 text-primary-400' :
              'mt-0.5 text-primary-300'
            }`}
            title="点击切换标题级别"
          >
            {block.type === 'h1' && <Heading1 size={22} />}
            {block.type === 'h2' && <Heading2 size={20} />}
            {block.type === 'h3' && <Heading3 size={18} />}
          </button>

          {/* 标题级别选择菜单 */}
          {headingMenuOpen === block.id && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                onClick={() => { updateBlock(index, { type: 'h1' }); setHeadingMenuOpen(null) }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${block.type === 'h1' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
              >
                <Heading1 size={18} />
                <span className="text-sm">一级标题</span>
              </button>
              <button
                onClick={() => { updateBlock(index, { type: 'h2' }); setHeadingMenuOpen(null) }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${block.type === 'h2' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
              >
                <Heading2 size={18} />
                <span className="text-sm">二级标题</span>
              </button>
              <button
                onClick={() => { updateBlock(index, { type: 'h3' }); setHeadingMenuOpen(null) }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${block.type === 'h3' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
              >
                <Heading3 size={18} />
                <span className="text-sm">三级标题</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { updateBlock(index, { type: 'paragraph' }); setHeadingMenuOpen(null) }}
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
          className={`mt-1.5 mr-3 flex-shrink-0 transition-all ${block.checked ? 'text-primary-500' : 'text-gray-300 hover:text-primary-400'}`}
        >
          {block.checked ? <CheckSquare size={20} className="drop-shadow-sm" /> : <Square size={20} />}
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
  )
}

// 可排序的 Block 组件
interface SortableBlockProps {
  block: Block
  index: number
  children: React.ReactNode
}

const SortableBlock: React.FC<SortableBlockProps> = ({ block, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto' as const,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { dragListeners: listeners })
        }
        return child
      })}
    </div>
  )
}

const Editor: React.FC<EditorProps> = ({ log, previousLog, onUpdate, onDelete }) => {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [title, setTitle] = useState(log.title)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [headingMenuOpen, setHeadingMenuOpen] = useState<string | null>(null) // 存储打开菜单的 block id
  const [isCopied, setIsCopied] = useState(false) // 复制状态
  const [isPrivateMode, setIsPrivateMode] = useState(false) // 隐私阅读模式
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

  // 一键复制日志内容（转换为分类列表格式）
  const handleCopyContent = async () => {
    // 筛选出完成和未完成的任务
    const completedTasks = blocks.filter(b => b.type === 'todo' && b.checked && b.content.trim())
    const incompleteTasks = blocks.filter(b => b.type === 'todo' && !b.checked && b.content.trim())
    
    // 构建格式化文本
    let textToCopy = ''
    
    // 完成工作
    textToCopy += '完成工作\n'
    if (completedTasks.length > 0) {
      completedTasks.forEach((task, index) => {
        textToCopy += `${index + 1}.${task.content}\n`
      })
    }
    
    // 没完成工作（与上面空一行分隔）
    textToCopy += '\n没完成工作\n'
    if (incompleteTasks.length > 0) {
      incompleteTasks.forEach((task, index) => {
        textToCopy += `${index + 1}.${task.content}\n`
      })
    }
    
    // 去除末尾多余的换行
    textToCopy = textToCopy.trimEnd()
    
    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // 2秒后重置状态
    } catch (error) {
      console.error('复制失败:', error)
      // 降级方案：使用传统方式复制
      const textarea = document.createElement('textarea')
      textarea.value = textToCopy
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

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
        } else if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
          // 标题直接删除
          removeBlock(index)
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

  // 切换标题折叠状态
  const toggleCollapse = (index: number) => {
    isLocalChange.current = true
    updateBlock(index, { collapsed: !blocks[index].collapsed })
  }

  // 切换标题隐私状态
  const togglePrivate = (index: number) => {
    isLocalChange.current = true
    updateBlock(index, { isPrivate: !blocks[index].isPrivate })
  }

  // 获取标题级别数字 (h1=1, h2=2, h3=3)
  const getHeadingLevel = (type: string): number => {
    if (type === 'h1') return 1
    if (type === 'h2') return 2
    if (type === 'h3') return 3
    return 0
  }

  // 计算哪些 blocks 应该被隐藏（被折叠的标题下的内容 + 隐私模式下的隐私内容）
  const getHiddenBlockIds = (): Set<string> => {
    const hiddenIds = new Set<string>()
    let currentCollapsedLevel = 0 // 当前折叠的标题级别
    let currentPrivateLevel = 0 // 当前隐私的标题级别（仅在隐私模式下生效）

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const blockLevel = getHeadingLevel(block.type)

      // 处理隐私模式隐藏
      if (isPrivateMode && currentPrivateLevel > 0) {
        // 遇到同级或更高级别的标题，停止隐私隐藏
        if (blockLevel > 0 && blockLevel <= currentPrivateLevel) {
          currentPrivateLevel = 0
        } else {
          // 隐藏这个 block
          hiddenIds.add(block.id)
          continue
        }
      }

      // 检查这个标题是否是隐私标题（在隐私模式下）
      if (isPrivateMode && blockLevel > 0 && block.isPrivate) {
        hiddenIds.add(block.id) // 隐藏标题本身
        currentPrivateLevel = blockLevel
        continue
      }

      // 处理折叠隐藏
      if (currentCollapsedLevel > 0) {
        // 遇到同级或更高级别的标题，停止折叠
        if (blockLevel > 0 && blockLevel <= currentCollapsedLevel) {
          currentCollapsedLevel = 0
        } else {
          // 否则隐藏这个 block
          hiddenIds.add(block.id)
          continue
        }
      }

      // 检查这个标题是否被折叠
      if (blockLevel > 0 && block.collapsed) {
        currentCollapsedLevel = blockLevel
      }
    }

    return hiddenIds
  }

  const hiddenBlockIds = getHiddenBlockIds()

  // 拖拽相关
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 获取标题及其下方内容的索引范围
  const getHeadingRange = (startIndex: number): { start: number; end: number } => {
    const block = blocks[startIndex]
    const blockLevel = getHeadingLevel(block.type)
    
    // 如果不是标题，只返回当前块
    if (blockLevel === 0) {
      return { start: startIndex, end: startIndex }
    }
    
    // 找到这个标题下方所有内容的结束位置
    let endIndex = startIndex
    for (let i = startIndex + 1; i < blocks.length; i++) {
      const nextLevel = getHeadingLevel(blocks[i].type)
      // 遇到同级或更高级别的标题，停止
      if (nextLevel > 0 && nextLevel <= blockLevel) {
        break
      }
      endIndex = i
    }
    
    return { start: startIndex, end: endIndex }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    
    if (!over || active.id === over.id) return
    
    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    isLocalChange.current = true
    
    const draggedBlock = blocks[oldIndex]
    const draggedLevel = getHeadingLevel(draggedBlock.type)
    
    // 如果拖拽的是标题，需要带上下方的内容一起移动
    if (draggedLevel > 0) {
      const { start, end } = getHeadingRange(oldIndex)
      const blocksToMove = blocks.slice(start, end + 1)
      
      // 计算目标位置
      let targetIndex = newIndex
      if (newIndex > oldIndex) {
        // 向下移动时，需要考虑移除的块数量
        const targetLevel = getHeadingLevel(blocks[newIndex].type)
        if (targetLevel > 0) {
          // 如果目标是标题，放在该标题区块之后
          const targetRange = getHeadingRange(newIndex)
          targetIndex = targetRange.end + 1 - blocksToMove.length
        }
      }
      
      // 先移除要移动的块
      const newBlocks = blocks.filter((_, i) => i < start || i > end)
      // 计算插入位置
      const insertAt = targetIndex > start ? targetIndex - blocksToMove.length + 1 : targetIndex
      // 插入到新位置
      newBlocks.splice(Math.max(0, Math.min(insertAt, newBlocks.length)), 0, ...blocksToMove)
      
      setBlocks(newBlocks)
    } else {
      // 非标题块直接移动
      setBlocks(arrayMove(blocks, oldIndex, newIndex))
    }
  }

  // 用于 SortableContext 的 id 列表
  const blockIds = useMemo(() => blocks.map(b => b.id), [blocks])

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
            onClick={() => setIsPrivateMode(!isPrivateMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              isPrivateMode
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
            title={isPrivateMode ? "当前：隐私模式（隐藏隐私内容）" : "当前：正常模式（显示所有内容）"}
          >
            {isPrivateMode ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">{isPrivateMode ? '隐私' : '正常'}</span>
          </button>
          <button
            onClick={handleCopyContent}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
              isCopied 
                ? 'text-green-600 bg-green-50' 
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
            title="复制日志内容"
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{isCopied ? '已复制' : '复制'}</span>
          </button>
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {blocks.map((block, index) => {
                // 跳过被折叠隐藏的 blocks
                if (hiddenBlockIds.has(block.id)) return null

                return (
                <SortableBlock key={block.id} block={block} index={index}>
                  <BlockItem
                    block={block}
                    index={index}
                    updateBlock={updateBlock}
                    toggleCollapse={toggleCollapse}
                    togglePrivate={togglePrivate}
                    headingMenuOpen={headingMenuOpen}
                    setHeadingMenuOpen={setHeadingMenuOpen}
                    menuRef={menuRef}
                    itemRefs={itemRefs}
                    handleChange={handleChange}
                    handleKeyDown={handleKeyDown}
                  />
                </SortableBlock>
                )
              })}
            </SortableContext>
          </DndContext>

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
