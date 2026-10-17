// src/reader/LinkNotice.tsx — the one-line notice a link that Lampas did not hold exactly leaves under the header (docs/links.md), with Dismiss. A link to a place in
// the Old Testament (`elsewhere`) adds the line the tutor's reference card has: Open in Logos when Logos is on, else a link to Settings to link it.
import { ElsewhereLine, type ElsewherePlace } from '../markdown/ReferenceCard';
import { openHash } from '../nav/route';

export function LinkNotice({ text, elsewhere, onDismiss }: { text: string; elsewhere?: ElsewherePlace; onDismiss(): void }) {
  return (
    <div role="status" data-link-notice className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-1 text-sm">
      <div className="min-w-0 flex-1">
        <p>{text}</p>
        {elsewhere ? <ElsewhereLine place={elsewhere} said={false} onSettings={() => openHash('#/settings?section=resources')} /> : null}
      </div>
      <button type="button" onClick={onDismiss} className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
        Dismiss
      </button>
    </div>
  );
}
