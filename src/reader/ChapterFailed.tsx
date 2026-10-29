// src/reader/ChapterFailed.tsx — what the Reader says when its chapter cannot be fetched (docs/module-map.md R1): 'you are offline' only on the browser's word, else 'could not be
// fetched'; Try again, a way to choose another chapter, and Keep the New Testament on this phone (src/reader/offlineWords.ts, src/reader/KeepOnPhoneLink.tsx).
import { KeepOnPhoneLink } from './KeepOnPhoneLink';
import { notFetched, useOnline } from './offlineWords';

export function ChapterFailed({ title, onRetry, onPick }: { title: string; onRetry(): void; onPick(): void }) {
  const online = useOnline();
  return (
    <div role="alert" className="px-4 pt-6 text-center">
      <p className="text-lg">{online ? notFetched(title, true) : `${notFetched(title, false)} Connect to read it.`}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg">
        Try again
      </button>
      <button type="button" onClick={onPick} className="mt-3 block min-h-12 w-full rounded-xl border border-line text-lg font-medium">
        Choose another chapter
      </button>
      <KeepOnPhoneLink className="mt-2 inline-block min-h-12 py-3 text-base text-accent underline" />
    </div>
  );
}
