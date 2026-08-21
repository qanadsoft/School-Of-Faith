export default function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-2xl text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
