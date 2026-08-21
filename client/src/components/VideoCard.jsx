import { useNavigate } from "react-router-dom";
import { Play, Clock, Calendar } from "lucide-react";
import { formatDate } from "../utils/format";

export default function VideoCard({ video, progress, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(video);
    } else {
      navigate(`/watch/video/${video.id}`);
    }
  };

  const hours = Math.floor(video.duration_minutes / 60);
  const minutes = video.duration_minutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-200">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-10 w-10 text-white" />
        </div>
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-800/50">
            <div className="h-1 bg-amber-500" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
      <h3 className="mt-2 line-clamp-1 font-medium">{video.title}</h3>
      <p className="text-sm text-slate-500">{video.speaker}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
        <Clock className="h-3 w-3" /> {durationStr}
        <span>·</span>
        <Calendar className="h-3 w-3" /> {formatDate(video.published_at)}
      </div>
    </div>
  );
}
