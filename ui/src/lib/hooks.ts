import { useCallback, useEffect, useState } from 'react';
import { api, asList } from '@/lib/api';
import type {
  Tag, Enrollment, WatchRecord, Certificate, Registration, Ticket,
  ReadingPlan, ReadingProgress, SavedMessage, Download, Donation,
  PrayerRequest, ActivityRecord,
} from '@/lib/supabase';

export interface MemberStats {
  courseCount: number;
  hoursWatched: number;
  eventsAttended: number;
  certificateCount: number;
}

export interface ReadingProgressData {
  plan: ReadingPlan | null;
  completedDays: number;
  totalDays: number;
  percentage: number;
}

export function useMemberTags(memberId: string | undefined) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const profile = await api.getMemberProfile(memberId);
      setTags(profile?.tags ?? []);
    } catch (error) {
      console.error('Failed to fetch member tags:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { tags, loading, refresh };
}

export function useMemberStats(memberId: string | undefined) {
  const [stats, setStats] = useState<MemberStats>({ courseCount: 0, hoursWatched: 0, eventsAttended: 0, certificateCount: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const [dashboard, coursesData, certificatesData, eventsData] = await Promise.allSettled([
        api.getMemberDashboard(),
        api.getCourses(),
        api.getMemberCertificates(),
        api.getMemberEvents(),
      ]);

      const dash = dashboard.status === 'fulfilled' ? dashboard.value : null;
      const allCourses = coursesData.status === 'fulfilled' ? asList<any>(coursesData.value) : [];
      const enrolledCoursesCount = allCourses.filter((c) => !!c.is_enrolled).length;

      const certsList = certificatesData.status === 'fulfilled' ? asList<any>(certificatesData.value) : [];
      const certCount = certificatesData.status === 'fulfilled' ? certsList.length : (dash?.certificates ?? 0);

      const eventsList = eventsData.status === 'fulfilled' ? asList<any>(eventsData.value) : [];
      const eventCount = eventsData.status === 'fulfilled' ? eventsList.length : (dash?.events ?? 0);

      setStats({
        courseCount: enrolledCoursesCount,
        hoursWatched: dash?.hours_watched ?? 0,
        eventsAttended: eventCount,
        certificateCount: certCount,
      });
    } catch (error) {
      console.error('Failed to fetch member stats:', error);
      setStats({ courseCount: 0, hoursWatched: 0, eventsAttended: 0, certificateCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { stats, loading, refresh };
}

export function useReadingProgress(memberId: string | undefined) {
  const [data, setData] = useState<ReadingProgressData>({
    plan: null as any,
    completedDays: 0,
    totalDays: 30,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const [result, dashboard] = await Promise.allSettled([
        api.getReadingPlan(),
        api.getMemberDashboard(),
      ]);

      const planData = result.status === 'fulfilled' ? result.value : null;
      const dashData = dashboard.status === 'fulfilled' ? dashboard.value : null;

      if (planData && planData.items && planData.items.length > 0) {
        const completedDays = planData.items.filter((item: any) => item.completed).length;
        const totalDays = planData.total_days || planData.items.length || 30;
        const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
        setData({ plan: planData as ReadingPlan, completedDays, totalDays, percentage });
      } else if (dashData && dashData.reading_plan) {
        const rp = dashData.reading_plan;
        const completedDays = Number(rp.completedDays || rp.completed_days || 0);
        const totalDays = Number(rp.totalDays || rp.total_days || 30);
        const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
        setData({
          plan: { id: rp.id || 'plan-1', name: rp.name || rp.title || '30-Day Scripture Journal', title: rp.name || rp.title || '30-Day Scripture Journal', total_days: totalDays, active: true } as any,
          completedDays,
          totalDays,
          percentage,
        });
      } else if (planData) {
        setData({
          plan: planData as ReadingPlan,
          completedDays: 0,
          totalDays: planData.total_days || 30,
          percentage: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch reading progress:', error);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export function useEnrollments(memberId: string | undefined) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberCourses();
      setEnrollments((data ?? []) as Enrollment[]);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { enrollments, loading, refresh };
}

export function useWatchHistory(memberId: string | undefined) {
  const [records, setRecords] = useState<WatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberWatchHistory();
      setRecords(asList<WatchRecord>(data));
    } catch (error) {
      console.error('Failed to fetch watch history:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { records, loading, refresh };
}

export function useCertificates(memberId: string | undefined) {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberCertificates();
      setCerts((data ?? []) as Certificate[]);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      setCerts([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { certs, loading, refresh };
}

export function useRegistrations(memberId: string | undefined) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberEvents();
      setRegs((data ?? []) as Registration[]);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
      setRegs([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { regs, loading, refresh };
}

export function useTickets(memberId: string | undefined) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberTickets();
      setTickets((data ?? []) as Ticket[]);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { tickets, loading, refresh };
}

export function useSavedMessages(memberId: string | undefined) {
  const [saved, setSaved] = useState<SavedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getSavedMessages();
      setSaved((data ?? []) as SavedMessage[]);
    } catch (error) {
      console.error('Failed to fetch saved messages:', error);
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { saved, loading, refresh };
}

export function useDownloads(memberId: string | undefined) {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberDownloads();
      setDownloads((data ?? []) as Download[]);
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { downloads, loading, refresh };
}

export function useDonations(memberId: string | undefined) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberDonations();
      setDonations((data ?? []) as Donation[]);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { donations, loading, refresh };
}

export function usePrayerRequests(memberId: string | undefined) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberPrayerRequests();
      setRequests((data ?? []) as PrayerRequest[]);
    } catch (error) {
      console.error('Failed to fetch prayer requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { requests, loading, refresh };
}

export function useActivity(memberId: string | undefined, limit = 20) {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.getMemberActivity();
      setActivity((data ?? []) as ActivityRecord[]);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [memberId, limit]);

  useEffect(() => { refresh(); }, [refresh]);
  return { activity, loading, refresh };
}
