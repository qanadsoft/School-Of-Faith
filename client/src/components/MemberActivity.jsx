import { formatDateTime } from "../utils/format";

export default function MemberActivity({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.description}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                {item.activity_type.replaceAll("_", " ")}
              </p>
            </div>
            <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
