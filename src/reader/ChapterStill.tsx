// src/reader/ChapterStill.tsx — what the Reader says when its chapter has been loading for 8 s (mw-5r3p30.846): still loading, with Try again and a way to
// choose another chapter; when the database is blocked by an older Lampas tab it says that is why, and otherwise it says which part has not come: the chapter's text, or
// the saved settings the Reader reads it with (mw-5r3p30.1040).
export function ChapterStill({
  title,
  blocked,
  chapterHere,
  onRetry,
  onPick,
}: {
  title: string;
  blocked: boolean;
  /** the chapter's text has arrived; what is missing is the saved settings */
  chapterHere: boolean;
  onRetry(): void;
  onPick(): void;
}) {
  return (
    <div role="status" className="px-4 pt-6 text-center">
      <p className="text-lg">Still loading {title}</p>
      {blocked ? (
        <p className="mt-2 text-base text-muted">Lampas is open in another tab: close it</p>
      ) : (
        <p className="mt-2 text-base text-muted">
          {chapterHere ? 'The chapter is here but your saved settings are not opening: close your other Lampas tabs, then tap Try again' : 'The chapter has not come yet: check your connection, then tap Try again'}
        </p>
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
