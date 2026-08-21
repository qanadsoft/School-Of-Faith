import { useNavigate, Link } from "react-router-dom";
import { LogOut, Play, Clock } from "lucide-react";
import { useAuth } from "../state/auth-context";
import { useApi } from "../hooks/useApi";
import { formatDate } from "../utils/format";
import StatePanel from "../components/StatePanel";
import VideoCard from "../components/VideoCard";
import TopicButton from "../components/TopicButton";

export default function WatchPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const recentVideos = useApi("/videos/recent");
  const topics = useApi("/videos/topics");
  const continueWatching = useApi("/member/continue-watching");

  const featuredVideo = recentVideos.data?.[0];

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

        <StatePanel
          loading={recentVideos.loading}
          error={recentVideos.error}
          hasData={recentVideos.data && recentVideos.data.length > 0}
          emptyText="No recent videos available."
        >
          {featuredVideo && (() => {
            const hours = Math.floor(featuredVideo.duration_minutes / 60);
            const minutes = featuredVideo.duration_minutes % 60;
            const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            return (
              <section className="relative overflow-hidden rounded-2xl">
                <img src={featuredVideo.thumbnail_url} alt={featuredVideo.title} className="h-[300px] w-full object-cover md:h-[400px]" />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 md:p-8">
                  <div className="mb-3 w-fit rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    Latest Video
                  </div>
                  <h2 className="mb-2 font-serif text-3xl text-white md:text-5xl">{featuredVideo.title}</h2>
                  <div className="mb-6 flex items-center gap-4 text-sm text-white/80 md:text-base">
                    <span>{featuredVideo.speaker}</span>
                    <span>·</span>
                    <span>{formatDate(featuredVideo.published_at)}</span>
                    <span>·</span>
                    <span>{durationStr}</span>
                  </div>
                  <button 
                    onClick={() => navigate(`/watch/video/${featuredVideo.id}`)}
                    className="flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-white/90"
                  >
                    <Play className="h-5 w-5" /> Watch Now
                  </button>
                </div>
              </section>
            );
          })()}
        </StatePanel>

        {!continueWatching.loading && !continueWatching.error && continueWatching.data && continueWatching.data.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Continue Watching</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {continueWatching.data.map(item => (
                <VideoCard 
                  key={item.id} 
                  video={item} 
                  progress={item.progress?.progress_percentage || item.progress_percentage || 0} 
                />
              ))}
            </div>
          </section>
        )}

        <StatePanel
          loading={recentVideos.loading}
          error={recentVideos.error}
          hasData={recentVideos.data && recentVideos.data.length > 0}
          emptyText=""
        >
          {recentVideos.data && recentVideos.data.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Videos</h2>
                <button className="text-sm font-semibold text-amber-600 hover:text-amber-700">View All</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
                {recentVideos.data.map((msg) => {
                  const hours = Math.floor(msg.duration_minutes / 60);
                  const minutes = msg.duration_minutes % 60;
                  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                  return (
                    <div key={msg.id} onClick={() => navigate(`/watch/video/${msg.id}`)} className="w-[250px] shrink-0 cursor-pointer overflow-hidden rounded-[24px] border border-slate-100 bg-white/75 p-4 shadow-sm hover:border-amber-200">
                      <div className="relative mb-3 h-32 overflow-hidden rounded-xl bg-slate-200">
                        <img src={msg.thumbnail_url} alt={msg.title} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <div>
                        {msg.topics && msg.topics.length > 0 && (
                          <div className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            {msg.topics[0].name}
                          </div>
                        )}
                        <h3 className="line-clamp-1 text-sm font-semibold">{msg.title}</h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="h-3 w-3" /> {durationStr}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </StatePanel>

        <StatePanel
          loading={topics.loading}
          error={topics.error}
          hasData={topics.data && topics.data.length > 0}
          emptyText="No topics available."
        >
          {topics.data && topics.data.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Browse by Topic</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {topics.data.map((topic) => (
                  <TopicButton key={topic.id} topic={topic} />
                ))}
              </div>
            </section>
          )}
        </StatePanel>
      </div>
    </main>
  );
}
