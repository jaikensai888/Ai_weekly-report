'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Summary, Block } from '@/lib/types'
import { updateSummary, deleteSummary } from '@/lib/api'
import {
    parseMarkdownToBlocks,
    blocksToMarkdown,
    generateId
} from '@/lib/utils'
import { Save, Trash2, GripVertical, CheckSquare, Square, Heading1, Heading2, Heading3, ChevronDown } from 'lucide-react'

interface SummaryEditorProps {
    summary: Summary
    onUpdate: (updatedSummary: Summary) => void
    onDelete: (id: number) => void
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({ summary, onUpdate, onDelete }) => {
    const [blocks, setBlocks] = useState<Block[]>([])
    const [title, setTitle] = useState(summary.title)
    const [focusId, setFocusId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [headingMenuOpen, setHeadingMenuOpen] = useState<string | null>(null)
    const itemRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({})
    const isLocalChange = useRef(false)
    const lastSummaryId = useRef<number | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    // 只在切换周报时初始化
    useEffect(() => {
        if (summary.id !== lastSummaryId.current) {
            lastSummaryId.current = summary.id
            setBlocks(parseMarkdownToBlocks(summary.content))
            setTitle(summary.title)
            isLocalChange.current = false
        }
    }, [summary.id, summary.content, summary.title])

    // 保存更改
    const saveChanges = useCallback(async () => {
        if (!isLocalChange.current) return

        const content = blocksToMarkdown(blocks)
        if (!title.trim()) return

        if (content !== summary.content || title !== summary.title) {
            setIsSaving(true)
            try {
                const updatedSummary = await updateSummary(summary.id, { title, content })
                onUpdate(updatedSummary)
            } catch (e) {
                console.error('保存失败:', e)
            } finally {
                setIsSaving(false)
            }
        }
        isLocalChange.current = false
    }, [blocks, title, summary, onUpdate])

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
                updateBlock(index, { type: 'paragraph' })
            } else {
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
                    updateBlock(index, { type: 'h2' })
                } else if (block.type === 'h2') {
                    updateBlock(index, { type: 'h3' })
                } else if (block.type === 'h3') {
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
            if (val.startsWith('## ')) {
                updateBlock(index, { type: 'h2', content: val.slice(3) })
                return
            } else if (val.startsWith('### ')) {
                updateBlock(index, { type: 'h3', content: val.slice(4) })
                return
            } else if (val.startsWith('# ')) {
                updateBlock(index, { type: 'h1', content: val.slice(2) })
                return
            } else if (val.match(/^\d+\.\s/)) {
                updateBlock(index, { type: 'todo', content: val.replace(/^\d+\.\s/, ''), checked: false })
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

    const handleDelete = async () => {
        if (!confirm('确定要删除这份周报吗？')) return

        try {
            await deleteSummary(summary.id)
            onDelete(summary.id)
        } catch (e) {
            console.error('删除失败:', e)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="周报标题"
                    className="bg-transparent text-xl font-bold text-slate-800 placeholder-gray-400 focus:outline-none w-full mr-4"
                />

                <div className="flex items-center space-x-2">
                    {isSaving && (
                        <span className="text-sm text-slate-500 flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                            保存中...
                        </span>
                    )}
                    <button
                        onClick={handleDelete}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        title="删除此周报"
                    >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">删除</span>
                    </button>
                </div>
            </div>

            {/* 编辑区域 */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-3xl mx-auto space-y-2">
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
                  placeholder:text-gray-300
                `}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 底部提示 */}
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>自动保存中...</span>
                <span className="text-gray-400">
                    创建于 {new Date(summary.createTime).toLocaleDateString('zh-CN')}
                </span>
            </div>
        </div>
    )
}

export default SummaryEditor
