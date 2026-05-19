import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login } from '../authSlice'
import { AppDispatch } from '../../../app/store'

/**
 * DEV-ONLY quick-login bar. Lets testers jump into a vertical org slice
 * (chairman → block → department → unit → employee) + admin without typing
 * credentials. Remove this component and its usage in LoginPage once
 * testing is done.
 */

type Shortcut = { label: string; email: string; password: string }

const SHORTCUTS: Shortcut[] = [
  { label: 'Chairman', email: 'almaz.usenov@gfh.kg', password: 'Test123!@#' },
  { label: 'Head of block', email: 'chyngyz.satylganov@gfh.kg', password: 'Test123!@#' },
  { label: 'Head of department', email: 'mikhail.sokolov@gfh.kg', password: 'Test123!@#' },
  { label: 'Head of unit', email: 'dmitry.petrov@gfh.kg', password: 'Test123!@#' },
  { label: 'Employee', email: 'bekbolot.tursunaliev@gfh.kg', password: 'Test123!@#' },
  { label: 'Admin', email: 'admin@gfh.kg', password: 'Admin123!@#' },
]

export function DevLoginShortcuts() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const quickLogin = async (s: Shortcut) => {
    const result = await dispatch(login({ email: s.email, password: s.password }))
    if (login.fulfilled.match(result)) {
      const { passwordExpired, pdpaRequired } = result.payload
      if (passwordExpired) navigate('/change-password')
      else if (pdpaRequired) navigate('/pdpa-consent')
      else navigate('/dashboard')
    }
  }

  return (
    <div className="dev-login-shortcuts" aria-label="Dev quick login">
      <span className="dev-login-shortcuts__tag">DEV</span>
      {SHORTCUTS.map((s) => (
        <button
          key={s.email}
          type="button"
          className="dev-login-shortcuts__btn"
          onClick={() => quickLogin(s)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
