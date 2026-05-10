import { useEffect, useState, useRef } from 'react'
import { Paperclip, Trash2, Download } from 'lucide-react'
import api from '../../../app/api'

interface EvaluationFile {
  id: number
  originalName: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}

export function FileUploadSection({ evaluationId }: { evaluationId: number }) {
  const [files, setFiles] = useState<EvaluationFile[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFiles = () =>
    api.get<EvaluationFile[]>(`/evaluations/${evaluationId}/files`)
      .then(r => setFiles(r.data))
      .catch(() => {})

  useEffect(() => { loadFiles() }, [evaluationId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      await api.post(`/evaluations/${evaluationId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadFiles()
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка загрузки файла')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (fileId: number) => {
    await api.delete(`/evaluations/${evaluationId}/files/${fileId}`)
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800">Прикреплённые файлы</h3>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50">
          <Paperclip size={14} />
          {uploading ? 'Загрузка...' : 'Прикрепить файл'}
        </button>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          onChange={handleUpload} />
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-gray-400">Файлы не прикреплены</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Paperclip size={12} className="text-gray-400" />
                {f.originalName}
                <span className="text-xs text-gray-400">({formatSize(f.fileSize)})</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/v1/evaluations/${evaluationId}/files/${f.id}`}
                  className="p-1 text-gray-400 hover:text-blue-600" title="Скачать">
                  <Download size={14} />
                </a>
                <button onClick={() => handleDelete(f.id)}
                  className="p-1 text-gray-400 hover:text-red-600" title="Удалить">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
