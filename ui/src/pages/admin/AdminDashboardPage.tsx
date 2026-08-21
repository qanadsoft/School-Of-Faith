import { useEffect, useState } from 'react';
import { Users, BookOpen, Clock, Calendar, Award, CreditCard, Heart, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ActivityList } from '@/components/admin/ActivityList';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { api, asList } from '@/lib/api';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalWatchHours: number;
  totalWatchMinutes: number;
  totalEvents: number;
  totalAttendance: number;
  totalCertificates: number;
  totalDonations: number;
  activePrayerRequests: number;
}

function formatWatchTime(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalWatchHours: 0,
    totalWatchMinutes: 0,
    totalEvents: 0,
    totalAttendance: 0,
    totalCertificates: 0,
    totalDonations: 0,
    activePrayerRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    Array<{ id: string; description: string; meta?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [dashboard, activity, watchHistory] = await Promise.allSettled([
          api.getAdminDashboard() as Promise<Record<string, number>>,
          api.getAdminActivity(),
          api.getAdminWatchActivity(),
        ]);

        const dash = dashboard.status === 'fulfilled' ? dashboard.value : null;
        const act = activity.status === 'fulfilled' ? activity.value : [];
        const watchRows = watchHistory.status === 'fulfilled' ? asList<any>(watchHistory.value) : [];

        // Exact sum from Watch Activity table
        const totalWatchMinutes = watchRows.reduce(
          (acc, row) => acc + (Number(row.watch_duration_minutes) || 0),
          0
        );

        setStats({
          totalMembers: dash?.total_members ?? 0,
          activeMembers: dash?.active_members ?? 0,
          totalCourses: dash?.active_courses ?? 0,
          totalEnrollments: dash?.total_enrollments ?? 0,
          totalWatchHours: Math.floor(totalWatchMinutes / 60),
          totalWatchMinutes: totalWatchMinutes,
          totalEvents: dash?.total_events ?? 0,
          totalAttendance: dash?.total_attendance ?? 0,
          totalCertificates: dash?.total_certificates ?? 0,
          totalDonations: Number(dash?.total_donations ?? 0),
          activePrayerRequests: dash?.active_prayer_requests ?? 0,
        });
        setRecentActivity(
          asList<any>(act)
            .slice(0, 10)
            .map((a) => ({
              id: a.id,
              description: a.first_name && a.last_name && !a.description.includes(a.first_name)
                ? `${a.first_name} ${a.last_name}: ${a.description}`
                : a.description,
              meta: a.created_at
                ? new Date(a.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined,
            })),
        );
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const watchTimeDisplay = formatWatchTime(stats.totalWatchMinutes || stats.totalWatchHours);

  const cards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/members' },
    { label: 'Active Members', value: stats.activeMembers, icon: Users, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/members' },
    { label: 'Active Courses', value: stats.totalCourses, icon: BookOpen, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/courses' },
    { label: 'Total Enrollments', value: stats.totalEnrollments, icon: TrendingUp, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/courses' },
    { label: 'Watch Hours', value: watchTimeDisplay, icon: Clock, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/watch-history' },
    { label: 'Total Events', value: stats.totalEvents, icon: Calendar, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/events' },
    { label: 'Event Attendance', value: stats.totalAttendance, icon: Calendar, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/events' },
    { label: 'Certificates Issued', value: stats.totalCertificates, icon: Award, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/certificates' },
    { label: 'Total Donations', value: `$${Number(stats.totalDonations).toFixed(2)}`, icon: CreditCard, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/donations' },
    { label: 'Active Prayer Requests', value: stats.activePrayerRequests, icon: Heart, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20', path: '/admin/prayer-requests' },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader title="Dashboard" />
      {error ? (
        <AdminErrorState label="dashboard statistics" />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 mb-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-10 md:space-y-12">
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>
          <div className="pt-2">
            <ActivityList items={recentActivity} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
