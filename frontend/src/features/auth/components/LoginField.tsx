import { InputHTMLAttributes, ReactNode } from 'react'

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
  ...input
}: Props) {
  const cls = [
    'login-input',
    rightSlot ? 'login-input--has-right' : '',
    error ? 'login-input--error' : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div className="login-field">
      <label className="login-label" htmlFor={id}>{label}</label>
      <div className="login-input-wrap">
        <span className="login-icon-left" aria-hidden="true">{icon}</span>
        <input id={id} className={cls} {...input} />
        {rightSlot}
      </div>
      {hint}
    </div>
  )
}
