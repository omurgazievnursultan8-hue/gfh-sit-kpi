import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import { useNotifications } from './hooks/useNotifications'
import { bootstrapAuth } from './features/auth/authSlice'
import type { AppDispatch } from './app/store'
import { LoginPage } from './features/auth/LoginPage'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { PdpaConsentPage } from './features/auth/PdpaConsentPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { UsersPage } from './features/users/UsersPage'
import { UsersPageV2 } from './features/users/UsersPageV2'
import { CriteriaPageV2 } from './features/criteria/CriteriaPageV2'
import { OrgPage } from './features/org/OrgPage'
import { DelegationsPage } from './features/org/DelegationsPage'
import { CriteriaPage } from './features/criteria/CriteriaPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { EvaluationFormPage } from './features/evaluations/EvaluationFormPage'
import { MyTasksPage } from './features/evaluations/MyTasksPage'
import { MyEvaluationsPage } from './features/evaluations/MyEvaluationsPage'
import { EvaluatorEvaluationsPage } from './features/evaluations/EvaluatorEvaluationsPage'
import { EvaluationDetailPage } from './features/evaluations/EvaluationDetailPage'
import { AppealPage } from './features/appeals/AppealPage'
import { NotificationsPage } from './features/notifications/NotificationsPage'
import { PersonalDashboardPage } from './features/analytics/PersonalDashboardPage'
import { ManagerDashboardPage } from './features/analytics/ManagerDashboardPage'
import { HierarchicalAnalyticsPage } from './features/analytics/HierarchicalAnalyticsPage'
import { AntiBonusAnalyticsPage } from './features/analytics/AntiBonusAnalyticsPage'
import { AdminLayout } from './features/admin/AdminLayout'
import { AdminDashboardPage } from './features/admin/AdminDashboardPage'
import { AuditLogPage } from './features/admin/AuditLogPage'
import { AdminMonitoringPage } from './features/admin/AdminMonitoringPage'
import { PeriodsPage } from './features/periods/PeriodsPage'

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => { dispatch(bootstrapAuth()) }, [dispatch])
  useIdleTimeout()
  useNotifications()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pdpa-consent" element={<ProtectedRoute><PdpaConsentPage /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
      <Route path="/users-v2" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPageV2 /></ProtectedRoute>} />
      <Route path="/criteria-v2" element={<ProtectedRoute allowedRoles={['ADMIN']}><CriteriaPageV2 /></ProtectedRoute>} />
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
      <Route path="/evaluations" element={
        <ProtectedRoute allowedRoles={['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <EvaluatorEvaluationsPage />
        </ProtectedRoute>
      } />
      <Route path="/my-evaluations" element={<ProtectedRoute><MyEvaluationsPage /></ProtectedRoute>} />
      <Route path="/my-evaluations/:id" element={<ProtectedRoute><EvaluationDetailPage /></ProtectedRoute>} />
      <Route path="/appeals/new" element={<ProtectedRoute><AppealPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/my-kpi" element={<ProtectedRoute><PersonalDashboardPage /></ProtectedRoute>} />
      <Route path="/analytics/hierarchical" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN']}>
          <HierarchicalAnalyticsPage />
        </ProtectedRoute>
      } />
      <Route path="/analytics/anti-bonus" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT']}>
          <AntiBonusAnalyticsPage />
        </ProtectedRoute>
      } />
      <Route path="/manager-dashboard" element={
        <ProtectedRoute allowedRoles={['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <ManagerDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/manager-tasks" element={<Navigate to="/my-tasks" replace />} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={['ADMIN']}><CalendarPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="org" element={<OrgPage />} />
        <Route path="delegations" element={<DelegationsPage />} />
        <Route path="criteria" element={<CriteriaPage />} />
        <Route path="periods" element={<PeriodsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* 404 catch-all — unknown paths return user to dashboard (ProtectedRoute
          forwards anons to /login). Prevents blank page on broken/stale links. */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
