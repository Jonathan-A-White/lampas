// src/GuessedNumber.tsx — the Strong's number of a variant word that no source has (mw-9ji6ek0.44): shown with a small 'guess' mark, and a tap on the mark says in one line why it is
// a guess and where the exact numbers come from. The data build (scripts/data/variantWords.ts) marks such a word `src: 'guess'`; the exact ones come from the lexicon by lemma
// and STEPBible's TAGNT and carry no mark.
import { useState } from 'react';

export const GUESS_WHY =
  "A guess: no source has this exact form, so this is the nearest lemma's number. The exact numbers come from the lexicon by lemma and from STEPBible's TAGNT.";

export function GuessedNumber({ number }: { number: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span>{number}</span>
      <button
        type="button"
        data-testid="sheet-guess"
        aria-expanded={open}
        aria-controls="sheet-guess-why"
        onClick={() => setOpen((v) => !v)}
        className="ml-2 inline-flex min-h-11 items-center rounded-full border border-line px-2 text-sm text-muted underline decoration-dotted underline-offset-4"
      >
        guess
      </button>
      {open ? (
        <p id="sheet-guess-why" data-testid="sheet-guess-why" className="text-sm text-muted">
          {GUESS_WHY}
        </p>
      ) : null}
    </>
  );
}
