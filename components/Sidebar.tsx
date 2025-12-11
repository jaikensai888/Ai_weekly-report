'use client'

import React, { useState, useRef } from 'react'
import { LogEntry, Summary } from '@/lib/types'
import { formatDate, getWeekKey, getWeekLabel, isThisWeek } from '@/lib/utils'
import { Plus, Book, FileText, LayoutTemplate, Trash2, GripVertical, FileBarChart, Settings, ChevronDown, ChevronRight } from 'lucide-react'

interface SidebarProps {
  logs: LogEntry[]
  summaries: Summary[]
  currentLogId: number | null
  currentSummaryId: number | null
  onSelectLog: (id: number) => void
  onSelectSummary: (id: number) => void
  onCreateLog: () => void
  onDeleteLog: (id: number) => void
  onDeleteSummary: (id: number) => void
  onOpenSummary: () => void
  onOpenTemplateManager?: () => void
  isSummaryMode: boolean
  sortOrder: number[]
  onReorder: (newOrder: number[]) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  logs,
  summaries,
  currentLogId,
  currentSummaryId,
  onSelectLog,
  onSelectSummary,
  onCreateLog,
  onDeleteLog,
  onDeleteSummary,
  onOpenSummary,
  onOpenTemplateManager,
  isSummaryMode,
  sortOrder,
  onReorder
}) => {
  const [hoveredLogId, setHoveredLogId] = useState<number | null>(null)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'logs' | 'summaries'>('logs')
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set())
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  // 根据 sortOrder 排序，没有在 sortOrder 中的按创建时间排序放在最前面
  const sortedLogs = [...logs].sort((a, b) => {
    const indexA = sortOrder.indexOf(a.id)
    const indexB = sortOrder.indexOf(b.id)

    // 都不在排序列表中，按创建时间倒序
    if (indexA === -1 && indexB === -1) {
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    }
    // a 不在排序列表中，排前面
    if (indexA === -1) return -1
    // b 不在排序列表中，排前面
    if (indexB === -1) return 1
    // 都在排序列表中，按索引排序
    return indexA - indexB
  })

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, logId: number) => {
    setDraggedId(logId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', logId.toString())
    // 延迟添加拖拽样式
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5'
      }
    }, 0)
  }

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent, logId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedId !== logId) {
      setDragOverId(logId)
    }
  }

  // 拖拽离开
  const handleDragLeave = () => {
    setDragOverId(null)
  }

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1'
    }
  }

  // 放置
  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()

    if (draggedId === null || draggedId === targetId) {
      handleDragEnd()
      return
    }

    // 获取当前排序后的 ID 列表
    const currentOrder = sortedLogs.map(log => log.id)
    const draggedIndex = currentOrder.indexOf(draggedId)
    const targetIndex = currentOrder.indexOf(targetId)

    // 重新排序
    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedId)

    onReorder(newOrder)
    handleDragEnd()
  }

  // 按周分组日志
  const groupLogsByWeek = () => {
    const groups: { [key: string]: { logs: LogEntry[], label: string, isCurrentWeek: boolean } } = {}

    sortedLogs.forEach(log => {
      const weekKey = getWeekKey(log.createTime)
      const logIsThisWeek = isThisWeek(log.createTime)

      if (!groups[weekKey]) {
        groups[weekKey] = {
          logs: [],
          label: getWeekLabel(log.createTime, logIsThisWeek),
          isCurrentWeek: logIsThisWeek
        }
      }

      groups[weekKey].logs.push(log)
    })

    // 按时间倒序排列
    return Object.entries(groups).sort((a, b) => {
      // 本周排在最前
      if (a[1].isCurrentWeek) return -1
      if (b[1].isCurrentWeek) return 1
      // 其他按weekKey降序
      return b[0].localeCompare(a[0])
    })
  }

  // 切换折叠状态
  const toggleWeekCollapse = (weekKey: string) => {
    const newCollapsed = new Set(collapsedWeeks)
    if (newCollapsed.has(weekKey)) {
      newCollapsed.delete(weekKey)
    } else {
      newCollapsed.add(weekKey)
    }
    setCollapsedWeeks(newCollapsed)
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-primary-600 p-2 rounded-lg text-white shadow-md shadow-primary-200">
            <Book size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">智能日志</h1>
        </div>

        <button
          onClick={onCreateLog}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={18} />
          <span>新建日志</span>
        </button>

        {/* Tab 切换 */}
        <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'logs'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            <FileText size={16} />
            日报
          </button>
          <button
            onClick={() => setActiveTab('summaries')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'summaries'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            <FileBarChart size={16} />
            周报
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
        {activeTab === 'logs' ? (
          // 日报列表 - 按周分组
          sortedLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm px-4">
              <div className="inline-block p-3 bg-gray-50 rounded-full mb-3">
                <FileText size={24} className="opacity-50" />
              </div>
              <p>暂无日志<br />开始记录您的工作吧！</p>
            </div>
          ) : (
            groupLogsByWeek().map(([weekKey, { logs, label, isCurrentWeek }]) => {
              const isCollapsed = collapsedWeeks.has(weekKey)

              return (
                <div key={weekKey} className="space-y-1">
                  {/* 周标题 */}
                  <div
                    onClick={() => !isCurrentWeek && toggleWeekCollapse(weekKey)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide ${isCurrentWeek ? '' : 'cursor-pointer hover:text-primary-600'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {!isCurrentWeek && (
                        isCollapsed ?
                          <ChevronRight size={14} className="text-slate-400" /> :
                          <ChevronDown size={14} className="text-slate-400" />
                      )}
                      <span>{label}</span>
                      <span className="text-slate-400 font-normal">({logs.length})</span>
                    </div>
                  </div>

                  {/* 日志列表 */}
                  {(!isCollapsed || isCurrentWeek) && (
                    <div className="space-y-1">
                      {logs.map(log => (
                        <div
                          key={log.id}
                          ref={draggedId === log.id ? dragNodeRef : null}
                          draggable
                          onDragStart={(e) => handleDragStart(e, log.id)}
                          onDragOver={(e) => handleDragOver(e, log.id)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, log.id)}
                          className={`relative w-full text-left pl-2 pr-4 py-3 rounded-lg transition-all group border cursor-pointer flex items-center ${currentLogId === log.id && !isSummaryMode
                              ? 'bg-primary-50 border-primary-200 shadow-sm'
                              : 'bg-white border-transparent hover:bg-gray-50'
                            } ${draggedId === log.id ? 'opacity-50' : ''} ${dragOverId === log.id && draggedId !== log.id
                              ? 'border-primary-400 border-dashed bg-primary-50/50'
                              : ''
                            }`}
                          onClick={() => onSelectLog(log.id)}
                          onMouseEnter={() => setHoveredLogId(log.id)}
                          onMouseLeave={() => setHoveredLogId(null)}
                        >
                          {/* 拖拽手柄 */}
                          <div
                            className={`flex-shrink-0 mr-2 cursor-grab active:cursor-grabbing text-gray-300 transition-opacity ${hoveredLogId === log.id ? 'opacity-100' : 'opacity-0'
                              }`}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <GripVertical size={16} />
                          </div>

                          {/* 日志信息 */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm mb-1 pr-8 truncate ${currentLogId === log.id && !isSummaryMode ? 'text-primary-900' : 'text-slate-700'
                              }`}>
                              {log.title || '未命名日志'}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-xs ${currentLogId === log.id && !isSummaryMode
                                  ? 'text-primary-600'
                                  : 'text-gray-400 group-hover:text-gray-500'
                                }`}>
                                {new Date(log.createTime).toLocaleDateString('zh-CN', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteLog(log.id)
                            }}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${hoveredLogId === log.id
                                ? 'opacity-100 text-red-500 hover:bg-red-50 hover:text-red-600'
                                : 'opacity-0'
                              }`}
                            title="删除日志"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )
        ) : (
          // 周报列表
          summaries.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm px-4">
              <div className="inline-block p-3 bg-gray-50 rounded-full mb-3">
                <FileBarChart size={24} className="opacity-50" />
              </div>
              <p>暂无周报<br />生成并保存后即可查看</p>
            </div>
          ) : (
            summaries.map(summary => (
              <div
                key={summary.id}
                className={`relative w-full text-left px-4 py-3 rounded-lg transition-all group border cursor-pointer ${currentSummaryId === summary.id
                  ? 'bg-primary-50 border-primary-200 shadow-sm'
                  : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
                onClick={() => onSelectSummary(summary.id)}
                onMouseEnter={() => setHoveredLogId(summary.id)}
                onMouseLeave={() => setHoveredLogId(null)}
              >
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm mb-1 pr-8 truncate ${currentSummaryId === summary.id ? 'text-primary-900' : 'text-slate-700'
                    }`}>
                    {summary.title || '未命名周报'}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${currentSummaryId === summary.id
                      ? 'text-primary-600'
                      : 'text-gray-400 group-hover:text-gray-500'
                      }`}>
                      {formatDate(summary.createTime)}
                    </span>
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSummary(summary.id)
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${hoveredLogId === summary.id
                    ? 'opacity-100 text-red-500 hover:bg-red-50 hover:text-red-600'
                    : 'opacity-0'
                    }`}
                  title="删除周报"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
        <button
          onClick={onOpenSummary}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${isSummaryMode
            ? 'bg-white border-primary-300 shadow-sm text-primary-700'
            : 'bg-white border-gray-200 text-slate-600 hover:border-gray-300 hover:shadow-sm'
            }`}
        >
          <span className="flex items-center gap-2 font-medium">
            <LayoutTemplate size={18} />
            生成周报
          </span>
          <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
            AI
          </span>
        </button>

        {onOpenTemplateManager && (
          <button
            onClick={onOpenTemplateManager}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-slate-600 hover:border-gray-300 hover:shadow-sm transition-all text-sm font-medium"
          >
            <Settings size={16} />
            模板管理
          </button>
        )}
      </div>
    </div>
  )
}

export default Sidebar
