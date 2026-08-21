export default function ReadingPlanCard({ plan }) {
  const totalDays = plan?.totalDays || plan?.total_days || 0;
  const completedDays = plan?.completedDays || 0;
  const completionPct = plan?.completionPct || 0;
  const currentDay = plan?.currentDay || 0;

  return (
    <div className="rounded-[32px] border border-[#e5dccc] bg-[#fffaf1] p-6 shadow-[0_24px_60px_rgba(180,147,74,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Reading Plan</p>
          <h3 className="mt-2 font-serif text-2xl text-slate-900">{plan?.title}</h3>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {completedDays}/{totalDays}
        </div>
      </div>
      <div className="mt-5 h-3 rounded-full bg-white">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
          style={{ width: `${completionPct}%` }}
        />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-600">Day {currentDay}/{totalDays}</p>
          <p className="text-xs text-slate-500">{completionPct}% Complete</p>
        </div>
        <p className="text-sm font-semibold text-slate-700">Stay steady in the Word.</p>
      </div>
    </div>
  );
}
