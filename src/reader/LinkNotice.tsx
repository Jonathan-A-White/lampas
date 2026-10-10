// src/reader/LinkNotice.tsx — the one-line notice a link that Lampas did not hold exactly leaves under the header (docs/links.md), with Dismiss.
export function LinkNotice({ text, onDismiss }: { text: string; onDismiss(): void }) {
  return (
    <div role="status" data-link-notice className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-1 text-sm">
      <p className="min-w-0 flex-1">{text}</p>
      <button type="button" onClick={onDismiss} className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
        Dismiss
      </button>
    </div>
  );
}
