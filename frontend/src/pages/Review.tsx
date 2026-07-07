import { useState } from 'react'
import { Upload, FileText, Loader2 } from 'lucide-react'
import FileUpload from '../components/FileUpload'

interface ReviewResult {
  summary?: string
  issues?: Array<{
    severity: 'high' | 'medium' | 'low'
    clause: string
    description: string
    suggestion: string
  }>
  score?: number
}

export default function Review() {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<ReviewResult | null>(null)

  const handleUploadComplete = (data: ReviewResult) => {
    setResults(data)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">合同审查</h1>
        <p className="text-gray-600 mt-2">
          上传您的合同文件，AI 将自动进行智能审查并返回详细结果
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Left Column - Upload */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#1e3a5f]" />
              上传合同文件
            </h2>
            <FileUpload
              onUploadStart={() => setUploading(true)}
              onUploadComplete={handleUploadComplete}
              onUploadError={(err) => {
                setUploading(false)
                alert(err.message)
              }}
            />
          </div>

          {/* Supported Formats */}
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">支持的文件格式</h3>
            <div className="flex flex-wrap gap-2">
              {['PDF', 'DOCX', 'DOC', 'JPG', 'PNG'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-3 py-1 bg-blue-50 text-[#1e3a5f] text-xs font-medium rounded-full"
                >
                  {fmt}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">单个文件大小不超过 20MB</p>
          </div>
        </div>

        {/* Right Column - Results */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1e3a5f]" />
              审查结果
            </h2>

            {uploading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f] mb-3" />
                <p>正在分析合同，请稍候...</p>
              </div>
            )}

            {!uploading && !results && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText className="w-16 h-16 mb-4 stroke-1" />
                <p className="text-lg font-medium text-gray-500">等待上传</p>
                <p className="text-sm mt-1">上传合同文件后，审查结果将在此显示</p>
              </div>
            )}

            {!uploading && results && (
              <div className="space-y-6">
                {/* Score */}
                {results.score !== undefined && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">合同评分</span>
                    <span className={`text-2xl font-bold ${
                      results.score >= 80 ? 'text-green-600' :
                      results.score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {results.score}/100
                    </span>
                  </div>
                )}

                {/* Summary */}
                {results.summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">审查摘要</h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">
                      {results.summary}
                    </p>
                  </div>
                )}

                {/* Issues */}
                {results.issues && results.issues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      发现问题 ({results.issues.length})
                    </h3>
                    <div className="space-y-3">
                      {results.issues.map((issue, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {issue.clause}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              issue.severity === 'high'
                                ? 'bg-red-100 text-red-700'
                                : issue.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {issue.severity === 'high' ? '高风险' :
                               issue.severity === 'medium' ? '中风险' : '低风险'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
                            建议：{issue.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
