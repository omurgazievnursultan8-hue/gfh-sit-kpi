import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import { LoginPage } from './features/auth/LoginPage'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { PdpaConsentPage } from './features/auth/PdpaConsentPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { UsersPage } from './features/users/UsersPage'
import { OrgPage } from './features/org/OrgPage'
import { DelegationsPage } from './features/org/DelegationsPage'
import { CriteriaPage } from './features/criteria/CriteriaPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { EvaluationFormPage } from './features/evaluations/EvaluationFormPage'
import { MyTasksPage } from './features/evaluations/MyTasksPage'
import { MyEvaluationsPage } from './features/evaluations/MyEvaluationsPage'
import { EvaluationDetailPage } from './features/evaluations/EvaluationDetailPage'
import { AppealPage } from './features/appeals/AppealPage'

export default function App() {
  useIdleTimeout()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pdpa-consent" element={<ProtectedRoute><PdpaConsentPage /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
      <Route path="/org" element={<ProtectedRoute allowedRoles={['ADMIN']}><OrgPage /></ProtectedRoute>} />
      <Route path="/org/delegations" element={<ProtectedRoute allowedRoles={['ADMIN']}><DelegationsPage /></ProtectedRoute>} />
      <Route path="/criteria" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT']}>
          <CriteriaPage />
        </ProtectedRoute>
      } />
      <Route path="/my-tasks" element={
        <ProtectedRoute allowedRoles={['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <MyTasksPage />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/:id" element={
        <ProtectedRoute allowedRoles={['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <EvaluationFormPage />
        </ProtectedRoute>
      } />
      <Route path="/my-evaluations" element={<ProtectedRoute><MyEvaluationsPage /></ProtectedRoute>} />
      <Route path="/my-evaluations/:id" element={<ProtectedRoute><EvaluationDetailPage /></ProtectedRoute>} />
      <Route path="/appeals/new" element={<ProtectedRoute><AppealPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={['ADMIN']}><CalendarPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
