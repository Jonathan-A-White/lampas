// src/WordCognate.tsx — 'An English cousin' (mw-5r3p30.988): the English word that really comes from a Greek word, src/data/cognates.ts, drawn where he learns the word (the teach sheet,
// under the gloss) and on the word's sheet he can always go back to. A word with no cousin draws nothing, and so does any word when the app's language is not English. The Greek is set in the Greek face.
import { GreekRuns } from './FacetLabel';
import { cognateOf } from './data/cognates';

const TITLE = 'An English cousin';

export function WordCognate({ lemma, className = '' }: { lemma: string; className?: string }) {
  const cognate = cognateOf(lemma);
  if (!cognate) return null;
  return (
    <div role="group" aria-label={TITLE} data-testid="word-cognate" className={`rounded-xl border border-line px-3 py-2 ${className}`}>
      <p className="text-sm text-muted">{TITLE}</p>
      <p lang="en" className="mt-1 break-words text-base leading-snug">
        <span className="text-xl font-bold">{cognate.english}</span>
        <GreekRuns text={` (${cognate.piece}): ${cognate.line}`} size="text-xl" />
      </p>
    </div>
  );
}
