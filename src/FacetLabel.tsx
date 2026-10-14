// src/FacetLabel.tsx — the name of a facet (src/data/grammar/ladder.ts Facet) as text, and GreekRuns, a line of English with Greek in it (the rule line of a sound
// rule, mw-i7xe0n.7): each run of Greek is marked lang grc and drawn in the Greek face at the Greek size, the English around it in the app's own (Drill it and Your drill plan).
const GREEK_RUN = /([Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿ ,]*[Ͱ-Ͽἀ-῿]|[Ͱ-Ͽἀ-῿])/;

export function GreekRuns({ text }: { text: string }) {
  return (
    <>
      {text.split(GREEK_RUN).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} lang="grc" className="font-greek text-[length:var(--lp-greek-size)]">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function FacetLabel({ label }: { label: string }) {
  return <GreekRuns text={label} />;
}
