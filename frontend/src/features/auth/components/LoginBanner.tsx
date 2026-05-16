import { ReactNode } from 'react'

interface Props {
  variant: 'error' | 'success'
  title: string
  body: ReactNode
  id?: string
}

export function LoginBanner({ variant, title, body, id }: Props) {
  const role = variant === 'error' ? 'alert' : 'status'
  const cls = `login-banner login-banner--${variant}`
  const iconStyle = { flexShrink: 0, marginTop: 1 } as const

  return (
    <div className={cls} role={role} id={id}>
      {variant === 'error' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
          <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
        </svg>
      )}
      <div>
        <strong>{title}</strong>
        {variant === 'error' ? ' ' : <br />}
        {body}
      </div>
    </div>
  )
}
