import { useParams, Link, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "../state/auth-context";
import { useApi } from "../hooks/useApi";
import StatePanel from "../components/StatePanel";
import VideoCard from "../components/VideoCard";

export default function CategoryPage() {
  const { slug } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error } = useApi(`/videos/topics/${slug}/videos`);
  const continueWatching = useApi("/member/continue-watching");

  const category = data?.topic;
  const videos = data?.videos || [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4db_0,#f8efe3_30%,#eef4ff_100%)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-8 pb-24 md:pb-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/75 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">The School Of Faith</p>
            <h1 className="mt-1 font-serif text-3xl text-slate-900">Watch</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/member" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900">Dashboard</Link>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </header>

        <div>
          <button onClick={() => navigate("/watch")} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Watch
          </button>
          
          <StatePanel
            loading={loading}
            error={error}
            hasData={!!category}
            emptyText="Category not found."
          >
            {category && (
              <div className="mb-8">
                <h2 className="font-serif text-3xl text-slate-900">{category.name}</h2>
                <p className="mt-1 text-slate-500">{data.count} videos</p>
              </div>
            )}
            
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {videos.map(video => {
                  const progressItem = continueWatching.data?.find(item => item.id === video.id);
                  const progress = progressItem?.progress?.progress_percentage || progressItem?.progress_percentage;
                  return (
                    <VideoCard key={video.id} video={video} progress={progress} />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-8 text-center text-slate-500">
                No videos available in this category yet.
              </div>
            )}
          </StatePanel>
        </div>
      </div>
    </main>
  );
}
