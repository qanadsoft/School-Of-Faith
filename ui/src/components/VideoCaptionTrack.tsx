export function VideoCaptionTrack({ src }: { src?: string | null }) {
  if (!src) return null;
  return <track kind="captions" src={src} srcLang="en" label="English" />;
}
