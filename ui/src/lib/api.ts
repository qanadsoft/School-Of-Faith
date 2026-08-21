/**
 * REST API client for the Express backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return null;
      const cleanToken = token.replace(/^"+|"+$/g, '').trim();
      if (!cleanToken || cleanToken === 'null' || cleanToken === 'undefined') {
        return null;
      }
      return cleanToken;
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;

    const customHeaders: Record<string, string> = {};
    if (fetchOptions.headers) {
      if (fetchOptions.headers instanceof Headers) {
        fetchOptions.headers.forEach((val, key) => {
          customHeaders[key] = val;
        });
      } else if (Array.isArray(fetchOptions.headers)) {
        fetchOptions.headers.forEach(([key, val]) => {
          customHeaders[key] = val;
        });
      } else {
        Object.assign(customHeaders, fetchOptions.headers);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (!skipAuth) {
      const token = this.getAuthToken();
      const hasAuthHeader = Object.keys(headers).some(
        (h) => h.toLowerCase() === 'authorization'
      );
      if (token && !hasAuthHeader) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, { ...fetchOptions, headers });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
      }
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined as unknown as T;

    return response.json() as Promise<T>;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const result = await this.request<{ token?: string; user?: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (result.token) localStorage.setItem('authToken', result.token);
    return result;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    localStorage.removeItem('authToken');
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ─── Member endpoints ──────────────────────────────────────────────────────
  async getMemberProfile(_memberId?: string) {
    return this.request('/member/profile');
  }

  async updateMemberProfile(data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    profileImage?: string | null;
  }) {
    return this.request('/member/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMemberProfileImage() {
    return this.request('/member/profile/image', {
      method: 'DELETE',
    });
  }

  async getMemberDashboard() {
    return this.request('/member/dashboard');
  }

  async getMemberCourses() {
    return this.request('/member/courses');
  }

  async getMemberWatchHistory() {
    return this.request('/member/watch-history');
  }

  async getMemberCertificates() {
    return this.request('/member/certificates');
  }

  async getCertificateSettings() {
    return this.request('/member/certificates/settings');
  }

  async updateAdminCertificateSettings(data: {
    branding_name?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    signature_name?: string;
    signature_title?: string;
    footer_text?: string;
  }) {
    return this.request('/admin/certificates/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async claimCertificate(courseId: string) {
    return this.request('/member/certificates/claim', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    });
  }

  async getMemberEvents() {
    return this.request('/member/events');
  }

  async getMemberTickets() {
    return this.request('/member/tickets');
  }

  async getMemberDonations() {
    return this.request('/member/donations');
  }

  async getMemberPrayerRequests() {
    return this.request('/member/prayer-requests');
  }

  async createPrayerRequest(data: {
    title: string;
    description: string;
    status?: string;
    isPrivate?: boolean;
  }) {
    return this.request('/member/prayer-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePrayerRequest(
    id: string,
    data: { title: string; description: string; status?: string; isPrivate?: boolean },
  ) {
    return this.request(`/member/prayer-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePrayerRequest(id: string) {
    return this.request(`/member/prayer-requests/${id}`, { method: 'DELETE' });
  }

  async getMemberDownloads() {
    return this.request('/member/downloads');
  }

  async recordDownload(data: {
    resourceName: string;
    title?: string;
    resourceType?: string;
    fileUrl?: string | null;
    resourceUrl?: string | null;
  }) {
    return this.request('/member/downloads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDownload(id: string) {
    return this.request(`/member/downloads/${id}`, { method: 'DELETE' });
  }

  async getSavedMessages() {
    return this.request('/member/saved-messages');
  }

  async deleteSavedMessage(id: string) {
    return this.request(`/member/saved-messages/${id}`, { method: 'DELETE' });
  }

  async getReadingPlan() {
    return this.request('/member/reading-plan');
  }

  async getMemberActivity() {
    return this.request('/member/activity');
  }

  // ─── Videos & Watch Progress (Member / Public) ─────────────────────────────
  async getPublishedVideos(topicSlug?: string) {
    const query = topicSlug ? `?topic=${encodeURIComponent(topicSlug)}` : '';
    return this.request<any[]>(`/videos${query}`, { skipAuth: true });
  }

  async getRecentVideos(limit = 12) {
    return this.request<any[]>(`/videos/recent?limit=${limit}`, { skipAuth: true });
  }

  async getVideo(id: string) {
    return this.request<any>(`/videos/${id}`, { skipAuth: true });
  }

  async getVideoTopics() {
    return this.request<any[]>('/videos/topics', { skipAuth: true });
  }

  async getTopicBySlug(slug: string) {
    return this.request<any>(`/videos/topics/${slug}`, { skipAuth: true });
  }

  async getVideosByTopic(slug: string) {
    return this.request<{ topic: any; count: number; videos: any[] }>(`/videos/topics/${slug}/videos`, { skipAuth: true });
  }

  async getContinueWatching() {
    return this.request<any[]>('/member/continue-watching');
  }

  async getVideoProgress(messageId: string) {
    return this.request<any>(`/member/video-progress/${messageId}`);
  }

  async saveVideoProgress(data: {
    messageId: string;
    lastPositionSeconds: number;
    watchDurationSeconds: number;
    progressPercentage: number;
    isCompleted?: boolean;
  }) {
    return this.request('/member/video-progress', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveMessage(messageId: string) {
    return this.request('/member/saved-messages', {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  }

  // ─── Admin: Dashboard & Activity ──────────────────────────────────────────
  async getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  async getAdminActivity() {
    return this.request('/admin/activity');
  }

  // ─── Admin: Members ────────────────────────────────────────────────────────
  async getAdminMembers() {
    return this.request('/admin/members');
  }

  async getAdminMember(id: string) {
    return this.request(`/admin/members/${id}`);
  }

  async getAdminMemberStats(id: string) {
    return this.request(`/admin/members/${id}/stats`);
  }

  async createMember(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    membershipType?: string;
    membershipStatus?: string;
    isActive?: boolean;
  }) {
    return this.request('/admin/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMember(
    id: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      membershipType: string;
      membershipStatus: string;
      isActive: boolean;
      bio?: string;
      profileImage?: string | null;
    },
  ) {
    return this.request(`/admin/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin: Tags ───────────────────────────────────────────────────────────
  async getAdminTags() {
    return this.request('/admin/tags');
  }

  async createTag(data: { name: string; color: string; textColor: string }) {
    return this.request('/admin/tags', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTag(id: string, data: { name: string; color: string; textColor: string }) {
    return this.request(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteTag(id: string) {
    return this.request(`/admin/tags/${id}`, { method: 'DELETE' });
  }

  async assignTagToMember(memberId: string, tagId: string) {
    return this.request(`/admin/members/${memberId}/tags/${tagId}`, { method: 'POST' });
  }

  async removeTagFromMember(memberId: string, tagId: string) {
    return this.request(`/admin/members/${memberId}/tags/${tagId}`, { method: 'DELETE' });
  }

  // ─── Public & Member Courses ─────────────────────────────────────────────
  async getCourses(filters?: { search?: string; category?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/courses${qs}`);
  }

  async getCourse(id: string) {
    return this.request(`/courses/${id}`);
  }

  async enrollCourse(id: string) {
    return this.request(`/courses/${id}/enroll`, { method: 'POST' });
  }

  async saveLessonProgress(
    courseId: string,
    lessonId: string,
    data: {
      lastPositionSeconds?: number;
      watchDurationSeconds?: number;
      progressPercentage?: number;
      isCompleted?: boolean;
    },
  ) {
    return this.request(`/courses/${courseId}/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCourseCertificate(courseId: string) {
    return this.request(`/courses/${courseId}/certificate`);
  }

  // ─── Admin: Courses & Lessons ──────────────────────────────────────────────
  async getAdminCourses() {
    return this.request('/admin/courses');
  }

  async createCourse(data: {
    title: string;
    description: string;
    instructor: string;
    category: string;
    difficulty: string;
    durationMinutes: number;
    imageUrl?: string | null;
  }) {
    return this.request('/admin/courses', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCourse(
    id: string,
    data: {
      title: string;
      description: string;
      instructor: string;
      category: string;
      difficulty: string;
      durationMinutes: number;
      imageUrl?: string | null;
      archived?: boolean;
    },
  ) {
    return this.request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async archiveCourse(id: string) {
    return this.request(`/admin/courses/${id}/archive`, { method: 'PATCH' });
  }

  async deleteCourse(id: string) {
    return this.request(`/admin/courses/${id}`, { method: 'DELETE' });
  }

  async getAdminCourseLessons(courseId: string) {
    return this.request(`/admin/courses/${courseId}/lessons`);
  }

  async createAdminLesson(
    courseId: string,
    data: {
      title: string;
      durationMinutes?: number;
      sortOrder?: number;
      videoUrl?: string | null;
    },
  ) {
    return this.request(`/admin/courses/${courseId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminLesson(
    courseId: string,
    lessonId: string,
    data: {
      title?: string;
      durationMinutes?: number;
      sortOrder?: number;
      videoUrl?: string | null;
    },
  ) {
    return this.request(`/admin/courses/${courseId}/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminLesson(courseId: string, lessonId: string) {
    return this.request(`/admin/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' });
  }

  async getAdminCourseEnrollmentStats(courseId: string) {
    return this.request(`/admin/courses/${courseId}/enrollment-stats`);
  }

  // ─── Admin: Enrollments ────────────────────────────────────────────────────
  async getAdminEnrollments() {
    return this.request('/admin/enrollments');
  }

  async getMemberEnrollments(memberId: string) {
    return this.request(`/admin/members/${memberId}/enrollments`);
  }

  async createEnrollment(data: { memberId: string; courseId: string; status?: string }) {
    return this.request('/admin/enrollments', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEnrollment(id: string, data: { status: string }) {
    return this.request(`/admin/enrollments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEnrollment(id: string) {
    return this.request(`/admin/enrollments/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Watch Activity ─────────────────────────────────────────────────
  async getAdminWatchActivity() {
    return this.request('/admin/watch-activity');
  }

  async createWatchActivity(data: {
    userId: string;
    courseId: string;
    lessonId?: string | null;
    watchDurationMinutes: number;
    completionPercentage?: number;
  }) {
    return this.request('/admin/watch-activity', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteWatchActivity(id: string) {
    return this.request(`/admin/watch-activity/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Certificates ───────────────────────────────────────────────────
  async getAdminCertificates() {
    return this.request('/admin/certificates');
  }

  async createCertificate(data: {
    memberId: string;
    courseId: string;
    certificateNumber: string;
    title: string;
    issueDate?: string;
    status?: string;
  }) {
    return this.request('/admin/certificates', { method: 'POST', body: JSON.stringify(data) });
  }

  async revokeCertificate(id: string) {
    return this.request(`/admin/certificates/${id}/revoke`, { method: 'PATCH' });
  }

  // ─── Admin: Events ─────────────────────────────────────────────────────────
  async getAdminEvents() {
    return this.request('/admin/events');
  }

  async getEventRegistrations(eventId: string) {
    return this.request(`/admin/events/${eventId}/registrations`);
  }

  async createEvent(data: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string;
    capacity?: number;
    archived?: boolean;
  }) {
    return this.request('/admin/events', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEvent(
    id: string,
    data: {
      title: string;
      description?: string;
      startsAt: string;
      endsAt?: string | null;
      location?: string;
      capacity?: number;
      archived?: boolean;
    },
  ) {
    return this.request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async archiveEvent(id: string) {
    return this.request(`/admin/events/${id}/archive`, { method: 'PATCH' });
  }

  async deleteEvent(id: string) {
    return this.request(`/admin/events/${id}`, { method: 'DELETE' });
  }

  async setEventAttendance(data: {
    userId: string;
    eventId: string;
    status: string;
  }) {
    return this.request('/admin/event-attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createEventRegistration(data: {
    memberId: string;
    eventId: string;
    registrationStatus?: string;
  }) {
    return this.request('/admin/event-registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteEventRegistration(id: string) {
    return this.request(`/admin/event-registrations/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Event Tickets ──────────────────────────────────────────────────
  async getAdminEventTickets() {
    return this.request('/admin/event-tickets');
  }

  async createEventTicket(data: {
    memberId: string;
    eventId: string;
    ticketNumber?: string;
    attendanceStatus?: string;
    ticketStatus?: string;
  }) {
    return this.request('/admin/event-tickets', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEventTicket(
    id: string,
    data: { ticketStatus?: string; attendanceStatus?: string },
  ) {
    return this.request(`/admin/event-tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEventTicket(id: string) {
    return this.request(`/admin/event-tickets/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Messages ───────────────────────────────────────────────────────
  async getAdminMessages() {
    return this.request('/admin/messages');
  }

  async createMessage(data: {
    title: string;
    speaker: string;
    category?: string;
    description?: string;
    thumbnailUrl?: string | null;
    videoUrl?: string | null;
    durationMinutes?: number;
    originalUrl?: string;
    publishedAt?: string;
    archived?: boolean;
    topicIds?: string[];
  }) {
    return this.request('/admin/messages', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateMessage(
    id: string,
    data: {
      title: string;
      speaker: string;
      category?: string;
      description?: string;
      thumbnailUrl?: string | null;
      videoUrl?: string | null;
      durationMinutes?: number;
      originalUrl?: string;
      publishedAt?: string;
      archived?: boolean;
      topicIds?: string[];
    },
  ) {
    return this.request(`/admin/messages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async archiveMessage(id: string) {
    return this.request(`/admin/messages/${id}/archive`, { method: 'PATCH' });
  }

  async deleteMessage(id: string) {
    return this.request(`/admin/messages/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Reading Plans ──────────────────────────────────────────────────
  async getAdminReadingPlans() {
    return this.request('/admin/reading-plans');
  }

  async getReadingPlanItems(planId: string) {
    return this.request(`/admin/reading-plans/${planId}/items`);
  }

  async getReadingPlanProgress(planId: string) {
    return this.request(`/admin/reading-plans/${planId}/progress`);
  }

  async createReadingPlan(data: {
    name: string;
    description?: string;
    totalDays: number;
    active?: boolean;
  }) {
    return this.request('/admin/reading-plans', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateReadingPlan(
    id: string,
    data: { name: string; description?: string; totalDays: number; active?: boolean },
  ) {
    return this.request(`/admin/reading-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReadingPlan(id: string) {
    return this.request(`/admin/reading-plans/${id}`, { method: 'DELETE' });
  }

  async markReadingComplete(data: { memberId: string; planId: string; itemId: string }) {
    return this.request('/admin/reading-progress', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async unmarkReadingComplete(data: { memberId: string; itemId: string }) {
    return this.request('/admin/reading-progress', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin: Downloads ──────────────────────────────────────────────────────
  async getAdminDownloads() {
    return this.request('/admin/downloads');
  }

  async createDownload(data: {
    memberId: string;
    resourceName: string;
    resourceType: string;
    fileUrl?: string;
  }) {
    return this.request('/admin/downloads', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteAdminDownload(id: string) {
    return this.request(`/admin/downloads/${id}`, { method: 'DELETE' });
  }

  // ─── Public & Member: Campaigns & Giving ────────────────────────────────
  async getCampaigns() {
    return this.request<any[]>('/campaigns', { skipAuth: true });
  }

  async getCampaign(id: string) {
    return this.request<any>(`/campaigns/${id}`, { skipAuth: true });
  }

  async submitDonation(data: {
    memberId?: string | null;
    campaignId?: string | null;
    amount: number;
    currency?: string;
    method?: string;
    donationType?: string;
    fund?: string;
    campaignName?: string | null;
    paymentStatus?: string;
    transactionId?: string;
  }) {
    return this.request('/donations', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: !data.memberId,
    });
  }

  // ─── Admin: Campaigns ───────────────────────────────────────────────────────
  async getAdminCampaigns() {
    return this.request<any[]>('/admin/campaigns');
  }

  async createAdminCampaign(data: {
    title: string;
    description?: string;
    imageUrl?: string | null;
    goalAmount: number;
    startDate?: string;
    endDate?: string | null;
    isActive?: boolean;
  }) {
    return this.request('/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminCampaign(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string | null;
      goalAmount?: number;
      startDate?: string;
      endDate?: string | null;
      isActive?: boolean;
      archived?: boolean;
    }
  ) {
    return this.request(`/admin/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminCampaign(id: string) {
    return this.request(`/admin/campaigns/${id}`, { method: 'DELETE' });
  }

  // ─── Admin: Donations ──────────────────────────────────────────────────────
  async getAdminDonationStats() {
    return this.request<any>('/admin/donations/stats');
  }

  async getAdminDonations(filters?: {
    search?: string;
    fund?: string;
    status?: string;
    donationType?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.fund) params.append('fund', filters.fund);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.donationType) params.append('donationType', filters.donationType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/donations${qs}`);
  }

  async createDonation(data: {
    memberId?: string | null;
    campaignId?: string | null;
    amount: number;
    currency?: string;
    method?: string;
    transactionId?: string;
    donationType: string;
    fund: string;
    campaign?: string | null;
    paymentStatus?: string;
  }) {
    return this.request('/admin/donations', { method: 'POST', body: JSON.stringify(data) });
  }

  // ─── Admin: Prayer Requests & Focuses ────────────────────────────────────────
  async getAdminPrayerRequests(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/admin/prayer-requests${query}`);
  }

  async getAdminPrayerStats() {
    return this.request('/admin/prayer-stats');
  }

  async updatePrayerRequestStatus(id: string, status: string) {
    return this.request(`/admin/prayer-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteAdminPrayerRequest(id: string) {
    return this.request(`/admin/prayer-requests/${id}`, { method: 'DELETE' });
  }

  async getAdminPrayerFocuses() {
    return this.request('/admin/prayer-focuses');
  }

  async createAdminPrayerFocus(data: {
    title: string;
    topic?: string;
    scripture?: string;
    description: string;
    activeDate?: string;
    isPublished?: boolean;
  }) {
    return this.request('/admin/prayer-focuses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminPrayerFocus(id: string, data: Record<string, unknown>) {
    return this.request(`/admin/prayer-focuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleAdminPrayerFocusPublish(id: string) {
    return this.request(`/admin/prayer-focuses/${id}/publish`, { method: 'PATCH' });
  }

  async deleteAdminPrayerFocus(id: string) {
    return this.request(`/admin/prayer-focuses/${id}`, { method: 'DELETE' });
  }

  // ─── Public / Member: Prayer Wall & Focus ─────────────────────────────────
  async getPrayerWall() {
    return this.request('/prayer/wall');
  }

  async getTodayPrayerFocus() {
    return this.request('/prayer/focus/today');
  }

  async prayForRequest(id: string) {
    return this.request<{ prayer_count: number; has_prayed: boolean }>(`/prayer/requests/${id}/pray`, {
      method: 'POST',
    });
  }

  async prayForFocus(id: string) {
    return this.request<{ prayer_count: number; has_prayed: boolean }>(`/prayer/focus/${id}/pray`, {
      method: 'POST',
    });
  }

  async submitPrayerRequest(data: {
    title?: string;
    description: string;
    category?: string;
    type?: 'request' | 'praise';
    authorName?: string;
    isAnonymous?: boolean;
  }) {
    return this.request('/prayer/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyPrayerRequests() {
    return this.request('/prayer/my-requests');
  }

  async markMyPrayerRequestAnswered(id: string) {
    return this.request(`/prayer/requests/${id}/answered`, {
      method: 'PATCH',
    });
  }

  async deleteMyPrayerRequest(id: string) {
    return this.request(`/prayer/requests/${id}`, {
      method: 'DELETE',
    });
  }

  async getPrayerComments(requestId: string) {
    return this.request(`/prayer/requests/${requestId}/comments`, { skipAuth: true });
  }

  async addPrayerComment(requestId: string, data: { content: string; authorName?: string }) {
    return this.request(`/prayer/requests/${requestId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Community Module ──────────────────────────────────────────────────────
  async getCommunityCategories() {
    return this.request<any[]>('/community/categories', { skipAuth: true });
  }

  async getCommunityPosts(filters?: { category?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/community/posts${qs}`);
  }

  async getCommunityPost(id: string) {
    return this.request<any>(`/community/posts/${id}`);
  }

  async createCommunityPost(data: { content: string; categoryId: string }) {
    return this.request<any>('/community/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCommunityPost(id: string, data: { content?: string; categoryId?: string }) {
    return this.request<any>(`/community/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCommunityPost(id: string) {
    return this.request(`/community/posts/${id}`, { method: 'DELETE' });
  }

  async likeCommunityPost(id: string) {
    return this.request<{ liked: boolean; likesCount: number }>(`/community/posts/${id}/like`, {
      method: 'POST',
    });
  }

  async unlikeCommunityPost(id: string) {
    return this.request<{ liked: boolean; likesCount: number }>(`/community/posts/${id}/like`, {
      method: 'DELETE',
    });
  }

  async getCommunityComments(postId: string) {
    return this.request<any[]>(`/community/posts/${postId}/comments`);
  }

  async createCommunityComment(postId: string, content: string) {
    return this.request<any>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteCommunityComment(commentId: string) {
    return this.request(`/community/comments/${commentId}`, { method: 'DELETE' });
  }

  async reportCommunityPost(postId: string, reason: string) {
    return this.request<any>(`/community/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ─── Admin: Community ─────────────────────────────────────────────────────
  async getAdminCommunityStats() {
    return this.request<any>('/community/admin/stats');
  }

  async getAdminCommunityPosts(filters?: { status?: string; categoryId?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/community/admin/posts${qs}`);
  }

  async updateAdminCommunityPostStatus(id: string, status: 'approved' | 'pending' | 'hidden') {
    return this.request<any>(`/community/admin/posts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminCommunityReports() {
    return this.request<any[]>('/community/admin/reports');
  }

  async updateAdminCommunityReportStatus(id: string, status: 'pending' | 'reviewed' | 'dismissed') {
    return this.request<any>(`/community/admin/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminCommunityCategories() {
    return this.request<any[]>('/community/admin/categories');
  }

  // ─── Reading Plans & Featured Brand Journal ────────────────────────────────
  async getFeaturedReadingPlan() {
    return this.request<any>('/member/reading-plans/featured');
  }

  async toggleReadingPlanProgress(planId: string, itemId: string, notes?: string) {
    return this.request<{ completed: boolean }>(`/member/reading-plans/${planId}/progress/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async getAdminReadingPlanItems(planId: string) {
    return this.request<any[]>(`/admin/reading-plans/${planId}/items`);
  }

  async createAdminReadingPlanItem(planId: string, data: any) {
    return this.request<any>(`/admin/reading-plans/${planId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminReadingPlanItem(itemId: string, data: any) {
    return this.request<any>(`/admin/reading-plans/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminReadingPlanItem(itemId: string) {
    return this.request(`/admin/reading-plans/items/${itemId}`, {
      method: 'DELETE',
    });
  }
}

export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { rows?: unknown }).rows)) {
    return (data as { rows: T[] }).rows;
  }
  return [];
}

export const api = new APIClient(API_BASE_URL);
