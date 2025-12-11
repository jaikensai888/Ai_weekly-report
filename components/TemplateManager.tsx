'use client'

import React, { useState, useEffect } from 'react'
import { SummaryTemplate } from '@/lib/types'
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/api'
import { Plus, X, Edit2, Trash2, Star, Eye, Save } from 'lucide-react'

interface TemplateManagerProps {
    onClose: () => void
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onClose }) => {
    const [templates, setTemplates] = useState<SummaryTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingTemplate, setEditingTemplate] = useState<SummaryTemplate | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [previewTemplate, setPreviewTemplate] = useState<SummaryTemplate | null>(null)

    // 表单状态
    const [formName, setFormName] = useState('')
    const [formContent, setFormContent] = useState('')
    const [formIsDefault, setFormIsDefault] = useState(0)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            const data = await fetchTemplates()
            setTemplates(data)
        } catch (error) {
            console.error('加载模板失败:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = () => {
        setIsCreating(true)
        setEditingTemplate(null)
        setFormName('')
        setFormContent('## 本周概述\n\n## 完成事项\n- \n\n## 进行中\n- \n\n## 下周计划\n- ')
        setFormIsDefault(0)
    }

    const handleEdit = (template: SummaryTemplate) => {
        setEditingTemplate(template)
        setIsCreating(false)
        setFormName(template.name)
        setFormContent(template.content)
        setFormIsDefault(template.isDefault)
    }

    const handleSave = async () => {
        if (!formName.trim()) {
            alert('请输入模板名称')
            return
        }

        try {
            if (editingTemplate) {
                // 更新
                const updated = await updateTemplate(editingTemplate.id, {
                    name: formName,
                    content: formContent,
                    isDefault: formIsDefault
                })
                setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
            } else if (isCreating) {
                // 创建
                const created = await createTemplate({
                    name: formName,
                    content: formContent,
                    isDefault: formIsDefault
                })
                setTemplates(prev => [created, ...prev])
            }

            // 重新加载以确保默认模板状态正确
            await loadTemplates()

            setIsCreating(false)
            setEditingTemplate(null)
        } catch (error) {
            console.error('保存模板失败:', error)
            alert('保存失败,请重试')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这个模板吗?')) return

        try {
            await deleteTemplate(id)
            setTemplates(prev => prev.filter(t => t.id !== id))
        } catch (error) {
            console.error('删除模板失败:', error)
            alert('删除失败,请重试')
        }
    }

    const handleCancel = () => {
        setIsCreating(false)
        setEditingTemplate(null)
    }

    const showingForm = isCreating || editingTemplate

    return (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {/* 头部 */}
            <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Edit2 className="text-primary-600" size={22} />
                        周报模板管理
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">创建和管理周报生成模板</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X size={22} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* 左侧: 模板列表 */}
                <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-6 bg-gray-50/50">
                    <button
                        onClick={handleCreate}
                        className="w-full mb-4 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        新建模板
                    </button>

                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">加载中...</div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Edit2 size={48} className="mx-auto mb-3 opacity-20" />
                            <p>暂无模板</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all ${editingTemplate?.id === template.id
                                            ? 'bg-white border-primary-300 shadow-md'
                                            : 'bg-white border-gray-200 hover:border-primary-200 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                {template.name}
                                                {template.isDefault === 1 && (
                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {new Date(template.createTime).toLocaleDateString('zh-CN')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setPreviewTemplate(template)}
                                            className="flex-1 text-xs px-2 py-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Eye size={12} />
                                            预览
                                        </button>
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="flex-1 text-xs px-2 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Edit2 size={12} />
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="text-xs px-2 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 右侧: 编辑器或预览 */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {showingForm ? (
                        <div className="max-w-3xl mx-auto">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">
                                {editingTemplate ? '编辑模板' : '创建新模板'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        模板名称
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="例如: 研发周报模板"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        模板内容 (Markdown格式)
                                    </label>
                                    <textarea
                                        value={formContent}
                                        onChange={(e) => setFormContent(e.target.value)}
                                        placeholder="输入模板内容..."
                                        rows={20}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        提示: AI会根据这个模板结构生成周报内容
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={formIsDefault === 1}
                                        onChange={(e) => setFormIsDefault(e.target.checked ? 1 : 0)}
                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <label htmlFor="isDefault" className="text-sm text-slate-700">
                                        设为默认模板
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        保存模板
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-6 py-3 border border-gray-300 text-slate-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : previewTemplate ? (
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Eye size={20} />
                                    模板预览: {previewTemplate.name}
                                </h3>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="text-sm text-slate-600 hover:text-slate-800"
                                >
                                    关闭预览
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <div className="prose prose-slate max-w-none">
                                    {previewTemplate.content.split('\n').map((line, i) => (
                                        <div key={i}>
                                            {line.startsWith('## ') ? (
                                                <h2 className="text-xl font-bold mt-6 mb-3 text-slate-800">
                                                    {line.replace('## ', '')}
                                                </h2>
                                            ) : line.startsWith('# ') ? (
                                                <h1 className="text-2xl font-bold mt-6 mb-4 text-slate-900">
                                                    {line.replace('# ', '')}
                                                </h1>
                                            ) : line.startsWith('- ') ? (
                                                <li className="ml-6 text-slate-700">{line.replace('- ', '')}</li>
                                            ) : line.startsWith('**') ? (
                                                <p className="font-bold mt-4 mb-2 text-slate-800">
                                                    {line.replace(/\*\*/g, '')}
                                                </p>
                                            ) : (
                                                <p className="text-slate-700 mb-2 min-h-[1rem]">{line}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <Edit2 size={64} className="mx-auto mb-4 opacity-20" />
                                <p>选择一个模板进行编辑或预览</p>
                                <p className="text-sm mt-2">或点击"新建模板"创建新的模板</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TemplateManager
