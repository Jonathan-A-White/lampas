// src/handwriting/LessonWriteIt.tsx — the Write it part of a letter's lesson (mw-86e9r1.51): on the letter's sheet, after How it sounds, while Handwriting
// drills is on (On, or Automatic with a pen seen). It says why he writes until he has met his first Write it card, where he stands (Trace: 1 of 2 right) and
// opens Write it (WriteItScreen). Off, or Automatic with no pen seen, it is not drawn at all.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import type { GrammarIdea } from '../data/grammar/ladder';
import { getWhySeen, getWriteProgress } from '../data/repositories';
import { progressLine } from './progression';
import { useHandwritingOn } from './useHandwriting';
import { WhyLine } from './WriteIt';
import { WriteItScreen } from './WriteItScreen';

export function LessonWriteIt({ idea }: { idea: GrammarIdea }) {
  const on = useHandwritingOn();
  const glyph = idea.glyphs?.[0];
  const progress = useLiveQuery(() => (glyph ? getWriteProgress(glyph) : Promise.resolve(undefined)), [glyph]);
  const whySeen = useLiveQuery(getWhySeen, []);
  const [open, setOpen] = useState(false);
  if (!on || !glyph || !progress) return null;
  return (
    <section data-testid="lesson-write-it">
      <h3 className="mt-4 text-lg font-semibold">Write it</h3>
      {whySeen === false ? <WhyLine /> : null}
      <p data-testid="write-progress" className="mt-1 text-base text-muted">
        {progressLine(progress)}
      </p>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-12 w-full rounded-xl border border-accent px-4 text-lg font-medium text-accent active:bg-line">
        Write it
      </button>
      {open ? <WriteItScreen idea={idea} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
