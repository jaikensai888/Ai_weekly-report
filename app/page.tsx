'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Editor from '@/components/Editor'
import SummaryGenerator from '@/components/SummaryGenerator'
import SummaryEditor from '@/components/SummaryEditor'
import TemplateManager from '@/components/TemplateManager'
import { LogEntry, ViewMode, Summary, User } from '@/lib/types'
import { fetchLogs, createLog, updateLog, deleteLog, fetchSummaries, deleteSummary, fetchCurrentUser, logout } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const SORT_ORDER_KEY = 'ai1_log_sort_order'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [currentLogId, setCurrentLogId] = useState<number | null>(null)
  const [currentSummaryId, setCurrentSummaryId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<number[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  // 加载排序顺序
  useEffect(() => {
    const savedOrder = localStorage.getItem(SORT_ORDER_KEY)
    if (savedOrder) {
      try {
        setSortOrder(JSON.parse(savedOrder))
      } catch {
        setSortOrder([])
      }
    }
  }, [])

  // 保存排序顺序
  const handleReorder = (newOrder: number[]) => {
    setSortOrder(newOrder)
    localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(newOrder))
  }

  // 检查登录状态并加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 先检查登录状态
        const currentUser = await fetchCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }
        setUser(currentUser)

        // 加载数据
        const [logsData, summariesData] = await Promise.all([
          fetchLogs(),
          fetchSummaries()
        ])
        setLogs(logsData)
        setSummaries(summariesData)
        if (logsData.length > 0) {
          // 如果有保存的排序顺序，使用第一个；否则使用最新的
          const savedOrder = localStorage.getItem(SORT_ORDER_KEY)
          if (savedOrder) {
            const order = JSON.parse(savedOrder)
            const firstValidId = order.find((id: number) => logsData.some(log => log.id === id))
            setCurrentLogId(firstValidId || logsData[0].id)
          } else {
            setCurrentLogId(logsData[0].id)
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [router])

  const handleCreateLog = async () => {
    try {
      // 生成当天日期作为标题 yyyyMMdd 格式
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const dateTitle = `${year}${month}${day}`

      const newLog = await createLog({
        title: dateTitle,
        content: ''
      })
      setLogs(prev => [newLog, ...prev])
      setCurrentLogId(newLog.id)
      setViewMode(ViewMode.EDIT)
      if (window.innerWidth < 768) setIsMobileMenuOpen(false)
    } catch (error) {
      console.error('创建日志失败:', error)
    }
  }

  const handleUpdateLog = async (updatedLog: LogEntry) => {
    try {
      await updateLog(updatedLog.id, updatedLog)
      setLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log))
    } catch (error) {
      console.error('更新日志失败:', error)
    }
  }

  const handleDeleteLog = async (id: number) => {
    if (confirm('确定要删除这条日志吗？')) {
      try {
        await deleteLog(id)
        setLogs(prev => prev.filter(l => l.id !== id))
        if (currentLogId === id) {
          // 如果删除的是当前日志，切换到其他日志或清空
          const remainingLogs = logs.filter(l => l.id !== id)
          setCurrentLogId(remainingLogs.length > 0 ? remainingLogs[0].id : null)
        }
      } catch (error) {
        console.error('删除日志失败:', error)
        alert('删除日志失败，请重试')
      }
    }
  }

  const handleUpdateSummary = async (updatedSummary: Summary) => {
    try {
      setSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s))
    } catch (error) {
      console.error('更新周报失败:', error)
    }
  }

  const handleDeleteSummary = async (id: number) => {
    try {
      await deleteSummary(id)
      setSummaries(prev => prev.filter(s => s.id !== id))
      if (currentSummaryId === id) {
        // 如果删除的是当前周报，切换到其他周报或清空
        const remainingSummaries = summaries.filter(s => s.id !== id)
        setCurrentSummaryId(remainingSummaries.length > 0 ? remainingSummaries[0].id : null)
      }
    } catch (error) {
      console.error('删除周报失败:', error)
      alert('删除周报失败，请重试')
    }
  }

  const activeLog = logs.find(l => l.id === currentLogId)
  const activeSummary = summaries.find(s => s.id === currentSummaryId)

  // 退出登录
  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // 获取上一条日志（用于导入未完成任务）
  const getPreviousLog = (): LogEntry | undefined => {
    if (!activeLog) return undefined
    const sorted = [...logs]
      .filter(l => l.id !== activeLog.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    return sorted[0]
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* 移动端遮罩 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <Sidebar
          logs={logs}
          summaries={summaries}
          currentLogId={currentLogId}
          currentSummaryId={currentSummaryId}
          onSelectLog={(id) => {
            setCurrentLogId(id)
            setCurrentSummaryId(null)
            setViewMode(ViewMode.EDIT)
            setShowTemplateManager(false)
            setIsMobileMenuOpen(false)
          }}
          onSelectSummary={(id) => {
            setCurrentSummaryId(id)
            setCurrentLogId(null)
            setViewMode(ViewMode.EDIT)
            setShowTemplateManager(false)
            setIsMobileMenuOpen(false)
          }}
          onCreateLog={handleCreateLog}
          onDeleteLog={handleDeleteLog}
          onDeleteSummary={handleDeleteSummary}
          onOpenSummary={() => {
            setViewMode(ViewMode.SUMMARY)
            setShowTemplateManager(false)
            setIsMobileMenuOpen(false)
          }}
          onOpenTemplateManager={() => {
            setShowTemplateManager(true)
            setViewMode(ViewMode.EDIT)
            setCurrentLogId(null)
            setCurrentSummaryId(null)
            setIsMobileMenuOpen(false)
          }}
          isSummaryMode={viewMode === ViewMode.SUMMARY}
          sortOrder={sortOrder}
          onReorder={handleReorder}
        />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* 移动端头部 */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-slate-800">智能日志</span>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded-md"
            title="退出登录"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* 桌面端头部 - 用户信息 */}
        <div className="hidden md:flex bg-white border-b border-gray-200 px-6 py-3 items-center justify-end gap-4">
          <span className="text-sm text-slate-600">
            欢迎，<span className="font-medium text-slate-800">{user?.username}</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-hidden">
          {showTemplateManager ? (
            <TemplateManager onClose={() => setShowTemplateManager(false)} />
          ) : viewMode === ViewMode.SUMMARY ? (
            <SummaryGenerator
              logs={logs}
              onClose={() => {
                setViewMode(ViewMode.EDIT)
                // 重新加载周报列表
                fetchSummaries().then(setSummaries)
              }}
              onSummarySaved={() => {
                // 保存成功后立即刷新周报列表
                fetchSummaries().then(setSummaries)
              }}
            />
          ) : activeSummary ? (
            <SummaryEditor
              summary={activeSummary}
              onUpdate={handleUpdateSummary}
              onDelete={handleDeleteSummary}
            />
          ) : activeLog ? (
            <Editor
              log={activeLog}
              previousLog={getPreviousLog()}
              onUpdate={handleUpdateLog}
              onDelete={handleDeleteLog}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-xl border-2 border-dashed border-slate-200">
              <div className="text-center p-8">
                <h3 className="text-xl font-medium text-slate-600 mb-2">暂无内容</h3>
                <p className="mb-6">从侧边栏选择日志或周报</p>
                <button
                  onClick={handleCreateLog}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                  创建第一条日志
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
