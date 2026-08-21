export function AdminLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading {label}...</p>
    </div>
  );
}

export function AdminEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-muted-foreground">No {label} yet.</p>
    </div>
  );
}

export function AdminErrorState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-muted-foreground">Unable to load {label}. Please try again.</p>
    </div>
  );
}
