import { useEffect, useState } from 'react';
import { Heart, MessageSquare, Send, CheckCircle2, Clock, Trash2, Check, Sparkles, CornerDownRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea, Input } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { PrayerRequest, PrayerFocus, PrayerComment } from '@/lib/types';

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} hours ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PrayerPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'wall' | 'submit' | 'mine'>('wall');
  const [wallRequests, setWallRequests] = useState<PrayerRequest[]>([]);
  const [myRequests, setMyRequests] = useState<PrayerRequest[]>([]);
  const [todayFocus, setTodayFocus] = useState<PrayerFocus | null>(null);
  const [loadingWall, setLoadingWall] = useState(true);
  const [loadingMine, setLoadingMine] = useState(false);

  // Expandable Replies State (map of reqId -> comments array)
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, PrayerComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Submit Form State
  const [requestType, setRequestType] = useState<'request' | 'praise'>('request');
  const [title, setTitle] = useState('');
  const [newRequest, setNewRequest] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load Wall and Today's Focus
  const loadWallAndFocus = async () => {
    try {
      setLoadingWall(true);
      const [wallData, focusData] = await Promise.all([
        api.getPrayerWall(),
        api.getTodayPrayerFocus(),
      ]);
      setWallRequests(asList<PrayerRequest>(wallData));
      if (focusData && typeof focusData === 'object' && 'title' in focusData) {
        setTodayFocus(focusData as PrayerFocus);
      }
    } catch (err) {
      console.error('Failed to load prayer wall:', err);
    } finally {
      setLoadingWall(false);
    }
  };

  // Load My Requests
  const loadMyRequests = async () => {
    if (!profile) return;
    try {
      setLoadingMine(true);
      const data = await api.getMyPrayerRequests();
      setMyRequests(asList<PrayerRequest>(data));
    } catch (err) {
      console.error('Failed to load my prayer requests:', err);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    loadWallAndFocus();
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'mine') {
      loadMyRequests();
    }
  }, [activeTab, profile]);

  // Click "I'm Praying" on a Wall Request
  const handlePrayForRequest = async (reqId: string) => {
    const target = wallRequests.find((r) => r.id === reqId);
    if (!target) return;

    const alreadyPrayed = !!target.has_prayed;
    const currentCount = target.prays ?? target.prayer_count ?? 0;

    // Optimistic UI update
    setWallRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              has_prayed: true,
              prays: alreadyPrayed ? currentCount : currentCount + 1,
              prayer_count: alreadyPrayed ? currentCount : currentCount + 1,
            }
          : r
      )
    );

    try {
      const res = await api.prayForRequest(reqId);
      setWallRequests((prev) =>
        prev.map((r) =>
          r.id === reqId
            ? {
                ...r,
                has_prayed: true,
                prays: res.prayer_count,
                prayer_count: res.prayer_count,
              }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to record prayer:', err);
    }
  };

  // Click "I'm Praying" on Today's Focus
  const handlePrayForFocus = async () => {
    if (!todayFocus) return;

    const currentCount = todayFocus.prayer_count ?? 0;
    const alreadyPrayed = !!todayFocus.has_prayed;

    setTodayFocus({
      ...todayFocus,
      has_prayed: true,
      prayer_count: alreadyPrayed ? currentCount : currentCount + 1,
    });

    try {
      const res = await api.prayForFocus(todayFocus.id);
      setTodayFocus((prev) =>
        prev ? { ...prev, has_prayed: true, prayer_count: res.prayer_count } : null
      );
    } catch (err) {
      console.error('Failed to record focus prayer:', err);
    }
  };

  // Toggle & Load Replies for a Request
  const toggleReplies = async (reqId: string) => {
    const nextState = !openReplies[reqId];
    setOpenReplies((prev) => ({ ...prev, [reqId]: nextState }));

    if (nextState && !commentsMap[reqId]) {
      try {
        setLoadingComments((prev) => ({ ...prev, [reqId]: true }));
        const data = await api.getPrayerComments(reqId);
        setCommentsMap((prev) => ({ ...prev, [reqId]: asList<PrayerComment>(data) }));
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [reqId]: false }));
      }
    }
  };

  // Post a Reply
  const handlePostReply = async (reqId: string) => {
    const text = (newCommentText[reqId] || '').trim();
    if (!text) return;

    try {
      setSubmittingComment((prev) => ({ ...prev, [reqId]: true }));
      const newComment = await api.addPrayerComment(reqId, {
        content: text,
        authorName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined,
      });

      // Update local comments list
      setCommentsMap((prev) => ({
        ...prev,
        [reqId]: [...(prev[reqId] || []), newComment as PrayerComment],
      }));

      // Update reply count on card
      setWallRequests((prev) =>
        prev.map((r) =>
          r.id === reqId
            ? { ...r, replies: (r.replies ?? r.comments ?? 0) + 1, comments: (r.comments ?? 0) + 1 }
            : r
        )
      );

      // Clear input
      setNewCommentText((prev) => ({ ...prev, [reqId]: '' }));
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  // Submit Request
  const handleSubmit = async () => {
    if (!newRequest.trim()) return;
    try {
      setSubmitting(true);
      await api.submitPrayerRequest({
        title: title.trim() || newRequest.trim().slice(0, 50),
        description: newRequest.trim(),
        type: requestType,
        authorName: anonymous ? 'Anonymous' : authorName.trim() || undefined,
        isAnonymous: anonymous,
      });

      setNewRequest('');
      setTitle('');
      setAuthorName('');
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setActiveTab('mine');
      }, 1800);
      loadMyRequests();
    } catch (err) {
      console.error('Failed to submit prayer request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Member mark answered
  const handleMarkAnswered = async (reqId: string) => {
    try {
      await api.markMyPrayerRequestAnswered(reqId);
      loadMyRequests();
      loadWallAndFocus();
    } catch (err) {
      console.error('Failed to mark answered:', err);
    }
  };

  // Member delete request
  const handleDeleteMyRequest = async (reqId: string) => {
    try {
      await api.deleteMyPrayerRequest(reqId);
      setMyRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (err) {
      console.error('Failed to delete request:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Approved (On Wall)</Badge>;
      case 'answered':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">Answered Praise</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">Rejected</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Pending Review</Badge>;
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      {/* Today's Prayer Focus Card (Matching Screenshot) */}
      {todayFocus && (
        <div className="relative overflow-hidden rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-6 md:p-8 dark:bg-card dark:border-border shadow-sm">
          {/* Watermark Heart Icon */}
          <div className="pointer-events-none absolute right-4 top-4 text-[#C69A50]/15 dark:text-primary/10">
            <Heart className="h-28 w-28 md:h-36 md:w-36 stroke-[1.2]" />
          </div>

          <div className="relative z-10 space-y-4">
            <div>
              <span className="font-serif italic text-lg text-[#C69A50] dark:text-primary">
                Today's Prayer Focus
              </span>
              <h2 className="mt-1 font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
                {todayFocus.title}
              </h2>
            </div>

            {todayFocus.scripture && (
              <p className="font-light leading-relaxed text-foreground/90 text-sm md:text-base">
                {todayFocus.scripture}
              </p>
            )}

            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              {todayFocus.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handlePrayForFocus}
                className="inline-flex items-center justify-center rounded-full bg-[#C69A50] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#b88c44] active:scale-95 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              >
                I'm Praying
              </button>
              <span className="text-sm font-light text-muted-foreground">
                {(todayFocus.prayer_count ?? 0).toLocaleString()} people are praying
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Container (Matching Screenshot Pill Style) */}
      <div className="flex items-center rounded-xl bg-[#F1EFE9] dark:bg-muted p-1">
        <button
          onClick={() => setActiveTab('wall')}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
            activeTab === 'wall'
              ? 'bg-white text-foreground shadow-sm dark:bg-card'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Prayer Wall
        </button>
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
            activeTab === 'submit'
              ? 'bg-white text-foreground shadow-sm dark:bg-card'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Submit Request
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
            activeTab === 'mine'
              ? 'bg-white text-foreground shadow-sm dark:bg-card'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Requests {myRequests.length > 0 && `(${myRequests.length})`}
        </button>
      </div>

      {/* ─── TAB 1: PRAYER WALL ─── */}
      {activeTab === 'wall' && (
        <div className="space-y-4">
          {loadingWall ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : wallRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <p className="font-medium text-foreground">No requests on the prayer wall yet.</p>
              <p className="mt-1 text-sm font-light">Be the first to submit a prayer need or praise report!</p>
            </div>
          ) : (
            wallRequests.map((req) => {
              const prayCount = req.prays ?? req.prayer_count ?? 0;
              const repliesCount = req.replies ?? req.comments ?? 0;
              const hasPrayed = !!req.has_prayed;
              const isRepliesOpen = !!openReplies[req.id];
              const commentsList = commentsMap[req.id] || [];
              const isLoadingComm = !!loadingComments[req.id];
              const isSubmittingComm = !!submittingComment[req.id];

              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-border/70 bg-white p-5 md:p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-card dark:border-border"
                >
                  {/* Top Row: Author & Time + Praise Report Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {req.avatar ? (
                        <img
                          src={req.avatar}
                          alt={req.author ?? 'User'}
                          className="h-11 w-11 rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EFE8DC] font-serif text-base font-semibold text-[#8C6B30] dark:bg-primary/20 dark:text-primary">
                          {(req.author || 'A').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-foreground text-base">
                          {req.author || 'Anonymous'}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(req.created_at)}
                        </span>
                      </div>
                    </div>

                    {req.type === 'praise' && (
                      <span className="rounded-full bg-[#FAF4EB] px-3 py-1 text-xs font-medium text-[#C69A50] border border-[#F0E4D2] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                        Praise Report
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <p className="mt-4 text-sm md:text-base leading-relaxed text-foreground/90 font-light whitespace-pre-line">
                    {req.description}
                  </p>

                  {/* Horizontal Divider */}
                  <div className="my-4 border-t border-border/60" />

                  {/* Action Row: Prayed & Replies Buttons */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground font-light">
                    <button
                      onClick={() => handlePrayForRequest(req.id)}
                      className={`inline-flex items-center gap-1.5 transition-colors ${
                        hasPrayed ? 'text-[#C69A50] font-medium dark:text-primary' : 'hover:text-foreground'
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          hasPrayed ? 'fill-[#C69A50] text-[#C69A50] dark:fill-primary dark:text-primary' : ''
                        }`}
                      />
                      <span>{prayCount} Prayed</span>
                    </button>

                    <button
                      onClick={() => toggleReplies(req.id)}
                      className={`inline-flex items-center gap-1.5 transition-colors ${
                        isRepliesOpen ? 'text-foreground font-medium' : 'hover:text-foreground'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{repliesCount} {repliesCount === 1 ? 'Reply' : 'Replies'}</span>
                    </button>
                  </div>

                  {/* Expandable Reply Section */}
                  {isRepliesOpen && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
                      {isLoadingComm ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#C69A50]" /> Loading replies...
                        </div>
                      ) : commentsList.length === 0 ? (
                        <p className="text-xs text-muted-foreground font-light italic">
                          No replies yet. Be the first to leave an encouraging word!
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {commentsList.map((comm) => (
                            <div
                              key={comm.id}
                              className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3 text-xs"
                            >
                              <CornerDownRight className="h-3.5 w-3.5 text-[#C69A50] mt-0.5 shrink-0" />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-foreground">{comm.author}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatTimeAgo(comm.created_at)}
                                  </span>
                                </div>
                                <p className="text-foreground/90 leading-relaxed font-light">
                                  {comm.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Form */}
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          placeholder="Write an encouraging reply..."
                          value={newCommentText[req.id] || ''}
                          onChange={(e) =>
                            setNewCommentText((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handlePostReply(req.id);
                            }
                          }}
                          className="h-9 text-xs rounded-full bg-muted/30 px-4"
                        />
                        <button
                          onClick={() => handlePostReply(req.id)}
                          disabled={isSubmittingComm || !(newCommentText[req.id] || '').trim()}
                          className="inline-flex h-9 items-center justify-center rounded-full bg-[#C69A50] px-4 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#b88c44] disabled:opacity-50 dark:bg-primary dark:text-primary-foreground"
                        >
                          {isSubmittingComm ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Reply'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── TAB 2: SUBMIT REQUEST ─── */}
      {activeTab === 'submit' && (
        <Card className="rounded-2xl border border-border/70 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="font-serif text-2xl font-medium text-foreground">Submit a Request</h3>
            <p className="text-sm font-light text-muted-foreground mt-1">
              Share your prayer need or praise report with the community. (Submissions are reviewed prior to posting on the wall.)
            </p>
          </div>

          {submittedSuccess && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Your request has been submitted for review and will appear on the wall once approved!</span>
            </div>
          )}

          {/* Toggle Type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRequestType('request')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                requestType === 'request'
                  ? 'bg-[#C69A50] text-white shadow-sm dark:bg-primary dark:text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Prayer Request
            </button>
            <button
              type="button"
              onClick={() => setRequestType('praise')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                requestType === 'praise'
                  ? 'bg-[#C69A50] text-white shadow-sm dark:bg-primary dark:text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Praise Report
            </button>
          </div>

          <Textarea
            placeholder={
              requestType === 'praise'
                ? 'Share what God has done in your life...'
                : 'Share the details of your prayer need...'
            }
            className="min-h-[130px] rounded-xl text-sm leading-relaxed"
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Input
              placeholder="Your name (optional)"
              value={authorName}
              disabled={anonymous}
              onChange={(e) => setAuthorName(e.target.value)}
              className="flex-1 rounded-xl text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-input text-[#C69A50] focus:ring-[#C69A50]"
              />
              Post anonymously
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !newRequest.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#C69A50] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#b88c44] disabled:opacity-50 dark:bg-primary dark:text-primary-foreground"
          >
            <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit to Prayer Wall'}
          </button>
        </Card>
      )}

      {/* ─── TAB 3: MY REQUESTS ─── */}
      {activeTab === 'mine' && (
        <div className="space-y-4">
          {loadingMine ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : myRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              <p className="mb-2 text-lg font-medium text-foreground">No active requests</p>
              <p className="font-light text-sm">When you submit prayer requests, you can track their approval status and prayers here.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => setActiveTab('submit')}
              >
                Submit a Request
              </Button>
            </div>
          ) : (
            myRequests.map((req) => (
              <Card key={req.id} className="rounded-2xl border border-border/70 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground text-base">{req.title || 'Prayer Request'}</span>
                      <Badge variant={req.type === 'praise' ? 'default' : 'secondary'} className="text-[10px]">
                        {req.type === 'praise' ? 'Praise Report' : 'Prayer Request'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Submitted {formatTimeAgo(req.created_at)}
                      {req.is_anonymous && <span>· Posted anonymously</span>}
                    </div>
                  </div>
                  <div>{getStatusBadge(req.status)}</div>
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-line font-light">{req.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-[#C69A50] dark:text-primary">
                    <Heart className="h-3.5 w-3.5 fill-[#C69A50] dark:fill-primary" /> {req.prays ?? req.prayer_count ?? 0} Prayed
                  </span>

                  <div className="flex items-center gap-2">
                    {req.status !== 'answered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAnswered(req.id)}
                        className="h-8 gap-1 text-xs rounded-full"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark Answered
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMyRequest(req.id)}
                      className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
