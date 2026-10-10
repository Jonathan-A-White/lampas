// src/Away.tsx — a bar of the Reader that slides out of view with the Immersive reader (src/immersive.ts): it collapses to nothing, so the text
// takes its room, and is inert and hidden from the accessibility tree while it is away. With the setting Off the wrapper is `display: contents`:
// the bar is laid out exactly as if it were not here. The CSS is `.away-box` in src/index.css.
import type { ReactNode } from 'react';

export function Away({ enabled, away, children }: { enabled: boolean; away: boolean; children: ReactNode }) {
  return (
    <div className={enabled ? 'away-box' : 'contents'} data-away={away ? '' : undefined} aria-hidden={away ? true : undefined} inert={away}>
      <div className={enabled ? 'away-inner' : 'contents'}>{children}</div>
    </div>
  );
}
