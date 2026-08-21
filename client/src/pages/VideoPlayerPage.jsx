import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, Bookmark, BookmarkCheck } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { apiFetch } from "../utils/api";
import { useAuth } from "../state/auth-context";
import { formatDate } from "../utils/format";
import StatePanel from "../components/StatePanel";

export default function VideoPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const videoRef = useRef(null);
  
  const videoData = useApi(`/videos/${id}`);
  const progressData = useApi(`/member/video-progress/${id}`);
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveProgress = async (completed = false) => {
    const el = videoRef.current;
    if (!el || !el.duration || isNaN(el.duration)) return;
    
    const pct = (el.currentTime / el.duration) * 100;
    const isCompleted = completed || pct >= 95;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    
    try {
      await fetch(`${apiBase}/member/video-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId: id,
          lastPositionSeconds: Math.floor(el.currentTime),
          watchDurationSeconds: Math.floor(el.currentTime),
          progressPercentage: Math.round(pct * 100) / 100,
          isCompleted,
        }),
        keepalive: true
      });
    } catch (err) {
      // Silently fail — progress save is best-effort
    }
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let throttleTimeout = null;

    const handleLoadedMetadata = () => {
      const lastPos = progressData.data?.last_position_seconds;
      if (lastPos && lastPos > 0 && lastPos < el.duration) {
        el.currentTime = lastPos;
      }
    };

    const handleTimeUpdate = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          saveProgress();
          throttleTimeout = null;
        }, 15000);
      }
    };

    const handlePause = () => {
      saveProgress();
    };

    const handleEnded = () => {
      saveProgress(true);
    };

    const handleBeforeUnload = () => {
      saveProgress();
    };

    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handleEnded);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      saveProgress();
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handleEnded);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [progressData.data, id, token]);

  const toggleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        setIsSaved(false);
      } else {
        await apiFetch("/member/saved-messages", {
          method: "POST",
          body: JSON.stringify({ messageId: id })
        }, token);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      setIsSaving(false);
    }
  };

  const video = videoData.data;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4db_0,#f8efe3_30%,#eef4ff_100%)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6 pb-24 md:pb-8">
        <button onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <StatePanel
          loading={videoData.loading}
          error={videoData.error}
          hasData={!!video}
          emptyText="Video not found."
        >
          {video && (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[24px] bg-black shadow-lg">
                <video
                  ref={videoRef}
                  controls
                  src={video.video_url}
                  poster={video.thumbnail_url}
                  className="aspect-video w-full bg-black"
                />
              </div>

              <div className="flex flex-col gap-6 rounded-[24px] border border-slate-100 bg-white/75 p-6 shadow-sm backdrop-blur md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl space-y-4">
                  {video.topics && video.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {video.topics.map(topic => (
                        <span key={topic.slug} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {topic.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <h1 className="font-serif text-2xl text-slate-900 md:text-3xl">{video.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{video.speaker}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDate(video.published_at)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {Math.floor(video.duration_minutes / 60) > 0 ? `${Math.floor(video.duration_minutes / 60)}h ${video.duration_minutes % 60}m` : `${video.duration_minutes}m`}</span>
                  </div>
                </div>

                <button 
                  onClick={toggleSave}
                  disabled={isSaving}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${isSaved ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900'}`}
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </StatePanel>
      </div>
    </main>
  );
}
