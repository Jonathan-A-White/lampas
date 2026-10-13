// src/ui/TapBar.tsx — the wide bar for a thing that is TAPPED: the same size, place and colour as the hold bar (ui/HoldBar.tsx), but a tap does it and
// nothing needs a finger kept down. Hearing is always a tap, even one word (the Builders' guide, 12-speech-and-audio.md); only talking is a hold.
import type { ReactNode } from 'react';
import { barClass } from './barClass';

export function TapBar({ onTap, name, label, icon, testId, active = false }: {
  onTap: () => void;
  /** the accessible name, which stays the same while the icon changes */
  name: string;
  label: string;
  icon: ReactNode;
  testId?: string;
  /** what the bar starts is going on (a word being spoken): aria-pressed */
  active?: boolean;
}) {
  return (
    <button type="button" data-tap-bar="" data-testid={testId} aria-label={name} aria-pressed={active} onClick={onTap} className={barClass(false)}>
      {icon}
      <span aria-hidden="true">{label}</span>
    </button>
  );
}
