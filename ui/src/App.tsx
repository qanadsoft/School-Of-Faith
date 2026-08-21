import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const WatchPage = lazy(() => import('@/pages/WatchPage').then((m) => ({ default: m.WatchPage })));
const LearnPage = lazy(() => import('@/pages/LearnPage').then((m) => ({ default: m.LearnPage })));
const PrayerPage = lazy(() => import('@/pages/PrayerPage').then((m) => ({ default: m.PrayerPage })));
const GivePage = lazy(() => import('@/pages/GivePage').then((m) => ({ default: m.GivePage })));
const CampaignDonationPage = lazy(() => import('@/pages/CampaignDonationPage').then((m) => ({ default: m.CampaignDonationPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const CommunityPage = lazy(() => import('@/pages/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const MemberCoursesPage = lazy(() => import('@/pages/member/MemberCoursesPage').then((m) => ({ default: m.MemberCoursesPage })));
const MemberCertificatesPage = lazy(() => import('@/pages/member/MemberCertificatesPage').then((m) => ({ default: m.MemberCertificatesPage })));
const MemberSavedMessagesPage = lazy(() => import('@/pages/member/MemberSavedMessagesPage').then((m) => ({ default: m.MemberSavedMessagesPage })));
const MemberDownloadsPage = lazy(() => import('@/pages/member/MemberDownloadsPage').then((m) => ({ default: m.MemberDownloadsPage })));
const MemberGivingHistoryPage = lazy(() => import('@/pages/member/MemberGivingHistoryPage').then((m) => ({ default: m.MemberGivingHistoryPage })));
const MemberPrayerRequestsPage = lazy(() => import('@/pages/member/MemberPrayerRequestsPage').then((m) => ({ default: m.MemberPrayerRequestsPage })));
const MemberEventTicketsPage = lazy(() => import('@/pages/member/MemberEventTicketsPage').then((m) => ({ default: m.MemberEventTicketsPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminMembersPage = lazy(() => import('@/pages/admin/AdminMembersPage').then((m) => ({ default: m.AdminMembersPage })));
const AdminCommunityPage = lazy(() => import('@/pages/admin/AdminCommunityPage').then((m) => ({ default: m.AdminCommunityPage })));
const AdminMemberDetailPage = lazy(() => import('@/pages/admin/AdminMemberDetailPage').then((m) => ({ default: m.AdminMemberDetailPage })));
const AdminCoursesPage = lazy(() => import('@/pages/admin/AdminCoursesPage').then((m) => ({ default: m.AdminCoursesPage })));
const AdminWatchHistoryPage = lazy(() => import('@/pages/admin/AdminWatchHistoryPage').then((m) => ({ default: m.AdminWatchHistoryPage })));
const AdminEventsPage = lazy(() => import('@/pages/admin/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage })));
const AdminCertificatesPage = lazy(() => import('@/pages/admin/AdminCertificatesPage').then((m) => ({ default: m.AdminCertificatesPage })));
const AdminReadingPlansPage = lazy(() => import('@/pages/admin/AdminReadingPlansPage').then((m) => ({ default: m.AdminReadingPlansPage })));
const AdminMessagesPage = lazy(() => import('@/pages/admin/AdminMessagesPage').then((m) => ({ default: m.AdminMessagesPage })));
const AdminDownloadsPage = lazy(() => import('@/pages/admin/AdminDownloadsPage').then((m) => ({ default: m.AdminDownloadsPage })));
const AdminDonationsPage = lazy(() => import('@/pages/admin/AdminDonationsPage').then((m) => ({ default: m.AdminDonationsPage })));
const AdminPrayerRequestsPage = lazy(() => import('@/pages/admin/AdminPrayerRequestsPage').then((m) => ({ default: m.AdminPrayerRequestsPage })));
const AdminTicketsPage = lazy(() => import('@/pages/admin/AdminTicketsPage').then((m) => ({ default: m.AdminTicketsPage })));
const AdminTagsPage = lazy(() => import('@/pages/admin/AdminTagsPage').then((m) => ({ default: m.AdminTagsPage })));

function PageFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}

function MemberRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/members" element={<ProtectedRoute adminOnly><AdminMembersPage /></ProtectedRoute>} />
          <Route path="/admin/members/:id" element={<ProtectedRoute adminOnly><AdminMemberDetailPage /></ProtectedRoute>} />
          <Route path="/admin/community" element={<ProtectedRoute adminOnly><AdminCommunityPage /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute adminOnly><AdminCoursesPage /></ProtectedRoute>} />
          <Route path="/admin/watch-history" element={<ProtectedRoute adminOnly><AdminWatchHistoryPage /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute adminOnly><AdminEventsPage /></ProtectedRoute>} />
          <Route path="/admin/certificates" element={<ProtectedRoute adminOnly><AdminCertificatesPage /></ProtectedRoute>} />
          <Route path="/admin/reading-plans" element={<ProtectedRoute adminOnly><AdminReadingPlansPage /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute adminOnly><AdminMessagesPage /></ProtectedRoute>} />
          <Route path="/admin/downloads" element={<ProtectedRoute adminOnly><AdminDownloadsPage /></ProtectedRoute>} />
          <Route path="/admin/donations" element={<ProtectedRoute adminOnly><AdminDonationsPage /></ProtectedRoute>} />
          <Route path="/admin/prayer-requests" element={<ProtectedRoute adminOnly><AdminPrayerRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/tickets" element={<ProtectedRoute adminOnly><AdminTicketsPage /></ProtectedRoute>} />
          <Route path="/admin/tags" element={<ProtectedRoute adminOnly><AdminTagsPage /></ProtectedRoute>} />

          <Route path="/community" element={<MemberRoute><Layout><CommunityPage /></Layout></MemberRoute>} />
          <Route path="/profile" element={<MemberRoute><Layout><ProfilePage /></Layout></MemberRoute>} />
          <Route path="/member/courses" element={<MemberRoute><Layout><MemberCoursesPage /></Layout></MemberRoute>} />
          <Route path="/member/certificates" element={<MemberRoute><Layout><MemberCertificatesPage /></Layout></MemberRoute>} />
          <Route path="/member/saved-messages" element={<MemberRoute><Layout><MemberSavedMessagesPage /></Layout></MemberRoute>} />
          <Route path="/member/downloads" element={<MemberRoute><Layout><MemberDownloadsPage /></Layout></MemberRoute>} />
          <Route path="/member/giving-history" element={<MemberRoute><Layout><MemberGivingHistoryPage /></Layout></MemberRoute>} />
          <Route path="/member/prayer-requests" element={<MemberRoute><Layout><MemberPrayerRequestsPage /></Layout></MemberRoute>} />
          <Route path="/member/event-tickets" element={<MemberRoute><Layout><MemberEventTicketsPage /></Layout></MemberRoute>} />

          <Route path="/" element={<PublicRoute><Layout><HomePage /></Layout></PublicRoute>} />
          <Route path="/watch" element={<PublicRoute><Layout><WatchPage /></Layout></PublicRoute>} />
          <Route path="/learn" element={<PublicRoute><Layout><LearnPage /></Layout></PublicRoute>} />
          <Route path="/prayer" element={<PublicRoute><Layout><PrayerPage /></Layout></PublicRoute>} />
          <Route path="/give" element={<PublicRoute><Layout><GivePage /></Layout></PublicRoute>} />
          <Route path="/give/campaign/:id" element={<PublicRoute><Layout><CampaignDonationPage /></Layout></PublicRoute>} />
          <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
