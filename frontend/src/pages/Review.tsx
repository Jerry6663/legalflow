import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, Loader2, AlertTriangle, Shield, BookOpen, Scale } from 'lucide-react'

interface Risk {
  title: string
  type: string
  content: string
  position: number
  has_risk: boolean
  risks: Array<{
    type: string
    severity: string
    description: string
    relevant_text: string
    suggestion: string
    legal_basis: string
  }>
}

interface RuleMatch {
  clause_title: string
  clause_type: string
  rules: Array<{
    score: number
    rule: string
    level: string
    content: string
  }>
}

interface AnalysisResult {
  review_id: string
  contract_type: string
  confidence: number
  keywords: string[]
  clauses: Array<{ title: string; type: string; content: string; position: number }>
  risks: Risk[]
  matched_rules: RuleMatch[]
  matched_laws: LawMatch[]
  overall_level: string
  summary: string
  report: string
  steps: Array<{ step: string; detail: string }>
}

interface LawMatch {
  clause_title: string
  risk_type: string
  laws: Array<{
    score: number
    source: string
    article: string
    content: string
    relevance: string
  }>
}

export default function Review() {
  const [step, setStep] = useState<'upload' | 'uploading' | 'analyzing' | 'done'>('upload')
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const pollRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  // Cleanup on unmount — prevent memory leak
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleFile = async (file: File) => {
    // Clean up any previous polling
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    setStep('uploading')
    setError('')
    setResults(null)
    setElapsed(0)

    try {
      const form = new FormData()
      form.append('file', file)

      const abortCtrl = new AbortController()
      const uploadTimer = setTimeout(() => abortCtrl.abort(), 30000)

      const res = await fetch('/api/v1/review/upload', {
        method: 'POST',
        body: form,
        signal: abortCtrl.signal,
      })
      clearTimeout(uploadTimer)
      if (!res.ok) throw new Error(`上传失败: ${res.status}`)

      const data = await res.json()
      const text = data.parsed?.raw_text || ''

      setStep('analyzing')
      timerRef.current = window.setInterval(() => setElapsed(p => p + 1), 1000)

      const submitCtrl = new AbortController()
      const submitTimer = setTimeout(() => submitCtrl.abort(), 15000)
      const submitRes = await fetch('/api/v1/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_text: text, contract_type: '通用' }),
        signal: submitCtrl.signal,
      })
      clearTimeout(submitTimer)
      if (!submitRes.ok) throw new Error(`提交失败: ${submitRes.status}`)
      const { job_id } = await submitRes.json()

      // Poll every 2s, max 90 times (3 minutes)
      const MAX_POLLS = 90
      let pollCount = 0
      pollRef.current = window.setInterval(async () => {
        pollCount++
        if (pollCount > MAX_POLLS) {
          clearInterval(pollRef.current!)
          if (timerRef.current) clearInterval(timerRef.current)
          setError('审查超时（超过3分钟），请稍后重试或联系客服')
          setStep('upload')
          return
        }

        const pollCtrl = new AbortController()
        const pollTimer = setTimeout(() => pollCtrl.abort(), 5000)

        try {
          const pollRes = await fetch(`/api/v1/review/job/${job_id}`, {
            signal: pollCtrl.signal,
          })
          clearTimeout(pollTimer)
          const job = await pollRes.json()
          if (job.status === 'done' && job.result) {
            clearInterval(pollRef.current!)
            if (timerRef.current) clearInterval(timerRef.current)
            setResults(job.result)
            setStep('done')
          } else if (job.status === 'error') {
            clearInterval(pollRef.current!)
            if (timerRef.current) clearInterval(timerRef.current)
            setError(job.error || '审查失败')
            setStep('upload')
          }
        } catch {
          clearTimeout(pollTimer)
          // Single poll failure — ignore, try again on next interval
        }
      }, 2000)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('请求超时，请检查网络后重试')
      } else {
        setError(e instanceof Error ? e.message : '提交失败')
      }
      setStep('upload')
    }
  }

  const riskCounts = results ? {
    high: results.risks.filter(c => c.risks.some(r => r.severity === '高风险')).length,
    medium: results.risks.filter(c => c.risks.some(r => r.severity === '中风险')).length,
    total: results.risks.reduce((sum, c) => sum + c.risks.length, 0),
  } : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">合同审查</h1>
        <p className="text-gray-600 mt-2">
          上传合同文件，AI 自动识别类型、拆分条款、标注风险并匹配审查规则
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Upload */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#1e3a5f]" />
              上传合同文件
            </h2>

            {step !== 'done' && (
              <UploadZone onFile={handleFile} disabled={step !== 'upload'} />
            )}

            {(step === 'uploading' || step === 'analyzing') && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f] mb-3" />
                <p>{step === 'uploading' ? '正在上传解析...' : `AI正在审查合同... 已等待 ${elapsed} 秒`}</p>
                {step === 'analyzing' && elapsed > 10 && (
                  <p className="text-xs text-gray-400 mt-1">DeepSeek V4 分析中，请耐心等待</p>
                )}
              </div>
            )}

            {step === 'done' && results && (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold">审查完成</p>
                  <p className="text-xs text-green-600 mt-1">可重新上传新合同</p>
                </div>
                <UploadZone onFile={handleFile} disabled={false} mini />
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl text-red-700 text-sm">{error}</div>
            )}
          </div>

          {/* Contract Info */}
          {results && (
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">合同信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">类型</span>
                  <span className="text-[#1e3a5f] font-medium">{results.contract_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">置信度</span>
                  <span className="text-gray-900">{(results.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">条款数</span>
                  <span className="text-gray-900">{results.clauses.length} 条</span>
                </div>
                {results.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {results.keywords.map(kw => (
                      <span key={kw} className="px-2 py-0.5 bg-blue-50 text-[#1e3a5f] text-xs rounded-full">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1e3a5f]" />
              审查结果
            </h2>

            {step === 'upload' && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText className="w-16 h-16 mb-4 stroke-1" />
                <p className="text-lg font-medium text-gray-500">等待上传</p>
                <p className="text-sm mt-1">上传合同文件后，审查结果将在此显示</p>
              </div>
            )}

            {results && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700">
                  <p className="font-semibold mb-1">审查摘要</p>
                  <p>{results.summary}</p>
                </div>

                {/* Risk Level Badge */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">综合风险等级</span>
                  <span className={`text-2xl font-bold ${
                    results.overall_level.includes('高') ? 'text-red-600' :
                    results.overall_level.includes('中') ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {results.overall_level}
                  </span>
                </div>

                {/* Risk Stats */}
                {riskCounts && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{riskCounts.high}</p>
                      <p className="text-xs text-red-500">高风险</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{riskCounts.medium}</p>
                      <p className="text-xs text-yellow-500">中风险</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#1e3a5f]">{riskCounts.total}</p>
                      <p className="text-xs text-blue-500">总风险点</p>
                    </div>
                  </div>
                )}

                {/* Risk Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    风险详情
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {results.risks
                      .filter(c => c.has_risk)
                      .map((clause, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {clause.title?.slice(0, 40) || '条款'}
                              <span className="ml-2 text-xs text-gray-400">{clause.type}</span>
                            </span>
                          </div>
                          {clause.risks.map((risk, j) => (
                            <div key={j} className="mt-2 ml-2 border-l-2 pl-3"
                              style={{ borderColor: risk.severity === '高风险' ? '#ef4444' : risk.severity === '中风险' ? '#eab308' : '#3b82f6' }}>
                              {/* 1. 合同原文 (highlight) */}
                              {risk.relevant_text && (
                                <p className="text-sm text-gray-900 bg-yellow-50 rounded px-2 py-1 font-medium">
                                  原文："{risk.relevant_text.slice(0, 200)}"
                                </p>
                              )}
                              {/* 2. 法律依据 */}
                              {risk.legal_basis && (
                                <p className="text-xs text-gray-500 mt-1.5">
                                  法律依据：{risk.legal_basis}
                                </p>
                              )}
                              {/* 3. 修改建议 */}
                              {risk.suggestion && (
                                <p className="text-xs text-green-700 mt-1">
                                  修改建议：{risk.suggestion}
                                </p>
                              )}
                              {/* 4. AI评语 */}
                              <div className="mt-1.5">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  risk.severity === '高风险' ? 'bg-red-100 text-red-700' :
                                  risk.severity === '中风险' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>{risk.severity}</span>
                                <span className="ml-2 text-xs text-gray-500">{risk.type}</span>
                                <p className="text-sm text-gray-600 mt-1">{risk.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    {results.risks.filter(c => c.has_risk).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">未发现明显风险</p>
                    )}
                  </div>
                </div>

                {/* Matched Rules */}
                {results.matched_rules.filter(m => m.rules.length > 0).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#1e3a5f]" />
                      匹配规则 (RAG)
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {results.matched_rules
                        .filter(m => m.rules.length > 0)
                        .map((match, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">
                              条款: {match.clause_title?.slice(0, 30)}
                            </p>
                            {match.rules.map((rule, j) => (
                              <div key={j} className="flex items-start gap-2 text-xs mt-1">
                                <Shield className="w-3 h-3 text-[#1e3a5f] mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-medium">{rule.rule}</span>
                                  <span className={`ml-1 px-1 rounded text-[10px] ${
                                    rule.level === '高' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
                                  }`}>{rule.level}风险</span>
                                  <span className="text-gray-400 ml-1">
                                    相关度: {typeof rule.score === 'number' ? (rule.score * 100).toFixed(0) + '%' : rule.score}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Matched Laws */}
                {results.matched_laws?.filter(m => m.laws.length > 0).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#1e3a5f]" />
                      相关法律法规 (RAG)
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {results.matched_laws
                        .filter(m => m.laws.length > 0)
                        .slice(0, 10)
                        .map((match, i) => (
                          <div key={i} className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">
                              风险: {match.risk_type} · 条款: {match.clause_title?.slice(0, 30)}
                            </p>
                            {match.laws.map((law, j) => (
                              <div key={j} className="text-xs mt-1">
                                <span className="font-medium text-gray-700">{law.source}</span>
                                <span className="text-[#1e3a5f] font-medium"> {law.article}</span>
                                <span className="ml-1 text-gray-400">相关度: {law.relevance}</span>
                                <p className="text-gray-500 mt-0.5">{law.content.slice(0, 150)}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>免责声明：</strong>本审查结果由 AI 自动生成，仅供法律风险参考，不构成正式法律意见。对于重大合同或涉及重大权益的事项，建议咨询专业律师进行最终审查。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadZone({ onFile, disabled, mini }: {
  onFile: (f: File) => void
  disabled: boolean
  mini?: boolean
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file && ['pdf', 'docx', 'doc'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      onFile(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files?.[0]) return
    onFile(e.target.files[0])
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className={`border-2 border-dashed rounded-xl text-center transition-colors ${
        disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed' :
        'border-[#1e3a5f]/30 hover:border-[#1e3a5f]/60 bg-blue-50/30 cursor-pointer'
      } ${mini ? 'p-4' : 'p-10'}`}
      onClick={() => !disabled && document.getElementById('file-input-review')?.click()}
    >
      <input
        id="file-input-review"
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc"
        onChange={handleChange}
        disabled={disabled}
      />
      <Upload className={`mx-auto ${mini ? 'w-6 h-6 mb-1' : 'w-10 h-10 mb-4'} ${disabled ? 'text-gray-300' : 'text-[#1e3a5f]'}`} />
      <p className={`${mini ? 'text-sm' : 'text-base'} ${disabled ? 'text-gray-400' : 'text-[#1e3a5f]'}`}>
        {mini ? '点击或拖拽上传新合同' : '拖拽文件到此处或点击上传'}
      </p>
      <p className={`${mini ? 'text-[10px]' : 'text-xs'} mt-1 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
        支持 PDF、DOCX、DOC 格式
      </p>
    </div>
  )
}
