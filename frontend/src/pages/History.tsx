import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Loader2, Search } from 'lucide-react'
import { authFetch } from '../lib/api'

interface HistoryItem {
  id: string
  filename: string
  contract_type: string
  overall_level: string
  risk_count: number
  created_at: string
}

interface HistoryDetail {
  id: string
  filename: string
  contract_type: string
  overall_level: string
  summary: string
  confidence: number
  risk_count: number
  clause_count: number
  risks: Array<{
    title: string
    type: string
    has_risk: boolean
    risks: Array<{
      type: string
      severity: string
      description: string
      relevant_text: string
      suggestion: string
      legal_basis: string
    }>
  }>
  created_at: string
}

type FetchStatus = 'loading' | 'error' | 'success'

const levelColor = (level: string) => {
  if (level.includes('高')) return 'text-red-600 bg-red-50'
  if (level.includes('中')) return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}

const levelBorder = (level: string) => {
  if (level.includes('高')) return 'border-red-200'
  if (level.includes('中')) return 'border-yellow-200'
  return 'border-green-200'
}

export default function History() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<FetchStatus>('loading')
  const [items, setItems] = useState<HistoryItem[]>([])
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<HistoryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    document.title = '审查历史 - LegalFlow'
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setStatus('loading')
    setError('')
    try {
      const res = await authFetch('/review/history')
      if (!res.ok) {
        if (res.status === 401) return
        throw new Error(`请求失败: ${res.status}`)
      }
      const data = await res.json()
      setItems(data.items || data.history || [])
      setStatus('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取历史记录失败')
      setStatus('error')
    }
  }

  const fetchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await authFetch(`/review/${id}`)
      if (!res.ok) throw new Error(`请求失败: ${res.status}`)
      const data = await res.json()
      setDetail(data)
    } catch (e) {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)
    } else {
      setExpandedId(id)
      setDetail(null)
      fetchDetail(id)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">审查历史</h1>
          <p className="text-gray-600 mt-2">查看和管理您的历史合同审查记录</p>
        </div>
        <button
          onClick={fetchHistory}
          className="px-4 py-2 text-sm text-[#1e3a5f] border border-[#1e3a5f]/30 rounded-lg hover:bg-[#1e3a5f]/5 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#1e3a5f] mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-1">加载失败</p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={fetchHistory}
            className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7f] transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      )}

      {/* Empty */}
      {status === 'success' && items.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-1">暂无审查记录</p>
          <p className="text-gray-500 text-sm mb-6">去审查一份合同吧</p>
          <button
            onClick={() => navigate('/review')}
            className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7f] transition-colors"
          >
            前往合同审查
          </button>
        </div>
      )}

      {/* History List */}
      {status === 'success' && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border transition-colors ${
                expandedId === item.id ? 'border-[#1e3a5f]/40' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Row Header */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="flex items-center gap-4 p-4 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#1e3a5f]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.filename || '未命名合同'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{item.contract_type || '通用合同'}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${levelColor(item.overall_level || '低风险')}`}>
                    {item.overall_level || '低风险'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {item.risk_count ?? 0} 个风险点
                  </span>
                  <div className="w-6 h-6 flex items-center justify-center">
                    {expandedId === item.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === item.id && (
                <div className={`border-t ${levelBorder(item.overall_level || '低风险')} px-4 py-4`}>
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
                      <span className="ml-2 text-sm text-gray-500">加载详情...</span>
                    </div>
                  ) : detail && detail.id === item.id ? (
                    <div className="space-y-4">
                      {/* Summary */}
                      {detail.summary && (
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                          <p className="font-medium text-gray-900 mb-0.5">审查摘要</p>
                          <p>{detail.summary}</p>
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-[#1e3a5f]">{detail.clause_count ?? 0}</p>
                          <p className="text-xs text-gray-500">条款数</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-red-600">{detail.risk_count ?? 0}</p>
                          <p className="text-xs text-gray-500">风险点</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-[#1e3a5f]">
                            {(detail.confidence * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-500">置信度</p>
                        </div>
                      </div>

                      {/* Risk List */}
                      {detail.risks && detail.risks.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            风险详情
                          </p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {detail.risks
                              .filter(c => c.has_risk)
                              .map((clause, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg p-3">
                                  <p className="text-xs font-medium text-gray-900 mb-1">
                                    {clause.title?.slice(0, 40) || '条款'}
                                    <span className="ml-2 text-gray-400">{clause.type}</span>
                                  </p>
                                  {clause.risks.map((risk, j) => (
                                    <div key={j} className="mt-1.5 ml-2 pl-2 border-l-2 text-xs space-y-1"
                                      style={{ borderColor: risk.severity === '高风险' ? '#ef4444' : risk.severity === '中风险' ? '#eab308' : '#3b82f6' }}>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          risk.severity === '高风险' ? 'bg-red-100 text-red-700' :
                                          risk.severity === '中风险' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>{risk.severity}</span>
                                        <span className="text-gray-500">{risk.type}</span>
                                      </div>
                                      <p className="text-gray-600">{risk.description}</p>
                                      {risk.suggestion && (
                                        <p className="text-green-700">建议：{risk.suggestion}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => navigate('/review')}
                          className="px-4 py-1.5 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7f] transition-colors"
                        >
                          审查新合同
                        </button>
                      </div>
                    </div>
                  ) : detail === null && !detailLoading ? (
                    <p className="text-sm text-gray-400 text-center py-4">无法加载详情</p>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
