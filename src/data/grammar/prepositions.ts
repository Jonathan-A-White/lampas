// src/data/grammar/prepositions.ts — the prepositions one by one and the compound verbs (mw-86e9r1.5, PROVISIONAL, docs/grammar.md): for each of twelve
// common prepositions the meaning that goes with each case it takes, with a real New Testament phrase in that case, and the verbs a preposition is joined to.
// Pure data. Every phrase is checked against public/data by tests/unit/prepositions.test.ts: the words are in the verse, the preposition
// is the first and the words after it are in the case the lesson gives. ladder.ts makes an idea from each; questions.ts asks them.

export type PrepCase = 'genitive' | 'dative' | 'accusative';

/** A verse of the New Testament: the book's code (data/books.ts), chapter and verse. */
export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

/** What a preposition means before one case, shown in a real phrase. */
export interface PrepUse {
  case: PrepCase;
  /** Short and different from every other use's, so a meaning names one preposition and case: “through”, “because of”. */
  meaning: string;
  /** The preposition and the words it governs, as the text has them: 'διὰ τοῦ προφήτου'. */
  phrase: string;
  /** What the phrase means in its verse. */
  gloss: string;
  ref: VerseRef;
}

export interface Preposition {
  /** The idea is `preposition-<key>`. */
  key: string;
  /** The dictionary form (NFC): 'διά'. */
  greek: string;
  /** How it is spelt before a vowel, elided or aspirated: 'δι᾿'; none when it never changes. */
  before: string[];
  uses: PrepUse[];
}

const NT = (book: string, chapter: number, verse: number): VerseRef => ({ book, chapter, verse });

/** The twelve, the one-case ones first and then by how many cases they take. */
export const PREPOSITIONS: readonly Preposition[] = [
  {
    key: 'eis',
    greek: 'εἰς',
    before: [],
    uses: [{ case: 'accusative', meaning: 'into', phrase: 'εἰς τὴν Γαλιλαίαν', gloss: 'into Galilee', ref: NT('mat', 28, 7) }],
  },
  {
    key: 'en',
    greek: 'ἐν',
    before: [],
    uses: [{ case: 'dative', meaning: 'in, among', phrase: 'ἐν τῷ νόμῳ', gloss: 'in the law', ref: NT('mat', 22, 36) }],
  },
  {
    key: 'ek',
    greek: 'ἐκ',
    before: ['ἐξ'],
    uses: [{ case: 'genitive', meaning: 'out of', phrase: 'ἐκ τοῦ κόσμου', gloss: 'out of the world', ref: NT('jhn', 13, 1) }],
  },
  {
    key: 'apo',
    greek: 'ἀπό',
    before: ['ἀπ᾿', 'ἀφ᾿'],
    uses: [{ case: 'genitive', meaning: 'away from', phrase: 'ἀπὸ τοῦ σταυροῦ', gloss: 'down from the cross', ref: NT('mat', 27, 42) }],
  },
  {
    key: 'pros',
    greek: 'πρός',
    before: [],
    uses: [
      { case: 'accusative', meaning: 'to, toward', phrase: 'πρὸς τὸν πατέρα', gloss: 'to the Father', ref: NT('jhn', 14, 6) },
      { case: 'dative', meaning: 'at, near', phrase: 'πρὸς τῇ θύρᾳ', gloss: 'at the door', ref: NT('jhn', 18, 16) },
    ],
  },
  {
    key: 'dia',
    greek: 'διά',
    before: ['δι᾿'],
    uses: [
      { case: 'genitive', meaning: 'through', phrase: 'διὰ τοῦ προφήτου', gloss: 'through the prophet', ref: NT('mat', 13, 35) },
      { case: 'accusative', meaning: 'because of', phrase: 'διὰ τοὺς λόγους', gloss: 'because of the words', ref: NT('jhn', 10, 19) },
    ],
  },
  {
    key: 'kata',
    greek: 'κατά',
    before: ['κατ᾿', 'καθ᾿'],
    uses: [
      { case: 'genitive', meaning: 'against', phrase: 'κατὰ τοῦ Ἰησοῦ', gloss: 'against Jesus', ref: NT('mat', 26, 59) },
      { case: 'accusative', meaning: 'according to', phrase: 'κατὰ τὸν νόμον', gloss: 'according to the law', ref: NT('luk', 2, 22) },
    ],
  },
  {
    key: 'meta',
    greek: 'μετά',
    before: ['μετ᾿', 'μεθ᾿'],
    uses: [
      { case: 'genitive', meaning: 'with', phrase: 'μετὰ τοῦ πατρός', gloss: 'with the Father', ref: NT('rev', 3, 21) },
      { case: 'accusative', meaning: 'after', phrase: 'μετὰ τὴν θλίψιν', gloss: 'after the tribulation', ref: NT('mrk', 13, 24) },
    ],
  },
  {
    key: 'peri',
    greek: 'περί',
    before: [],
    uses: [
      { case: 'genitive', meaning: 'about', phrase: 'περὶ τοῦ υἱοῦ', gloss: 'about the Son', ref: NT('1jn', 5, 10) },
      { case: 'accusative', meaning: 'around', phrase: 'περὶ τὸν τράχηλον', gloss: 'around the neck', ref: NT('luk', 17, 2) },
    ],
  },
  {
    key: 'hypo',
    greek: 'ὑπό',
    before: ['ὑπ᾿', 'ὑφ᾿'],
    uses: [
      { case: 'genitive', meaning: 'by (the one who does it)', phrase: 'ὑπὸ τοῦ θεοῦ', gloss: 'by God', ref: NT('gal', 3, 17) },
      { case: 'accusative', meaning: 'under', phrase: 'ὑπὸ τὸν οὐρανόν', gloss: 'under heaven', ref: NT('act', 2, 5) },
    ],
  },
  {
    key: 'para',
    greek: 'παρά',
    before: ['παρ᾿'],
    uses: [
      { case: 'genitive', meaning: 'from (a person)', phrase: 'παρὰ τοῦ θεοῦ', gloss: 'from God', ref: NT('jhn', 6, 46) },
      { case: 'dative', meaning: 'beside, in the presence of', phrase: 'παρὰ τῷ θεῷ', gloss: 'with God, in his sight', ref: NT('luk', 1, 30) },
      { case: 'accusative', meaning: 'alongside', phrase: 'παρὰ τὴν θάλασσαν', gloss: 'along the sea', ref: NT('mrk', 1, 16) },
    ],
  },
  {
    key: 'epi',
    greek: 'ἐπί',
    before: ['ἐπ᾿', 'ἐφ᾿'],
    uses: [
      { case: 'genitive', meaning: 'on, upon', phrase: 'ἐπὶ τῆς γῆς', gloss: 'on the earth', ref: NT('mat', 16, 19) },
      { case: 'dative', meaning: 'at, on the basis of', phrase: 'ἐπὶ τῷ ὀνόματί', gloss: 'on the basis of the name', ref: NT('luk', 9, 48) },
      { case: 'accusative', meaning: 'onto, over', phrase: 'ἐπὶ τὴν πέτραν', gloss: 'onto the rock', ref: NT('mat', 7, 24) },
    ],
  },
];

export interface CompoundVerb {
  /** The dictionary form: 'ἐκβάλλω'. */
  lemma: string;
  /** The preposition joined to the front, in its dictionary form: 'ἐκ'. */
  prefix: string;
  /** The verb it is joined to: 'βάλλω'. */
  stem: string;
  /** What the plain verb means: 'throw'. */
  stemMeaning: string;
  /** What the compound means; different for every verb. */
  meaning: string;
  /** The form in the verse, with the preposition changed to fit if it is: 'ἐξεβάλομεν'. */
  form: string;
  ref: VerseRef;
}

export const COMPOUND_VERBS: readonly CompoundVerb[] = [
  { lemma: 'ἐκβάλλω', prefix: 'ἐκ', stem: 'βάλλω', stemMeaning: 'throw', meaning: 'throw out', form: 'ἐξεβάλομεν', ref: NT('mat', 7, 22) },
  { lemma: 'εἰσέρχομαι', prefix: 'εἰς', stem: 'ἔρχομαι', stemMeaning: 'go', meaning: 'go in', form: 'εἰσέλθητε', ref: NT('mat', 5, 20) },
  { lemma: 'καταβαίνω', prefix: 'κατά', stem: 'βαίνω', stemMeaning: 'step', meaning: 'go down', form: 'κατέβη', ref: NT('mat', 7, 25) },
  { lemma: 'ἀναβαίνω', prefix: 'ἀνά', stem: 'βαίνω', stemMeaning: 'step', meaning: 'go up', form: 'ἀνέβη', ref: NT('mat', 5, 1) },
  { lemma: 'προσέρχομαι', prefix: 'πρός', stem: 'ἔρχομαι', stemMeaning: 'go', meaning: 'come to', form: 'προσῆλθον', ref: NT('mat', 5, 1) },
  { lemma: 'ἀποστέλλω', prefix: 'ἀπό', stem: 'στέλλω', stemMeaning: 'send', meaning: 'send away', form: 'ἀπέστειλεν', ref: NT('mat', 10, 5) },
  { lemma: 'παραλαμβάνω', prefix: 'παρά', stem: 'λαμβάνω', stemMeaning: 'take', meaning: 'take along, receive', form: 'παρέλαβεν', ref: NT('mat', 1, 24) },
  { lemma: 'μετανοέω', prefix: 'μετά', stem: 'νοέω', stemMeaning: 'think', meaning: 'change one’s mind', form: 'μετενόησαν', ref: NT('mat', 11, 20) },
  { lemma: 'ἐπιγινώσκω', prefix: 'ἐπί', stem: 'γινώσκω', stemMeaning: 'know', meaning: 'recognize', form: 'ἐπιγνώσεσθε', ref: NT('mat', 7, 16) },
  { lemma: 'διέρχομαι', prefix: 'διά', stem: 'ἔρχομαι', stemMeaning: 'go', meaning: 'go through', form: 'διελθεῖν', ref: NT('mat', 19, 24) },
  { lemma: 'περιπατέω', prefix: 'περί', stem: 'πατέω', stemMeaning: 'tread', meaning: 'walk around', form: 'περιπατοῦσιν', ref: NT('mat', 11, 5) },
  { lemma: 'ὑποστρέφω', prefix: 'ὑπό', stem: 'στρέφω', stemMeaning: 'turn', meaning: 'turn back, return', form: 'ὑπέστρεψεν', ref: NT('luk', 1, 56) },
  { lemma: 'συνάγω', prefix: 'σύν', stem: 'ἄγω', stemMeaning: 'lead', meaning: 'gather together', form: 'συναγαγὼν', ref: NT('mat', 2, 4) },
];
