export function formatVideoDuration(durationMinutes?: number) {
  if (!durationMinutes || durationMinutes <= 0) return '—';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return hours > 0
    ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
    : `${minutes}m`;
}
