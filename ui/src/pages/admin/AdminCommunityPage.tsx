import { useState, useEffect } from 'react';
import {
  MessageSquare, Heart, CheckCircle2, Clock,
  AlertTriangle, EyeOff, Trash2, Search, Filter, ShieldCheck, X
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/Button';
import { api, asList } from '@/lib/api';

interface CommunityStats {
  total_posts: number;
  pending_posts: number;
  approved_posts: number;
  reported_posts: number;
  total_comments: number;
  total_likes: number;
}

interface AdminPost {
  id: string;
  content: string;
  status: 'approved' | 'pending' | 'hidden';
  created_at: string;
  updated_at: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_email: string;
  author_profile_image?: string | null;
  likes_count: number;
  comments_count: number;
  pending_reports_count: number;
}

interface ReportItem {
  id: string;
  post_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  post_content: string;
  post_status: string;
  reporter_first_name: string;
  reporter_last_name: string;
  author_first_name: string;
  author_last_name: string;
}

export function AdminCommunityPage() {
  const [stats, setStats] = useState<CommunityStats>({
    total_posts: 0,
    pending_posts: 0,
    approved_posts: 0,
    reported_posts: 0,
    total_comments: 0,
    total_likes: 0,
  });

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'posts' | 'reports'>('posts');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected post for viewing details/comments
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [selectedPostComments, setSelectedPostComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, postsData, reportsData, catsData] = await Promise.all([
        api.getAdminCommunityStats(),
        api.getAdminCommunityPosts({
          status: statusFilter === 'all' ? undefined : statusFilter,
          categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
          search: search || undefined,
        }),
        api.getAdminCommunityReports(),
        api.getAdminCommunityCategories(),
      ]);

      if (statsData) setStats(statsData);
      setPosts(asList<AdminPost>(postsData));
      setReports(asList<ReportItem>(reportsData));
      setCategories(asList<any>(catsData));
    } catch (err) {
      console.error('Failed to load admin community data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleUpdateStatus = async (postId: string, status: 'approved' | 'pending' | 'hidden') => {
    try {
      await api.updateAdminCommunityPostStatus(postId, status);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status } : p)));
      const statsData = await api.getAdminCommunityStats();
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this post?')) return;
    try {
      await api.deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      const statsData = await api.getAdminCommunityStats();
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await api.updateAdminCommunityReportStatus(reportId, 'dismissed');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      const statsData = await api.getAdminCommunityStats();
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to dismiss report:', err);
    }
  };

  const handleViewPostComments = async (post: AdminPost) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const comments = await api.getCommunityComments(post.id);
      setSelectedPostComments(asList(comments));
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteCommunityComment(commentId);
      setSelectedPostComments((prev) => prev.filter((c) => c.id !== commentId));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost?.id ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
        )
      );
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const statCards = [
    { label: 'Total Posts', value: stats.total_posts, icon: MessageSquare, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20' },
    { label: 'Approved Posts', value: stats.approved_posts, icon: CheckCircle2, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20' },
    { label: 'Pending Posts', value: stats.pending_posts, icon: Clock, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20' },
    { label: 'Reported Posts', value: stats.reported_posts, icon: AlertTriangle, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20' },
    { label: 'Total Comments', value: stats.total_comments, icon: MessageSquare, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20' },
    { label: 'Total Likes', value: stats.total_likes, icon: Heart, iconColor: 'text-[#C59B46]', iconBg: 'bg-[#C59B46]/10 dark:bg-[#C59B46]/20' },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Community Management"
        description="Moderate community posts, review reported submissions, and manage discussions."
      />

      {/* ─── Stats Cards Grid ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* ─── Main Tabs & Filters ────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('posts')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'posts'
                  ? 'bg-[#C59B46] text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Posts Feed ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#C59B46] text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Reported Posts ({reports.length})
              {reports.length > 0 && (
                <span className="ml-2 rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-xs">
                  {reports.length}
                </span>
              )}
            </button>
          </div>

          {/* Search bar */}
          {activeTab === 'posts' && (
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search posts or authors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-border bg-card pl-9 pr-4 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none w-56 sm:w-64"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="rounded-xl">
                Search
              </Button>
            </form>
          )}
        </div>

        {/* ─── Posts Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Status:</span>
              </div>
              {['all', 'approved', 'pending', 'hidden'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {st}
                </button>
              ))}

              <div className="h-4 w-px bg-border mx-2" />

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Category:</span>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                No posts found matching the filter.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden">
                {posts.map((post) => (
                  <div key={post.id} className="p-5 transition-colors hover:bg-muted/20">
                    <div className="flex items-start justify-between gap-4">
                      {/* Author details */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF5EB] text-sm font-serif font-bold text-[#C59B46] ring-1 ring-[#C59B46]/20 dark:bg-[#C59B46]/10">
                          {`${post.author_first_name?.[0] || ''}${post.author_last_name?.[0] || ''}`.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {post.author_first_name} {post.author_last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">({post.author_email})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="rounded-full bg-[#C59B46]/10 px-2 py-0.2 text-[11px] font-medium text-[#C59B46]">
                              {post.category_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status and Action Buttons */}
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={
                            post.status === 'approved'
                              ? 'active'
                              : post.status === 'pending'
                              ? 'pending'
                              : 'inactive'
                          }
                          label={post.status}
                        />

                        {post.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(post.id, 'approved')}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20"
                            title="Approve Post"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}

                        {post.status !== 'hidden' && (
                          <button
                            onClick={() => handleUpdateStatus(post.id, 'hidden')}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/20"
                            title="Hide Post"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide
                          </button>
                        )}

                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                          title="Delete Post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <p className="mt-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Interaction summary & view comments */}
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-rose-500" />
                          {post.likes_count} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-[#C59B46]" />
                          {post.comments_count} comments
                        </span>
                        {post.pending_reports_count > 0 && (
                          <span className="flex items-center gap-1 font-medium text-rose-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {post.pending_reports_count} pending report(s)
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleViewPostComments(post)}
                        className="text-primary hover:underline font-medium"
                      >
                        Moderate Comments ({post.comments_count})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Reports Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                No reported posts. All community submissions are clear!
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden">
                {reports.map((r) => (
                  <div key={r.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600">
                            Reported for: {r.reason}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            by {r.reporter_first_name} {r.reporter_last_name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Post by {r.author_first_name} {r.author_last_name} •{' '}
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDismissReport(r.id)}
                          className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                        >
                          Dismiss Report
                        </button>
                        <button
                          onClick={() => handleDeletePost(r.post_id)}
                          className="rounded-lg bg-destructive px-3 py-1 text-xs font-medium text-white hover:bg-destructive/90"
                        >
                          Delete Post
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3 text-sm text-foreground/90 italic">
                      "{r.post_content}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Post Comments Moderation Modal ─────────────────────────────────── */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Moderate Post Comments
              </h3>
              <button
                onClick={() => setSelectedPost(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 text-xs text-foreground/90">
              <span className="font-medium text-[#C59B46]">Original Post:</span> {selectedPost.content}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {loadingComments ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Loading comments...</div>
              ) : selectedPostComments.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">No comments on this post.</div>
              ) : (
                selectedPostComments.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3 bg-background"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {c.author_first_name} {c.author_last_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-foreground/90">{c.content}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                      title="Delete Comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedPost(null)} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
