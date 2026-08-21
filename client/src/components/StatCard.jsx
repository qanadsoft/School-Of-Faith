export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: accent }}
        >
          <Icon className="h-5 w-5 text-slate-900" />
        </span>
      </div>
      <div className="mt-4 text-3xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}
