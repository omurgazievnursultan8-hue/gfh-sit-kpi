import { Download } from 'lucide-react'

interface ExportButtonsProps {
  periodId?: number
  type?: 'period' | 'personal'
  className?: string
}

export function ExportButtons({ periodId, type = 'period', className = '' }: ExportButtonsProps) {
  const handleExport = (format: 'excel' | 'pdf') => {
    const baseUrl = type === 'period' && periodId
      ? `/api/v1/reports/periods/${periodId}`
      : `/api/v1/reports/personal`
    window.open(baseUrl + (format === 'excel' ? '/excel' : '/pdf'), '_blank')
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={() => handleExport('excel')}
        title="Экспорт в Excel"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-500 text-green-700 rounded-md hover:bg-green-50 transition-colors"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Excel</span>
      </button>
      <button
        onClick={() => handleExport('pdf')}
        title="Экспорт в PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-500 text-red-700 rounded-md hover:bg-red-50 transition-colors"
      >
        <Download size={14} />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  )
}
