import { useEffect, useState, useMemo } from 'react'
import { fetchRules } from '../lib/api'
import { BookOpen, Search, Filter, AlertTriangle, AlertCircle, Info } from 'lucide-react'

const RISK_LEVELS = [
  { key: '', label: '全部' },
  { key: '高', label: '高风险' },
  { key: '中', label: '中风险' },
  { key: '低', label: '低风险' },
]

const levelConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  '高': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  '中': { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  '低': { icon: Info, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
}

export default function Rules() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  useEffect(() => {
    fetchRules()
      .then((data) => setRules(data.rules))
      .catch((err) => setError(err.message || '加载规则失败'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = rules
    if (levelFilter) {
      result = result.filter((r) => r.level === levelFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.checkpoint.toLowerCase().includes(q) ||
          r.applicable.toLowerCase().includes(q)
      )
    }
    return result
  }, [rules, search, levelFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto" />
          <p className="mt-4 text-gray-500">加载规则库...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md bg-red-50 border border-red-200 rounded-xl p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-700 font-medium">加载失败</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md bg-gray-50 border border-gray-200 rounded-xl p-8">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">暂无审查规则</p>
          <p className="text-gray-400 text-sm mt-1">规则库正在建设中，请稍后再来</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#1e3a5f]" />
          审查规则库
        </h1>
        <p className="mt-2 text-gray-600">
          共收录 <span className="font-semibold text-[#1e3a5f]">{rules.length}</span> 条合同审查规则
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索规则编号、名称、审查要点..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2.5">
          <Filter className="w-4 h-4 text-gray-400" />
          {RISK_LEVELS.map((level) => (
            <button
              key={level.key}
              onClick={() => setLevelFilter(level.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                levelFilter === level.key
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {filtered.length !== rules.length && (
        <p className="text-sm text-gray-500 mb-4">
          筛选结果：<span className="font-medium text-gray-700">{filtered.length}</span> 条
        </p>
      )}

      {/* Rules Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((rule) => {
          const config = levelConfig[rule.level] || levelConfig['低']
          const Icon = config.icon
          return (
            <div
              key={rule.id}
              className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${config.bg}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500 bg-white/60 px-2 py-0.5 rounded">
                    {rule.id}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 ${config.color}`}>
                    <Icon className="w-3 h-3" />
                    {rule.level}风险
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{rule.name}</h3>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {rule.checkpoint}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-white/60 px-2 py-0.5 rounded">
                  适用：{rule.applicable}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">没有找到匹配的规则</p>
          <p className="text-gray-400 text-sm mt-1">尝试调整搜索词或筛选条件</p>
        </div>
      )}
    </div>
  )
}
