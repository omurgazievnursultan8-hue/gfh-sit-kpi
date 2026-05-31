import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { ProtectedRoute } from '@/app/routes/ProtectedRoute'
import { ThemeCustomizer } from '@/app/providers/ThemeCustomizer'
import { useIdleTimeout } from '@/shared/hooks/useIdleTimeout'
import { useNotifications } from '@/features/notifications'
import type { AppDispatch } from './app/store'
import { bootstrapAuth, LoginPage, ChangePasswordPage, ForgotPasswordPage, ResetPasswordPage, PdpaConsentPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { UsersPage, UserDetailPage } from '@/features/users'
import { CriteriaPage } from '@/features/criteria'
import { OrgPage, OrgUnitDetailPage, DelegationsPage } from '@/features/org'
import { SettingsPage } from '@/features/settings'
import { CalendarPage } from '@/features/calendar'
import { EvaluationFormPage, MyTasksPage, EvaluationsPage, EvaluationDetailPage } from '@/features/evaluations'
import { AppealPage } from '@/features/appeals'
import { NotificationsPage } from '@/features/notifications'
import { PersonalDashboardPage, ManagerDashboardPage, HierarchicalAnalyticsPage, AntiBonusAnalyticsPage } from '@/features/analytics'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { AdminDashboardPage, AuditLogPage, AdminMonitoringPage, AdminEvaluationsPage, AdminAppealsPage } from '@/features/admin'
import { PeriodsPage } from '@/features/periods'

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => { dispatch(bootstrapAuth()) }, [dispatch])
  useIdleTimeout()
  useNotifications()
  return (
    <>
    <ThemeCustomizer />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pdpa-consent" element={<ProtectedRoute><PdpaConsentPage /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard-v2" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard-v3" element={<Navigate to="/dashboard" replace />} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
      <Route path="/users/:id" element={<ProtectedRoute allowedRoles={['ADMIN']}><UserDetailPage /></ProtectedRoute>} />
      <Route path="/users-v2" element={<Navigate to="/users" replace />} />
      <Route path="/criteria-v2" element={<Navigate to="/criteria" replace />} />
      <Route path="/org" element={<ProtectedRoute allowedRoles={['ADMIN']}><OrgPage /></ProtectedRoute>} />
      <Route path="/org/delegations" element={<ProtectedRoute allowedRoles={['ADMIN']}><DelegationsPage /></ProtectedRoute>} />
      <Route path="/org/:id" element={<ProtectedRoute allowedRoles={['ADMIN']}><OrgUnitDetailPage /></ProtectedRoute>} />
      <Route path="/criteria" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'ORG_HEAD']}>
          <CriteriaPage />
        </ProtectedRoute>
      } />
      <Route path="/my-tasks" element={
        <ProtectedRoute allowedRoles={['ORG_HEAD', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <MyTasksPage />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/:id" element={
        <ProtectedRoute allowedRoles={['ORG_HEAD', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <EvaluationFormPage />
        </ProtectedRoute>
      } />
      <Route path="/evaluations" element={
        <ProtectedRoute allowedRoles={['ORG_HEAD', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <EvaluationsPage defaultMode="given" />
        </ProtectedRoute>
      } />
      <Route path="/my-evaluations" element={<ProtectedRoute><EvaluationsPage defaultMode="received" /></ProtectedRoute>} />
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
        <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'ORG_HEAD']}>
          <AntiBonusAnalyticsPage />
        </ProtectedRoute>
      } />
      <Route path="/manager-dashboard" element={
        <ProtectedRoute allowedRoles={['ORG_HEAD', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
          <ManagerDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/manager-tasks" element={<Navigate to="/my-tasks" replace />} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={['ADMIN']}><CalendarPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="org" element={<OrgPage />} />
        <Route path="org/:id" element={<OrgUnitDetailPage />} />
        <Route path="delegations" element={<DelegationsPage />} />
        <Route path="criteria" element={<CriteriaPage />} />
        <Route path="periods" element={<PeriodsPage />} />
        <Route path="evaluations" element={<AdminEvaluationsPage />} />
        <Route path="appeals" element={<AdminAppealsPage />} />
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
    </>
  )
}
