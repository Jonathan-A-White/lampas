// src/data/irregular-aorists.ts — the high-frequency New Testament verbs whose aorist cannot be guessed from the present
// (mw-bsf54t.12): a suppletive stem (ἔρχομαι, ἦλθον) or a second aorist on a changed stem (βάλλω, ἔβαλον). Each carries its aorist at the end of
// its gloss, '(aorist ἦλθον)', as the BMA list gives λέγω; a regular verb (λύω, ἔλυσα) carries none, so the note says 'learn this one'.
// withAoristNote is run once where a gloss comes in (scripts/data-build.ts for the lexicon and every chapter's lex, scripts/seed-build.ts), like
// cleanGloss (gloss.ts), so no screen formats one. Runs under plain node too: erasable TypeScript only, no imports.

export interface IrregularAorist {
  /** the lemma as the data spells it (NFC): ἀποθνήσκω, not ἀποθνῄσκω */
  lemma: string;
  /** the first-person aorist active (or the one the text has) the gloss carries */
  aorist: string;
  /** when the text's aorist forms are filed under another lemma (ἐσθίω's ἔφαγον is under φαγεῖν) */
  formsLemma?: string;
  /** when the text lacks the form the gloss carries, an aorist form of the same stem it has (αἱρέω: εἷλον is not there, εἵλετο is) */
  evidence?: string;
}

/** The verbs the Governor named (mw-bsf54t.12) and, after them, the sweep of the top 300 by frequency: compounds of those, and the second aorists ἔστην, ἔβην, ἐγενόμην. */
export const IRREGULAR_AORISTS: readonly IrregularAorist[] = [
  { lemma: 'λέγω', aorist: 'εἶπον' },
  { lemma: 'ἔρχομαι', aorist: 'ἦλθον' },
  { lemma: 'ὁράω', aorist: 'εἶδον' },
  { lemma: 'ἐσθίω', aorist: 'ἔφαγον', formsLemma: 'φαγεῖν' },
  { lemma: 'φέρω', aorist: 'ἤνεγκα' },
  { lemma: 'ἔχω', aorist: 'ἔσχον' },
  { lemma: 'λαμβάνω', aorist: 'ἔλαβον' },
  { lemma: 'γινώσκω', aorist: 'ἔγνων' },
  { lemma: 'πίνω', aorist: 'ἔπιον' },
  { lemma: 'πίπτω', aorist: 'ἔπεσον' },
  { lemma: 'βάλλω', aorist: 'ἔβαλον' },
  { lemma: 'ἀποθνήσκω', aorist: 'ἀπέθανον' },
  { lemma: 'πάσχω', aorist: 'ἔπαθον' },
  { lemma: 'τρέχω', aorist: 'ἔδραμον' },
  { lemma: 'αἱρέω', aorist: 'εἷλον', evidence: 'εἵλετο' },
  // the sweep
  { lemma: 'γίνομαι', aorist: 'ἐγενόμην' },
  { lemma: 'εὑρίσκω', aorist: 'εὗρον' },
  { lemma: 'ἐξέρχομαι', aorist: 'ἐξῆλθον' },
  { lemma: 'εἰσέρχομαι', aorist: 'εἰσῆλθον' },
  { lemma: 'ἀπέρχομαι', aorist: 'ἀπῆλθον' },
  { lemma: 'προσέρχομαι', aorist: 'προσῆλθον' },
  { lemma: 'ἀναβαίνω', aorist: 'ἀνέβην' },
  { lemma: 'καταβαίνω', aorist: 'κατέβην' },
  { lemma: 'ἄγω', aorist: 'ἤγαγον' },
  { lemma: 'συνάγω', aorist: 'συνήγαγον' },
  { lemma: 'ἐκβάλλω', aorist: 'ἐξέβαλον' },
  { lemma: 'ἵστημι', aorist: 'ἔστην', evidence: 'ἔστη' },
  { lemma: 'ἀνίστημι', aorist: 'ἀνέστην', evidence: 'ἀνέστη' },
];

const BY_LEMMA: ReadonlyMap<string, string> = new Map(IRREGULAR_AORISTS.map((v) => [v.lemma.normalize('NFC'), v.aorist]));

/** The gloss with '(aorist X)' at its end when the lemma is a listed verb; any other gloss, and one that already has its note, comes back as it is. */
export function withAoristNote(lemma: string, gloss: string): string {
  const aorist = BY_LEMMA.get(lemma.normalize('NFC'));
  if (aorist === undefined || /\(aorist\s/.test(gloss)) return gloss;
  return `${gloss} (aorist ${aorist})`;
}
