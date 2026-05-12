import { InputHTMLAttributes, ReactNode, useId } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon: ReactNode
  error?: boolean
  rightSlot?: ReactNode
  hint?: ReactNode
}

export function LoginField({
  id,
  label,
  icon,
  error,
  rightSlot,
  hint,
  className,
  'aria-describedby': describedBy,
  ...input
}: Props) {
  const cls = [
    'login-input',
    rightSlot ? 'login-input--has-right' : '',
    error ? 'login-input--error' : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  const hintId = useId()
  const showHint = !!hint
  // Compose any caller-provided aria-describedby with our hint id.
  const composedDescribedBy = [describedBy, showHint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="login-field">
      <label className="login-label" htmlFor={id}>{label}</label>
      <div className="login-input-wrap">
        <span className="login-icon-left" aria-hidden="true">{icon}</span>
        <input
          id={id}
          className={cls}
          aria-invalid={error || undefined}
          aria-describedby={composedDescribedBy}
          {...input}
        />
        {rightSlot}
      </div>
      {showHint && <div id={hintId}>{hint}</div>}
    </div>
  )
}
