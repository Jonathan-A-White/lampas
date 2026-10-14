// src/FacetLabel.tsx — the name of a facet (src/data/grammar/ladder.ts Facet) as text: a label with Greek in it is drawn in the Greek face at the Greek size (Drill it and Your drill plan).
const GREEK = /[Ͱ-Ͽἀ-῿]/;

export function FacetLabel({ label }: { label: string }) {
  const greek = GREEK.test(label);
  return (
    <span lang={greek ? 'grc' : undefined} className={greek ? 'font-greek text-[length:var(--lp-greek-size)]' : undefined}>
      {label}
    </span>
  );
}
