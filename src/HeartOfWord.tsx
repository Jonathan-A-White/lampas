// src/HeartOfWord.tsx — 'The heart of the word' (mw-bsf54t.14): the note src/data/wordHeart.ts keeps for a word that earns one, drawn the same way where he learns the word
// (the teach sheet), after a miss in Review, and as a row on the word's sheet he can always go back to. A word with no note draws nothing. The Greek in the note is set in the Greek face.
import { GreekRuns } from './FacetLabel';
import { wordHeart } from './data/wordHeart';

const TITLE = 'The heart of the word';

export function HeartOfWord({ lemma, className = '' }: { lemma: string; className?: string }) {
  const note = wordHeart(lemma);
  if (!note) return null;
  return (
    <div role="group" aria-label={TITLE} data-testid="word-heart" className={`rounded-xl border border-line px-3 py-2 ${className}`}>
      <p className="text-sm text-muted">{TITLE}</p>
      <p lang="en" className="mt-1 text-base leading-snug">
        <GreekRuns text={note} size="text-xl" />
      </p>
    </div>
  );
}
