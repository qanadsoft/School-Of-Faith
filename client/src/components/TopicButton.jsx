import { useNavigate } from "react-router-dom";

export default function TopicButton({ topic, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(topic);
    } else {
      navigate(`/watch/topic/${topic.slug}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-base font-medium transition-colors hover:border-amber-400 hover:bg-amber-50"
    >
      {topic.name}
    </button>
  );
}
