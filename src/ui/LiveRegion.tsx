// src/ui/LiveRegion.tsx — the polite live region src/ui/live.ts announces through: mounted once, always present, out of sight (sr-only), so a screen reader
// is already listening when its text changes.
import { useAnnouncement } from './live';

export function LiveRegion() {
  const said = useAnnouncement();
  return (
    <div data-live-region role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {said}
    </div>
  );
}
