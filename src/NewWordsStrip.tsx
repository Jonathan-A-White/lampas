// src/NewWordsStrip.tsx — 'New words: N' under the Reader's header: how many new words the chapter has for him today; a tap opens the
// teach sheet (src/TeachSheet.tsx). Not drawn at 0. A strip of its own, like DueBadge: the header has no room for it at 360 px.

export function NewWordsStrip({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      data-testid="new-words"
      onClick={onOpen}
      className="chrome-small min-h-12 w-full shrink-0 border-b border-line bg-accent/10 px-3 text-center font-semibold text-accent active:bg-line"
    >
      New words: {count}
    </button>
  );
}
