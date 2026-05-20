import { KeyboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoginField } from './LoginField'

interface Props {
  id: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: boolean
  label: string
  describedBy?: string
}

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C5 6 19 6 22 12C19 18 5 18 2 12Z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c5 0 8.5 3 10 6a13.4 13.4 0 0 1-2.3 3.2" />
    <path d="M6.6 6.6C4.6 8 3 10 2 12c1.5 3 5 6 10 6 1.6 0 3-.3 4.3-.8" />
    <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
  </svg>
)

export function PasswordField({ id, value, onChange, onBlur, error, label, describedBy }: Props) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [capsOn, setCapsOn] = useState(false)

  // getModifierState may be absent on synthetic/IME/touch keyboard events
  // (mobile autofill paths). Optional-chain guard prevents TypeError.
  const onCapsKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as KeyboardEvent['nativeEvent'] & {
      getModifierState?: (k: string) => boolean
    }
    if (typeof native.getModifierState === 'function') {
      setCapsOn(native.getModifierState('CapsLock'))
    }
  }

  const toggle = (
    <button
      type="button"
      className="login-btn-eye"
      onClick={() => setShow(!show)}
      aria-label={show ? t('login.hidePw') : t('login.showPw')}
      aria-pressed={show}
    >
      {show ? <EyeOff /> : <EyeOpen />}
    </button>
  )

  const caps = capsOn ? (
    <div className="login-field-hint login-field-hint--warn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 8h-5v7h-6V11H4z" />
      </svg>
      {t('login.capsOn')}
    </div>
  ) : null

  return (
    <LoginField
      id={id}
      label={label}
      icon={<LockIcon />}
      type={show ? 'text' : 'password'}
      placeholder={show ? '' : '••••••••'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      required
      autoComplete="current-password"
      aria-required="true"
      aria-describedby={describedBy}
      error={error}
      rightSlot={toggle}
      hint={caps}
      onKeyDown={onCapsKey}
      onKeyUp={onCapsKey}
    />
  )
}
