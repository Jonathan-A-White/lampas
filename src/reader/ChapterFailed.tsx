// src/reader/ChapterFailed.tsx — what the Reader says when its chapter cannot be fetched (docs/module-map.md R1): 'offline' only on the browser's word, else 'could not be fetched'; Try again, a link
// to Keep on this phone, and a way to choose another chapter (src/ui/online.tsx, mw-lcv9z3g.4).
import { fetchFailedLine, useOnline } from '../ui/online';
import { KeepOnPhoneLink } from '../ui/KeepOnPhoneLink';

export function ChapterFailed({ title, onRetry, onPick }: { title: string; onRetry(): void; onPick(): void }) {
  const online = useOnline();
  return (
    <div role="alert" className="px-4 pt-6 text-center">
      <p className="text-lg">{fetchFailedLine(title, online)}{online ? '' : ' Connect to read it.'}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg">
        Try again
      </button>
      <KeepOnPhoneLink />
      <button type="button" onClick={onPick} className="mt-3 block min-h-12 w-full rounded-xl border border-line text-lg font-medium">
        Choose another chapter
      </button>
    </div>
  );
}
