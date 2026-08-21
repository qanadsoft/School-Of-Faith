import { ChevronRight } from "lucide-react";

export default function ProfileMenuItem({ title, subtitle, count, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-white/70 bg-white/80 text-slate-700 hover:border-slate-300"
      }`}
    >
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className={`mt-1 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}
