// src/reader/ChapterFailed.tsx — what the Reader says when its chapter cannot be fetched (docs/module-map.md R1): offline or not, Try again, and a way
// to choose another chapter.
export function ChapterFailed({ title, onRetry, onPick }: { title: string; onRetry(): void; onPick(): void }) {
  return (
    <div role="alert" className="px-4 pt-6 text-center">
      {navigator.onLine === false ? (
        <p className="text-lg">{title} is not on this phone yet, and you are offline. Connect to read it.</p>
      ) : (
        <p className="text-lg">Could not load {title}.</p>
      )}
      <button type="button" onClick={onRetry} className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg">
        Try again
      </button>
      <button type="button" onClick={onPick} className="mt-3 block min-h-12 w-full rounded-xl border border-line text-lg font-medium">
        Choose another chapter
      </button>
    </div>
  );
}
