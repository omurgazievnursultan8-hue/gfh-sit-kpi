import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ExportButtonsProps {
  periodId?: number
  type?: 'period' | 'personal'
  className?: string
}

export function ExportButtons({ periodId, type = 'period', className = '' }: ExportButtonsProps) {
  const { t } = useTranslation()

  const handleExport = (format: 'excel' | 'pdf') => {
    const baseUrl = type === 'period' && periodId
      ? `/api/v1/reports/periods/${periodId}`
      : `/api/v1/reports/personal`
    // noopener,noreferrer: blocks reverse tabnabbing on the new tab.
    window.open(baseUrl + (format === 'excel' ? '/excel' : '/pdf'), '_blank', 'noopener,noreferrer')
  }

  const excelLabel = t('common.exportExcel', 'Экспорт в Excel') as string
  const pdfLabel = t('common.exportPdf', 'Экспорт в PDF') as string

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => handleExport('excel')}
        title={excelLabel}
        aria-label={excelLabel}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-500 text-green-700 rounded-md hover:bg-green-50 transition-colors"
      >
        <Download size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Excel</span>
      </button>
      <button
        type="button"
        onClick={() => handleExport('pdf')}
        title={pdfLabel}
        aria-label={pdfLabel}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-500 text-red-700 rounded-md hover:bg-red-50 transition-colors"
      >
        <Download size={14} aria-hidden="true" />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  )
}
