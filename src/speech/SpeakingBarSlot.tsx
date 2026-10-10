// src/speech/SpeakingBarSlot.tsx — where bsv-kit/speech's one SpeakingBar (Pause / Resume, Restart, Stop) is drawn (mw-m7v5kc.3). It shows while
// the app reads something aloud: a verse, a chapter, the tutor's answer (greek.ts READ_KEY); a word said alone, by a long press or a speaker,
// is over in a moment and has no bar. A screen with a bottom edge leaves a <BarSlot level> there, and the bar is drawn into the highest
// one that is on screen: the shell's foot (level 0), the Reader above its Talk bar (1), the Verse view above its hold bar (2), the Talk sheet above its
// foot (3). So there is one bar, in flow and never over text or behind a sheet, and a screen that pushes its own controls up stays reachable.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { SpeakingBar } from 'bsv-kit/speech/react';
import { useBarShown } from './barShown';
import { restartListen } from './readAloud';

interface Slot {
  el: HTMLElement;
  level: number;
}

let slots: Slot[] = [];
let top: HTMLElement | null = null;
const listeners = new Set<() => void>();

function register(slot: Slot): () => void {
  slots = [...slots, slot];
  refresh();
  return () => {
    slots = slots.filter((s) => s !== slot);
    refresh();
  };
}

/** The highest slot, the latest one on a tie. */
function refresh(): void {
  const best = slots.reduce<Slot | null>((chosen, s) => (chosen === null || s.level >= chosen.level ? s : chosen), null);
  const next = best?.el ?? null;
  if (next === top) return;
  top = next;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A place the bar may be drawn. `inset` pads it with the phone's bottom inset: the slot is the last thing on the screen. */
export function BarSlot({ level, inset = false }: { level: number; inset?: boolean }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => (el ? register({ el, level }) : undefined), [el, level]);
  return <div ref={setEl} data-speaking-slot={level} className={inset ? 'speaking-slot speaking-inset' : 'speaking-slot'} />;
}

/** The one bar, mounted once (App.tsx); drawn into the highest BarSlot on screen. */
export function LampasSpeakingBar() {
  const slot = useSyncExternalStore(subscribe, () => top, () => null);
  const shown = useBarShown();
  if (!slot || !shown) return null;
  // Restart on a Listen goes back to the first verse of the passage (readAloud.ts restartListen); on any other reading the package restarts the speech.
  return createPortal(
    <div
      className="contents"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest('[data-action="restart"]') && restartListen()) e.stopPropagation();
      }}
    >
      <SpeakingBar />
    </div>,
    slot,
  );
}
