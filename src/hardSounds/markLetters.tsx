// src/hardSounds/markLetters.tsx — a Greek text with the letters of a Hard sounds lesson marked (HardSoundLesson.tsx's verse step and ./Word.tsx).
import type { ReactNode } from 'react';

const base = (c: string): string => c.normalize('NFD').charAt(0).toLowerCase();

/** `text` with every stretch spelt with one of `letters` marked, breathings, accents and capitals aside. */
export function markLetters(text: string, letters: readonly string[]): ReactNode[] {
  const chars = [...text];
  const out: ReactNode[] = [];
  let plain = '';
  for (let i = 0; i < chars.length; ) {
    const hit = letters.find((l) => [...l].every((c, k) => chars[i + k] !== undefined && base(chars[i + k]) === base(c)));
    if (!hit) {
      plain += chars[i++];
      continue;
    }
    if (plain) out.push(plain);
    plain = '';
    const n = [...hit].length;
    out.push(
      <mark key={i} className="rounded-sm bg-accent text-accent-fg">
        {chars.slice(i, i + n).join('')}
      </mark>,
    );
    i += n;
  }
  if (plain) out.push(plain);
  return out;
}
