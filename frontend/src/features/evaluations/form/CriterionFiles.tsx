import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { evaluationsApi, EvaluationFile } from '../evaluationsApi'

interface Props {
  evaluationId: number
  criteriaId: number
  files: EvaluationFile[]
  onAttach: (f: EvaluationFile) => void
  onRemove: (fileId: number) => void
}

const fmtSize = (b: number): string => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

export function CriterionFiles({ evaluationId, criteriaId, files, onAttach, onRemove }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const scoped = files.filter(f => f.criteriaId === criteriaId)

  const upload = async (file: File) => {
    try {
      const saved = await evaluationsApi.uploadFile(evaluationId, file, criteriaId)
      onAttach(saved)
    } catch (e) {
      console.error('upload failed', e)
    }
  }

  return (
    <div className="efm-field">
      <label className="efm-flabel">{t('evaluation.form.filesLabel')}</label>
      <div
        className={`efm-files-drop ${drag ? 'is-drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault(); setDrag(false)
          for (const f of Array.from(e.dataTransfer.files)) upload(f)
        }}
      >
        {t('evaluation.form.filesDrop')}
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={e => {
            for (const f of Array.from(e.target.files ?? [])) upload(f)
            e.target.value = ''
          }}
        />
      </div>
      {scoped.map(f => (
        <div key={f.id} className="efm-file-row">
          <span>· {f.originalName}</span>
          <span style={{ color: 'var(--dv3-text4)' }}>{fmtSize(f.fileSize)}</span>
          <button
            type="button"
            className="efm-file-del"
            aria-label={`удалить ${f.originalName}`}
            onClick={async () => {
              try {
                await evaluationsApi.deleteFile(evaluationId, f.id)
                onRemove(f.id)
              } catch (e) {
                console.error('delete failed', e)
              }
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
