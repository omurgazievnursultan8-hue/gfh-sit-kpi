interface Props {
  used: number  // 0–100
}

export function WeightBar({ used }: Props) {
  const rounded = Math.min(Math.round(used * 100) / 100, 100)

  const colorClass =
    rounded > 95 ? 'bg-red-500' :
    rounded > 80 ? 'bg-yellow-400' :
    'bg-green-500'

  const textClass =
    rounded > 95 ? 'text-red-700' :
    rounded > 80 ? 'text-yellow-700' :
    'text-green-700'

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">Использовано весов</span>
        <span className={`text-sm font-bold ${textClass}`}>{rounded.toFixed(1)}% / 100%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>
      {rounded > 95 && (
        <p className="text-xs text-red-600 mt-1">
          Внимание: осталось менее 5% для новых критериев
        </p>
      )}
    </div>
  )
}
