export default function StatePanel({ loadingText = "Loading profile...", emptyText, error, loading, hasData, children }) {
  if (loading) {
    return <div className="rounded-3xl border border-white/70 bg-white/75 px-5 py-6 text-sm text-slate-600 shadow-sm">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700 shadow-sm">
        Unable to load your information. Please try again.
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/65 px-5 py-6 text-sm text-slate-500 shadow-sm">
        {emptyText}
      </div>
    );
  }

  return children;
}
