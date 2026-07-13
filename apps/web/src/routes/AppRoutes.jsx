// src/routes/AppRoutes.jsx
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../guards/ProtectedRoute';
import { RoleGuard } from '../guards/RoleGuard';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import LoadingSkeleton from '../components/design-system/LoadingSkeleton';

const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const TicketListPage = lazy(() => import('../pages/tickets/TicketListPage').then((m) => ({ default: m.TicketListPage })));
const CreateTicketPage = lazy(() => import('../pages/tickets/CreateTicketPage').then((m) => ({ default: m.CreateTicketPage })));
const TicketDetailPage = lazy(() => import('../pages/tickets/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })));
const ResolutionResultPage = lazy(() => import('../pages/tickets/ResolutionResultPage').then((m) => ({ default: m.ResolutionResultPage })));
const ReworkCenterPage = lazy(() => import('../pages/tickets/ReworkCenterPage').then((m) => ({ default: m.ReworkCenterPage })));
const ClosedFeedbackArchivePage = lazy(() => import('../pages/tickets/ClosedFeedbackArchivePage').then((m) => ({ default: m.ClosedFeedbackArchivePage })));
const CommunityFeedPage = lazy(() => import('../pages/community/CommunityFeedPage').then((m) => ({ default: m.CommunityFeedPage })));
const CommunityFeedbackDetailPage = lazy(() => import('../pages/community/CommunityFeedbackDetailPage').then((m) => ({ default: m.CommunityFeedbackDetailPage })));
const CommunityMapPage = lazy(() => import('../pages/community/CommunityMapPage').then((m) => ({ default: m.CommunityMapPage })));
const NotificationCenterPage = lazy(() => import('../pages/notifications/NotificationCenterPage').then((m) => ({ default: m.NotificationCenterPage })));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const AIReviewDetail = lazy(() => import('../pages/tickets/AIReviewDetail').then((m) => ({ default: m.AIReviewDetail })));
const DuplicateDetection = lazy(() => import('../pages/tickets/DuplicateDetection').then((m) => ({ default: m.DuplicateDetection })));
const TicketAssignment = lazy(() => import('../pages/tickets/TicketAssignment').then((m) => ({ default: m.TicketAssignment })));
const CompletedTicketReview = lazy(() => import('../pages/tickets/CompletedTicketReview').then((m) => ({ default: m.CompletedTicketReview })));
const ManagementFeedbackListPage = lazy(() => import('../pages/staff/ManagementFeedbackListPage').then((m) => ({ default: m.default })));
const ManagementFeedbackDetailPage = lazy(() => import('../pages/staff/ManagementFeedbackDetailPage').then((m) => ({ default: m.ManagementFeedbackDetailPage })));
const RequestInfoWorkspacePage = lazy(() => import('../pages/staff/RequestInfoWorkspacePage').then((m) => ({ default: m.RequestInfoWorkspacePage })));
const AssignmentHistoryPage = lazy(() => import('../pages/staff/AssignmentHistoryPage').then((m) => ({ default: m.AssignmentHistoryPage })));
const ResolutionReviewComparisonPage = lazy(() => import('../pages/staff/ResolutionReviewComparisonPage').then((m) => ({ default: m.ResolutionReviewComparisonPage })));
const ProviderReportWorkspacePage = lazy(() => import('../pages/staff/ProviderReportWorkspacePage').then((m) => ({ default: m.ProviderReportWorkspacePage })));

const HelperWorkspacePage = lazy(() => import('../pages/community/HelperWorkspacePage').then((m) => ({ default: m.HelperWorkspacePage })));

const SLAAnalytics = lazy(() => import('../pages/analytics/SLAAnalytics').then((m) => ({ default: m.SLAAnalytics })));
const SentimentDashboard = lazy(() => import('../pages/analytics/SentimentDashboard').then((m) => ({ default: m.SentimentDashboard })));
const HeatmapDashboard = lazy(() => import('../pages/analytics/HeatmapDashboard').then((m) => ({ default: m.HeatmapDashboard })));
const AboutPage = lazy(() => import('../pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const InteractionHistoryMonitoring = lazy(() => import('../pages/analytics/InteractionHistoryMonitoring').then((m) => ({ default: m.InteractionHistoryMonitoring })));
const InteractionApprovalInboxPage = lazy(() => import('../pages/manager/InteractionApprovalInboxPage').then((m) => ({ default: m.InteractionApprovalInboxPage })));
const InteractionApprovalDetailPage = lazy(() => import('../pages/manager/InteractionApprovalDetailPage').then((m) => ({ default: m.InteractionApprovalDetailPage })));

const UserManagement = lazy(() => import('../pages/management/UserManagement').then((m) => ({ default: m.UserManagement })));
const FeedbackManagement = lazy(() => import('../pages/management/FeedbackManagement').then((m) => ({ default: m.FeedbackManagement })));
const CategoryManagement = lazy(() => import('../pages/management/CategoryManagement').then((m) => ({ default: m.CategoryManagement })));
const SLAConfiguration = lazy(() => import('../pages/management/SLAConfiguration').then((m) => ({ default: m.SLAConfiguration })));
const IntegrationSettings = lazy(() => import('../pages/management/IntegrationSettings').then((m) => ({ default: m.IntegrationSettings })));
const AuditLog = lazy(() => import('../pages/admin/AuditLog').then((m) => ({ default: m.AuditLog })));
const StaffAuditTrailPage = lazy(() => import('../pages/staff/StaffAuditTrailPage').then((m) => ({ default: m.StaffAuditTrailPage })));
const PerformanceDashboard = lazy(() => import('../pages/admin/PerformanceDashboard').then((m) => ({ default: m.PerformanceDashboard })));

const RouteFallback = () => (
  <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
    <div className="w-full max-w-4xl space-y-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="h-6 w-1/3 rounded-full bg-slate-100 animate-pulse" />
      <LoadingSkeleton rows={5} className="space-y-3" />
    </div>
  </div>
);

export const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();
  const authRedirect = user?.isVerified ? '/dashboard' : '/verify-email';

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      {/* Public Pages */}
      <Route path="/" element={isAuthenticated ? <Navigate to={authRedirect} replace /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={authRedirect} replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={isAuthenticated ? <VerifyEmailPage /> : <Navigate to="/login" replace />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Protected Pages (All Auth Roles) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/tickets" element={
        <ProtectedRoute>
          <DashboardLayout>
            <TicketListPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/tickets/create" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SERVICE_USER]}>
            <DashboardLayout>
              <CreateTicketPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/tickets/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <TicketDetailPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/tickets/:feedbackId/result" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SERVICE_USER]}>
            <DashboardLayout>
              <ResolutionResultPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/tickets/:feedbackId/rework" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SERVICE_USER]}>
            <DashboardLayout>
              <ReworkCenterPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/tickets/archive" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SERVICE_USER]}>
            <DashboardLayout>
              <ClosedFeedbackArchivePage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/community/feed" element={
          <DashboardLayout>
            <CommunityFeedPage />
          </DashboardLayout>
      } />
      <Route path="/community/feed/:id" element={
          <DashboardLayout>
            <CommunityFeedbackDetailPage />
          </DashboardLayout>
      } />
      <Route path="/community/map" element={
        <ProtectedRoute>
          <DashboardLayout>
            <CommunityMapPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <DashboardLayout>
            <NotificationCenterPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <DashboardLayout>
            <ProfilePage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* System Staff Routes */}
      <Route path="/staff/queue" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <AIReviewDetail />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/feedbacks" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <ManagementFeedbackListPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/feedbacks/:feedbackId" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <ManagementFeedbackDetailPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/feedbacks/:feedbackId/request-info" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <RequestInfoWorkspacePage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/feedbacks/:feedbackId/history" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <AssignmentHistoryPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/provider-reports/:providerReportId" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <ProviderReportWorkspacePage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/audit" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <StaffAuditTrailPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/review/:feedbackId/compare" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <ResolutionReviewComparisonPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/duplicates" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <DuplicateDetection />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/staff/review" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <CompletedTicketReview />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/tickets/assign/:id" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
            <DashboardLayout>
              <TicketAssignment />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />

      {/* Service Provider (Operator) Routes */}
      <Route path="/provider/tasks" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.SERVICE_PROVIDER]}>
            <DashboardLayout>
              <HelperWorkspacePage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />

      {/* Interaction Manager Routes */}
      <Route path="/manager/interactions" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.INTERACTION_MANAGER]}>
            <DashboardLayout>
              <InteractionHistoryMonitoring />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/manager/approvals" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.INTERACTION_MANAGER, APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <InteractionApprovalInboxPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/manager/approvals/:feedbackId" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.INTERACTION_MANAGER, APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <InteractionApprovalDetailPage />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/analytics/sla" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.INTERACTION_MANAGER, APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <SLAAnalytics />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/analytics/sentiment" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.INTERACTION_MANAGER, APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <SentimentDashboard />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/analytics/heatmap" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.INTERACTION_MANAGER, APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <HeatmapDashboard />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />

      {/* Administrator Configuration Routes */}
      <Route path="/management/users" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <UserManagement />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/management/feedbacks" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <FeedbackManagement />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/management/categories" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <CategoryManagement />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/management/sla" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <SLAConfiguration />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/management/integrations" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <IntegrationSettings />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <AuditLog />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/performance" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={[APP_ROLES.ADMINISTRATOR]}>
            <DashboardLayout>
              <PerformanceDashboard />
            </DashboardLayout>
          </RoleGuard>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
  );
};


