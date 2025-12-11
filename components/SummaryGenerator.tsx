'use client'

import React, { useState, useEffect } from 'react'
import { LogEntry, SummaryTemplate } from '@/lib/types'
import { generateSummary, generateAndSaveSummary, fetchTemplates } from '@/lib/api'
import { generateWeeklySummaryTitle } from '@/lib/utils'
import { Sparkles, X, Copy, Check, FileText, Calendar, ArrowRight, Save, FileCode } from 'lucide-react'

interface SummaryGeneratorProps {
  logs: LogEntry[]
  onClose: () => void
  onSummarySaved?: () => void  // 新增：保存成功后的回调
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ logs, onClose, onSummarySaved }) => {
  const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<SummaryTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await fetchTemplates()
        setTemplates(data)
        // 自动选择默认模板
        const defaultTemplate = data.find(t => t.isDefault === 1)
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id)
        }
      } catch (error) {
        console.error('加载模板失败:', error)
      }
    }
    loadTemplates()
  }, [])

  const toggleLogSelection = (id: number) => {
    const newSet = new Set(selectedLogIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedLogIds(newSet)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    const selectedLogs = logs.filter(log => selectedLogIds.has(log.id))

    try {
      const summary = await generateSummary(selectedLogs, selectedTemplateId || undefined)
      setGeneratedSummary(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成周报时发生错误')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (generatedSummary) {
      navigator.clipboard.writeText(generatedSummary)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleSave = async () => {
    if (!generatedSummary) return

    setIsSaving(true)
    setError(null)
    const selectedLogs = logs.filter(log => selectedLogIds.has(log.id))

    try {
      const title = generateWeeklySummaryTitle(selectedLogs)
      await generateAndSaveSummary(selectedLogs, title, selectedTemplateId || undefined)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)

      // 保存成功后通知父组件刷新周报列表
      if (onSummarySaved) {
        onSummarySaved()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存周报时发生错误')
    } finally {
      setIsSaving(false)
    }
  }

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
  )

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden relative">
      {/* 头部 */}
      <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-primary-600" size={22} />
            AI 智能周报
          </h2>
          <p className="text-sm text-slate-500 mt-1">选择日志，一键生成工作周报</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
        {/* 左侧面板：日志选择 */}
        {!generatedSummary && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">选择日志</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedLogIds(new Set(sortedLogs.map(l => l.id)))}
                    className="text-xs font-medium text-primary-600 hover:bg-primary-50 px-2 py-1 rounded transition-colors"
                  >
                    全选
                  </button>
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-gray-200">
                    已选 {selectedLogIds.size} 条
                  </span>
                </div>
              </div>

              {/* 模板选择 */}
              {templates.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <FileCode size={16} />
                    选择周报模板
                  </label>
                  <select
                    value={selectedTemplateId || ''}
                    onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">使用默认模板</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.isDefault === 1 ? '(默认)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {sortedLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p>暂无可汇总的日志</p>
                  </div>
                ) : (
                  sortedLogs.map(log => (
                    <div
                      key={log.id}
                      onClick={() => toggleLogSelection(log.id)}
                      className={`group flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedLogIds.has(log.id)
                        ? 'border-primary-500 bg-white shadow-md shadow-primary-100 ring-1 ring-primary-500'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedLogIds.has(log.id)
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-gray-300 group-hover:border-primary-400'
                        }`}>
                        {selectedLogIds.has(log.id) && <Check size={12} strokeWidth={4} />}
                      </div>

                      <div className="ml-4 flex-1">
                        <div className={`font-semibold transition-colors ${selectedLogIds.has(log.id) ? 'text-primary-900' : 'text-slate-700'
                          }`}>
                          {log.title || '未命名日志'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(log.createTime).toLocaleDateString('zh-CN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 生成按钮区域 */}
        {!generatedSummary && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent md:static md:bg-none md:p-0 md:w-1/3 md:border-l border-gray-200 flex flex-col justify-center items-center bg-white">
            <div className="p-8 w-full max-w-sm text-center">
              <div className="mb-6 hidden md:block">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="text-primary-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">准备好生成周报了吗？</h3>
                <p className="text-sm text-slate-500 mt-2">
                  AI 将分析您选择的日志，生成结构化的工作周报
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={selectedLogIds.size === 0 || isGenerating}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${selectedLogIds.size === 0 || isGenerating
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-200 hover:-translate-y-0.5'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    正在生成...
                  </>
                ) : (
                  <>
                    生成周报
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 结果展示 */}
        {generatedSummary && (
          <div className="flex-1 flex flex-col h-full bg-white animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <button
                onClick={() => setGeneratedSummary(null)}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowRight className="rotate-180" size={16} /> 返回选择
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || saveSuccess}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all border ${saveSuccess
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : isSaving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'
                    }`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                      保存中...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={16} />
                      已保存!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      保存周报
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all border ${copySuccess
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  {copySuccess ? '已复制!' : '复制周报'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
              <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 prose prose-slate prose-headings:font-bold prose-h1:text-primary-900 prose-a:text-primary-600">
                {generatedSummary.split('\n').map((line, i) => (
                  <div key={i}>
                    {line.startsWith('##') ? (
                      <h2 className="text-xl mt-6 mb-3">{line.replace(/#/g, '')}</h2>
                    ) : line.startsWith('**') ? (
                      <strong className="block mt-4 mb-2">{line.replace(/\*\*/g, '')}</strong>
                    ) : line.startsWith('-') ? (
                      <li className="ml-4">{line.replace('-', '')}</li>
                    ) : (
                      <p className="mb-2 min-h-[1rem]">{line}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SummaryGenerator
