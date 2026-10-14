// src/ui/GreekMarked.tsx — a stretch of English prose with its Greek marked (lang grc), so the Greek font and the Greek voice find it, drawn in the
// app's Greek type (Gentium Plus at --lp-greek-size) as everywhere else. The essay (src/Essay.tsx) and the idea sheet's teaching use it.
import type { ReactNode } from 'react';

// a hyphen right before Greek is part of it: '-ου' is an ending
const GREEK = /(-?[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿ ,-]*[Ͱ-Ͽἀ-῿]|-?[Ͱ-Ͽἀ-῿])/;

/** `greekClass` is how the Greek is drawn: the reading size by default; a table passes the Greek face alone, at the size around it. */
export function greekMarked(text: string, greekClass = 'font-greek text-[length:var(--lp-greek-size)]'): ReactNode {
  return text.split(GREEK).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} lang="grc" className={greekClass}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}
