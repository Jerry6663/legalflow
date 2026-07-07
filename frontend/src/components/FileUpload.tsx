import { useState, useRef, useCallback } from 'react'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { uploadContract } from '../lib/api'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png']
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

interface FileUploadProps {
  onUploadStart?: () => void
  onUploadComplete?: (data: any) => void
  onUploadError?: (error: Error) => void
}

export default function FileUpload({ onUploadStart, onUploadComplete, onUploadError }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `不支持的文件格式：${ext}。支持的格式：PDF, DOCX, DOC, JPG, PNG`
    }
    if (f.size > MAX_SIZE) {
      return '文件大小超过 20MB 限制'
    }
    return null
  }

  const handleFile = useCallback((f: File) => {
    setError(null)
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const removeFile = () => {
    setFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    onUploadStart?.()
    try {
      const data = await uploadContract(file)
      onUploadComplete?.(data)
    } catch (err: any) {
      const msg = err.message || '上传失败，请重试'
      setError(msg)
      onUploadError?.(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#1e3a5f] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <File className="w-8 h-8 text-[#1e3a5f]" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              <span className="text-[#1e3a5f] font-medium">点击上传</span> 或将文件拖拽到此处
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 PDF、DOCX、DOC、JPG、PNG 格式
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {file && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full bg-[#1e3a5f] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          上传并审查
        </button>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="w-full bg-gray-100 text-gray-600 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在上传...
        </div>
      )}
    </div>
  )
}
