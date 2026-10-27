import { GREEK_LANG } from './script/greekLang';
import { HEBREW_LANG_ATTRS } from './reader/sourceText';
// src/FacetLabel.tsx — the name of a facet (src/data/grammar/ladder.ts Facet) as text, and GreekRuns, a line of English with Greek in it (the rule line of a sound
// rule, mw-i7xe0n.7): each run of Greek is marked lang el and drawn in the Greek face at the Greek size, the English around it in the app's own (Drill it and Your drill plan).
const GREEK_RUN = /([Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿ ,]*[Ͱ-Ͽἀ-῿]|[Ͱ-Ͽἀ-῿])/;
/** A run of Hebrew (a Hebrew letter in a question, mw-gdcyf98.11) is drawn right to left in the Hebrew face. */
const HEBREW_RUN = /([\u0590-\u05FF]+)/;

/** `size` is the Tailwind size class of a run; left out, the Greek size setting (a rule line); a question's sentence passes the choices' text-3xl (mw-86e9r1.31). */
export function GreekRuns({ text, size = 'text-[length:var(--lp-greek-size)]' }: { text: string; size?: string }) {
  return (
    <>
      {text.split(GREEK_RUN).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} {...GREEK_LANG} className={`font-greek ${size}`}>
            {part}
          </span>
        ) : (
          part.split(HEBREW_RUN).map((piece, j) =>
            j % 2 === 1 ? (
              <span key={`${i}:${j}`} {...HEBREW_LANG_ATTRS} dir="rtl" className={`script-he ${size}`}>
                {piece}
              </span>
            ) : (
              piece
            ),
          )
        ),
      )}
    </>
  );
}

export function FacetLabel({ label }: { label: string }) {
  return <GreekRuns text={label} />;
}
