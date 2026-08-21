import { useState, useEffect } from 'react';
import {
  Globe, Heart, Users, PenSquare, MessageSquare, Share2,
  MoreHorizontal, Edit3, Trash2, Flag, Send, Check, X,
  Loader2, Sparkles, MessageCircle
} from 'lucide-react';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface CommunityPost {
  id: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_icon: string;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_profile_image?: string | null;
  author_role?: string;
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_profile_image?: string | null;
  author_role?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: '91000000-0000-0000-0000-000000000001', name: 'General', slug: 'general', icon: 'Globe' },
  { id: '91000000-0000-0000-0000-000000000002', name: 'Prayer Wall', slug: 'prayer-wall', icon: 'Heart' },
  { id: '91000000-0000-0000-0000-000000000003', name: 'Local Groups', slug: 'local-groups', icon: 'Users' },
];

export function CommunityPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modals & UI States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editPost, setEditPost] = useState<CommunityPost | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create / Edit Form State
  const [postContent, setPostContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORIES[0].id);

  // Comment Thread Open states
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  // Share feedback toast
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Active 3-dots menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Load Categories & Posts
  const fetchPosts = async () => {
    try {
      setError(false);
      const data = await api.getCommunityPosts({
        category: activeCategory === 'all' ? undefined : activeCategory,
      });
      setPosts(asList<CommunityPost>(data));
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const cats = await api.getCommunityCategories();
        const catList = asList<Category>(cats);
        if (catList.length > 0) {
          setCategories(catList);
          setSelectedCategoryId(catList[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [activeCategory]);

  // Handle Like Toggle
  const handleToggleLike = async (post: CommunityPost) => {
    const prevLiked = post.has_liked;
    const prevCount = post.likes_count;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              has_liked: !prevLiked,
              likes_count: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : p
      )
    );

    try {
      if (prevLiked) {
        await api.unlikeCommunityPost(post.id);
      } else {
        await api.likeCommunityPost(post.id);
      }
    } catch (err) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, has_liked: prevLiked, likes_count: prevCount } : p
        )
      );
    }
  };

  // Handle Comments Accordion
  const toggleComments = async (postId: string) => {
    const isOpen = openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }));

    if (!isOpen && !commentsMap[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const comments = await api.getCommunityComments(postId);
        setCommentsMap((prev) => ({ ...prev, [postId]: asList<Comment>(comments) }));
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const newComment = await api.createCommunityComment(postId, text);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await api.deleteCommunityComment(commentId);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
        )
      );
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Share link handler
  const handleSharePost = (postId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/community?post=${postId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    const catId = selectedCategoryId || categories[0]?.id;

    setIsSubmitting(true);
    try {
      const newPost = await api.createCommunityPost({
        content: postContent.trim(),
        categoryId: catId,
      });
      setPosts((prev) => [newPost, ...prev]);
      setPostContent('');
      setCreateModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create post:', err);
      alert(err.message || 'Failed to publish post. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Post
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost || !postContent.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await api.updateCommunityPost(editPost.id, {
        content: postContent.trim(),
        categoryId: selectedCategoryId || editPost.category_id,
      });
      setPosts((prev) => prev.map((p) => (p.id === editPost.id ? updated : p)));
      setEditPost(null);
      setPostContent('');
    } catch (err) {
      console.error('Failed to update post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setActiveMenuId(null);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Report Post
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportPost) return;

    setIsSubmitting(true);
    try {
      await api.reportCommunityPost(reportPost.id, reportReason);
      alert('Thank you. Your report has been submitted to the moderation team.');
      setReportPost(null);
    } catch (err) {
      console.error('Failed to report post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'general':
        return <Globe className="h-4 w-4 shrink-0" />;
      case 'prayer-wall':
        return <Heart className="h-4 w-4 shrink-0" />;
      case 'local-groups':
        return <Users className="h-4 w-4 shrink-0" />;
      default:
        return <Sparkles className="h-4 w-4 shrink-0" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} hours ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-background pb-16">
      {/* Main Container */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-10">
        {/* Top Header Section */}
        <div className="mb-6 flex items-center justify-between border-b border-[#EBE3D5] pb-6 dark:border-border">
          <div>
            <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl text-[#1F1F1F] dark:text-foreground">
              Our <span className="italic font-light text-[#C59B46]">Community</span>
            </h1>
          </div>

          {/* Create Post Circular Button */}
          <button
            onClick={() => {
              setPostContent('');
              if (categories.length > 0) setSelectedCategoryId(categories[0].id);
              setCreateModalOpen(true);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C59B46] text-white shadow-sm transition-all hover:bg-[#b0873a] hover:scale-105 active:scale-95 shrink-0"
            title="Create Post"
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filter Pills (Exact Match) */}
        <div className="mb-8 flex flex-wrap items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-[#C59B46] text-white shadow-sm'
                : 'bg-white text-foreground/80 border border-[#E5DEC9] hover:bg-[#FAF6ED] dark:bg-card dark:border-border'
            }`}
          >
            All Posts
          </button>

          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#C59B46] text-white shadow-sm'
                    : 'bg-white text-foreground/80 border border-[#E5DEC9] hover:bg-[#FAF6ED] dark:bg-card dark:border-border'
                }`}
              >
                {getCategoryIcon(cat.slug)}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-[#E5DEC9]/80 bg-white/70 p-6 dark:bg-card/60"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-sm font-medium text-destructive">Failed to load community feed.</p>
            <Button onClick={fetchPosts} variant="outline" size="sm" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5DEC9] bg-white/70 py-16 text-center dark:bg-card/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C59B46]/10 text-[#C59B46]">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-medium text-foreground">No posts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground font-light">
              Be the first to share something with the community!
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#C59B46] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#b0873a] transition-all"
            >
              <PenSquare className="h-4 w-4" />
              Create Post
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => {
              const isAuthor = profile?.id === post.author_id;
              const isMenuOpen = activeMenuId === post.id;
              const postComments = commentsMap[post.id] || [];
              const isCommentsOpen = openComments[post.id];

              const initials = `${post.author_first_name?.[0] || ''}${post.author_last_name?.[0] || ''}`.toUpperCase();

              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-[#ECE4D5] bg-white p-6 shadow-sm transition-all hover:border-[#C59B46]/30 dark:bg-card dark:border-border"
                >
                  {/* Card Header: Exact Reference Match */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar Circle with Initials */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[#F5EFE6] text-sm font-serif font-semibold text-[#8C7138] dark:bg-[#C59B46]/20 dark:text-[#C59B46]">
                        {post.author_profile_image ? (
                          <img
                            src={post.author_profile_image}
                            alt={`${post.author_first_name} ${post.author_last_name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      {/* Author Info & Subtitle */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-[15px] sm:text-base">
                            {post.author_first_name} {post.author_last_name}
                          </h4>
                          {post.author_role && (
                            <span className="rounded-full bg-[#E5E7EB] px-2.5 py-0.5 text-[11px] font-medium text-[#374151] dark:bg-muted dark:text-muted-foreground">
                              {post.author_role}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-normal mt-0.5">
                          <span>{formatTimeAgo(post.created_at)}</span>
                          <span className="mx-1.5">•</span>
                          <span className="text-[#B38838] font-medium">
                            {post.category_name || 'General Discussion'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Three-dots menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : post.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                        title="More options"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                          {isAuthor ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditPost(post);
                                  setPostContent(post.content);
                                  setSelectedCategoryId(post.category_id);
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit Post
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Post
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setReportPost(post);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Flag className="h-3.5 w-3.5" />
                              Report Post
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content Body */}
                  <div className="mt-4 text-[15px] sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-normal">
                    {post.content}
                  </div>

                  {/* Footer Interaction Bar */}
                  <div className="mt-6 flex items-center justify-between border-t border-[#F0EBE1] pt-3.5 dark:border-border/60">
                    <div className="flex items-center gap-6 sm:gap-7">
                      {/* Like Button */}
                      <button
                        onClick={() => handleToggleLike(post)}
                        className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                          post.has_liked
                            ? 'text-rose-500 font-semibold'
                            : 'text-muted-foreground hover:text-rose-500'
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 transition-transform ${
                            post.has_liked ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                        <span>{post.likes_count}</span>
                      </button>

                      {/* Comment Button */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-[#C59B46] transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments_count}</span>
                      </button>
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Share post"
                    >
                      {copiedPostId === post.id ? (
                        <span className="text-xs font-medium text-emerald-600">Copied!</span>
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Expandable Comments Section */}
                  {isCommentsOpen && (
                    <div className="mt-4 pt-4 border-t border-dashed border-[#ECE4D5] dark:border-border space-y-3">
                      {/* Comment Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          className="flex-1 rounded-full border border-[#E5DEC9] bg-[#FAF6ED]/60 px-4 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[#C59B46] focus:outline-none dark:bg-card dark:border-border"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C59B46] text-white disabled:opacity-40 transition-all hover:bg-[#b0873a] shrink-0"
                          title="Send"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Comments List */}
                      {loadingComments[post.id] ? (
                        <div className="py-3 text-center text-xs text-muted-foreground">
                          Loading comments...
                        </div>
                      ) : postComments.length === 0 ? (
                        <div className="py-2 text-center text-xs text-muted-foreground font-light">
                          No comments yet.
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {postComments.map((c) => {
                            const isCommentAuthor = profile?.id === c.author_id;
                            return (
                              <div
                                key={c.id}
                                className="group flex items-start justify-between gap-3 rounded-xl bg-[#FAF6ED]/60 p-3 dark:bg-muted/30"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-serif font-bold text-[#8C7138] ring-1 ring-[#C59B46]/20 dark:bg-card">
                                    {`${c.author_first_name?.[0] || ''}${c.author_last_name?.[0] || ''}`.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground">
                                        {c.author_first_name} {c.author_last_name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatTimeAgo(c.created_at)}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-foreground/90">{c.content}</p>
                                  </div>
                                </div>

                                {isCommentAuthor && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, c.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Create Post Modal (Exact Reference Match) ────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-2xl dark:bg-card dark:border-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EBE3D5] pb-4 dark:border-border">
              <h3 className="font-serif text-2xl font-normal text-foreground">
                Create <span className="italic font-light text-[#C59B46]">Post</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-5 space-y-5">
              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">
                  Select Category
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-medium border transition-all ${
                          isSelected
                            ? 'bg-[#C59B46] text-white border-[#C59B46] shadow-sm'
                            : 'bg-[#FAF6ED]/70 text-foreground border-[#E5DEC9] hover:border-[#C59B46]/60 dark:bg-card dark:border-border'
                        }`}
                      >
                        {getCategoryIcon(cat.slug)}
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">
                  What's on your heart?
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write something encouraging..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5DEC9] bg-white p-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#C59B46] focus:outline-none dark:bg-card dark:border-border resize-none leading-relaxed"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full border border-[#E5DEC9] bg-white px-6 py-2.5 text-sm font-medium text-foreground hover:bg-[#FAF6ED] transition-all dark:bg-card dark:border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !postContent.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-[#C59B46] px-7 py-2.5 text-sm font-medium text-white shadow hover:bg-[#b0873a] disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Post Modal ────────────────────────────────────────────────── */}
      {editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#E5DEC9] bg-white p-6 shadow-2xl dark:bg-card dark:border-border">
            <div className="flex items-center justify-between border-b border-[#EBE3D5] pb-4 dark:border-border">
              <h3 className="font-serif text-2xl font-normal text-foreground">Edit Post</h3>
              <button
                onClick={() => setEditPost(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePost} className="mt-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">
                  Select Category
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-medium border transition-all ${
                          isSelected
                            ? 'bg-[#C59B46] text-white border-[#C59B46] shadow-sm'
                            : 'bg-[#FAF6ED]/70 text-foreground border-[#E5DEC9] hover:border-[#C59B46]/60 dark:bg-card dark:border-border'
                        }`}
                      >
                        {getCategoryIcon(cat.slug)}
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">
                  Content
                </label>
                <textarea
                  rows={6}
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5DEC9] bg-white p-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#C59B46] focus:outline-none dark:bg-card dark:border-border resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditPost(null)}
                  className="rounded-full border border-[#E5DEC9] bg-white px-6 py-2.5 text-sm font-medium text-foreground hover:bg-[#FAF6ED] transition-all dark:bg-card dark:border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !postContent.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-[#C59B46] px-7 py-2.5 text-sm font-medium text-white shadow hover:bg-[#b0873a] disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Report Post Modal ──────────────────────────────────────────────── */}
      {reportPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-2xl dark:bg-card">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2 text-destructive">
                <Flag className="h-5 w-5" />
                Report Post
              </h3>
              <button
                onClick={() => setReportPost(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="mt-5 space-y-4">
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Please select the reason for reporting this post. Our pastoral team will review it.
              </p>

              <div className="space-y-2">
                {[
                  'Inappropriate content',
                  'Spam or advertising',
                  'Harassment or disrespectful language',
                  'False or misleading teaching',
                  'Other reason',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                      reportReason === reason
                        ? 'border-[#C59B46] bg-[#FAF6ED] text-[#C59B46] dark:bg-[#C59B46]/10'
                        : 'border-border bg-card text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="accent-[#C59B46]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReportPost(null)}
                  className="rounded-full px-4"
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-xs font-medium text-white shadow hover:bg-destructive/90 transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
