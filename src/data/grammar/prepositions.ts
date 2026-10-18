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

/** A real phrase of the New Testament: a preposition and the words it governs, with where it stands. */
export interface PrepExample {
  /** The preposition and the words it governs, as the text has them: 'διὰ τοῦ προφήτου'. */
  phrase: string;
  /** What the phrase means in its verse. */
  gloss: string;
  ref: VerseRef;
}

/** What a preposition means before one case, shown in a real phrase (the lesson's) and in others (`also`) that a question may draw instead. */
export interface PrepUse extends PrepExample {
  case: PrepCase;
  /** Short and different from every other use's, so a meaning names one preposition and case: “through”, “because of”. */
  meaning: string;
  /** More phrases in this case, so Review tests the case and not one remembered phrase (mw-86e9r1.39). */
  also: PrepExample[];
}

/** The lesson's phrase first, then the others: every phrase a question about this case may show. */
export const examplesOf = (use: PrepUse): PrepExample[] => [{ phrase: use.phrase, gloss: use.gloss, ref: use.ref }, ...use.also];

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
    uses: [
      { case: 'accusative', meaning: 'into', phrase: 'εἰς τὴν Γαλιλαίαν', gloss: 'into Galilee', ref: NT('mat', 28, 7), also: [
        { phrase: 'εἰς τὴν οἰκίαν', gloss: 'into the house', ref: NT('mat', 2, 11) },
        { phrase: 'εἰς τὸ ὄρος', gloss: 'up onto the mountain', ref: NT('mat', 5, 1) },
      ] },
    ],
  },
  {
    key: 'en',
    greek: 'ἐν',
    before: [],
    uses: [
      { case: 'dative', meaning: 'in, among', phrase: 'ἐν τῷ νόμῳ', gloss: 'in the law', ref: NT('mat', 22, 36), also: [
        { phrase: 'ἐν τῷ Ἰορδάνῃ', gloss: 'in the Jordan', ref: NT('mat', 3, 6) },
        { phrase: 'ἐν τοῖς ἡγεμόσιν', gloss: 'among the rulers', ref: NT('mat', 2, 6) },
      ] },
    ],
  },
  {
    key: 'ek',
    greek: 'ἐκ',
    before: ['ἐξ'],
    uses: [
      { case: 'genitive', meaning: 'out of', phrase: 'ἐκ τοῦ κόσμου', gloss: 'out of the world', ref: NT('jhn', 13, 1), also: [
        { phrase: 'ἐκ τῶν λίθων', gloss: 'out of the stones', ref: NT('mat', 3, 9) },
        { phrase: 'ἐκ τοῦ πλοίου', gloss: 'out of the boat', ref: NT('mrk', 5, 2) },
      ] },
    ],
  },
  {
    key: 'apo',
    greek: 'ἀπό',
    before: ['ἀπ᾿', 'ἀφ᾿'],
    uses: [
      { case: 'genitive', meaning: 'away from', phrase: 'ἀπὸ τοῦ σταυροῦ', gloss: 'down from the cross', ref: NT('mat', 27, 42), also: [
        { phrase: 'ἀπὸ τοῦ ὄρους', gloss: 'down from the mountain', ref: NT('mat', 8, 1) },
        { phrase: 'ἀπὸ τοῦ μνημείου', gloss: 'away from the tomb', ref: NT('mat', 28, 8) },
      ] },
    ],
  },
  {
    key: 'pros',
    greek: 'πρός',
    before: [],
    uses: [
      { case: 'accusative', meaning: 'to, toward', phrase: 'πρὸς τὸν πατέρα', gloss: 'to the Father', ref: NT('jhn', 14, 6), also: [
        { phrase: 'πρὸς τὸν Ἰωάννην', gloss: 'to John', ref: NT('mat', 3, 13) },
        { phrase: 'πρὸς τὰ πρόβατα', gloss: 'to the sheep', ref: NT('mat', 10, 6) },
      ] },
      { case: 'dative', meaning: 'at, near', phrase: 'πρὸς τῇ θύρᾳ', gloss: 'at the door', ref: NT('jhn', 18, 16), also: [
        { phrase: 'πρὸς τῷ ὄρει', gloss: 'near the mountain', ref: NT('mrk', 5, 11) },
        { phrase: 'πρὸς τῇ κεφαλῇ', gloss: 'at the head', ref: NT('jhn', 20, 12) },
      ] },
    ],
  },
  {
    key: 'dia',
    greek: 'διά',
    before: ['δι᾿'],
    uses: [
      { case: 'genitive', meaning: 'through', phrase: 'διὰ τοῦ προφήτου', gloss: 'through the prophet', ref: NT('mat', 13, 35), also: [
        { phrase: 'διὰ τῆς θύρας', gloss: 'through the door', ref: NT('jhn', 10, 1) },
        { phrase: 'διὰ τῆς Σαμαρείας', gloss: 'through Samaria', ref: NT('jhn', 4, 4) },
      ] },
      { case: 'accusative', meaning: 'because of', phrase: 'διὰ τοὺς λόγους', gloss: 'because of the words', ref: NT('jhn', 10, 19), also: [
        { phrase: 'διὰ τὸν λόγον', gloss: 'because of the word', ref: NT('mat', 13, 21) },
        { phrase: 'διὰ τὴν ἀπιστίαν', gloss: 'because of their unbelief', ref: NT('mat', 13, 58) },
      ] },
    ],
  },
  {
    key: 'kata',
    greek: 'κατά',
    before: ['κατ᾿', 'καθ᾿'],
    uses: [
      { case: 'genitive', meaning: 'against', phrase: 'κατὰ τοῦ Ἰησοῦ', gloss: 'against Jesus', ref: NT('mat', 26, 59), also: [
        { phrase: 'κατὰ τοῦ πατρὸς', gloss: 'against his father', ref: NT('mat', 10, 35) },
        { phrase: 'κατὰ τοῦ κυρίου', gloss: 'against the Lord', ref: NT('act', 4, 26) },
      ] },
      { case: 'accusative', meaning: 'according to', phrase: 'κατὰ τὸν νόμον', gloss: 'according to the law', ref: NT('luk', 2, 22), also: [
        { phrase: 'κατὰ τὸ ἔθος', gloss: 'according to the custom', ref: NT('luk', 1, 9) },
        { phrase: 'κατὰ τὴν πρᾶξιν', gloss: 'according to his deeds', ref: NT('mat', 16, 27) },
      ] },
    ],
  },
  {
    key: 'meta',
    greek: 'μετά',
    before: ['μετ᾿', 'μεθ᾿'],
    uses: [
      { case: 'genitive', meaning: 'with', phrase: 'μετὰ τοῦ πατρός', gloss: 'with the Father', ref: NT('rev', 3, 21), also: [
        { phrase: 'μετὰ τῶν τελωνῶν', gloss: 'with the tax collectors', ref: NT('mat', 9, 11) },
        { phrase: 'μετὰ τῶν ἀνθρώπων', gloss: 'with men', ref: NT('rev', 21, 3) },
      ] },
      { case: 'accusative', meaning: 'after', phrase: 'μετὰ τὴν θλίψιν', gloss: 'after the tribulation', ref: NT('mrk', 13, 24), also: [
        { phrase: 'μετὰ τοὺς λόγους', gloss: 'after these words', ref: NT('luk', 9, 28) },
        { phrase: 'μετὰ τὸν νόμον', gloss: 'after the law', ref: NT('heb', 7, 28) },
      ] },
    ],
  },
  {
    key: 'peri',
    greek: 'περί',
    before: [],
    uses: [
      { case: 'genitive', meaning: 'about', phrase: 'περὶ τοῦ υἱοῦ', gloss: 'about the Son', ref: NT('1jn', 5, 10), also: [
        { phrase: 'περὶ τοῦ φωτός', gloss: 'about the light', ref: NT('jhn', 1, 7) },
        { phrase: 'περὶ τοῦ πνεύματος', gloss: 'about the Spirit', ref: NT('jhn', 7, 39) },
      ] },
      { case: 'accusative', meaning: 'around', phrase: 'περὶ τὸν τράχηλον', gloss: 'around the neck', ref: NT('luk', 17, 2), also: [
        { phrase: 'περὶ τὴν ὀσφὺν', gloss: 'around the waist', ref: NT('mat', 3, 4) },
        { phrase: 'περὶ τὰ στήθη', gloss: 'around the chest', ref: NT('rev', 15, 6) },
      ] },
    ],
  },
  {
    key: 'hypo',
    greek: 'ὑπό',
    before: ['ὑπ᾿', 'ὑφ᾿'],
    uses: [
      { case: 'genitive', meaning: 'by (the one who does it)', phrase: 'ὑπὸ τοῦ θεοῦ', gloss: 'by God', ref: NT('gal', 3, 17), also: [
        { phrase: 'ὑπὸ τοῦ πνεύματος', gloss: 'by the Spirit', ref: NT('mat', 4, 1) },
        { phrase: 'ὑπὸ τοῦ ἀγγέλου', gloss: 'by the angel', ref: NT('luk', 2, 21) },
      ] },
      { case: 'accusative', meaning: 'under', phrase: 'ὑπὸ τὸν οὐρανόν', gloss: 'under heaven', ref: NT('act', 2, 5), also: [
        { phrase: 'ὑπὸ τὸν μόδιον', gloss: 'under the basket', ref: NT('mat', 5, 15) },
        { phrase: 'ὑπὸ τοὺς πόδας', gloss: 'under the feet', ref: NT('rom', 16, 20) },
      ] },
    ],
  },
  {
    key: 'para',
    greek: 'παρά',
    before: ['παρ᾿'],
    uses: [
      { case: 'genitive', meaning: 'from (a person)', phrase: 'παρὰ τοῦ θεοῦ', gloss: 'from God', ref: NT('jhn', 6, 46), also: [
        { phrase: 'παρὰ τοῦ πατρὸς', gloss: 'from the Father', ref: NT('jhn', 6, 45) },
        { phrase: 'παρὰ τῶν γεωργῶν', gloss: 'from the farmers', ref: NT('mrk', 12, 2) },
      ] },
      { case: 'dative', meaning: 'beside, in the presence of', phrase: 'παρὰ τῷ θεῷ', gloss: 'with God, in his sight', ref: NT('luk', 1, 30), also: [
        { phrase: 'παρὰ τῷ σταυρῷ', gloss: 'beside the cross', ref: NT('jhn', 19, 25) },
        { phrase: 'παρὰ τῷ πατρὶ', gloss: 'with your Father', ref: NT('mat', 6, 1) },
      ] },
      { case: 'accusative', meaning: 'alongside', phrase: 'παρὰ τὴν θάλασσαν', gloss: 'along the sea', ref: NT('mrk', 1, 16), also: [
        { phrase: 'παρὰ τοὺς πόδας', gloss: 'at the feet', ref: NT('mat', 15, 30) },
        { phrase: 'παρὰ τὸ χεῖλος', gloss: 'on the shore', ref: NT('heb', 11, 12) },
      ] },
    ],
  },
  {
    key: 'epi',
    greek: 'ἐπί',
    before: ['ἐπ᾿', 'ἐφ᾿'],
    uses: [
      { case: 'genitive', meaning: 'on, upon', phrase: 'ἐπὶ τῆς γῆς', gloss: 'on the earth', ref: NT('mat', 16, 19), also: [
        { phrase: 'ἐπὶ τοῦ ὄρους', gloss: 'on the mountain', ref: NT('mat', 24, 3) },
        { phrase: 'ἐπὶ τοῦ σταυροῦ', gloss: 'on the cross', ref: NT('jhn', 19, 19) },
      ] },
      { case: 'dative', meaning: 'at, on the basis of', phrase: 'ἐπὶ τῷ ὀνόματί', gloss: 'on the basis of the name', ref: NT('luk', 9, 48), also: [
        { phrase: 'ἐπὶ τῇ διδαχῇ', gloss: 'at his teaching', ref: NT('mat', 7, 28) },
        { phrase: 'ἐπὶ τῇ συνέσει', gloss: 'at his understanding', ref: NT('luk', 2, 47) },
      ] },
      { case: 'accusative', meaning: 'onto, over', phrase: 'ἐπὶ τὴν πέτραν', gloss: 'onto the rock', ref: NT('mat', 7, 24), also: [
        { phrase: 'ἐπὶ τὰς ἀκάνθας', gloss: 'onto the thorns', ref: NT('mat', 13, 7) },
        { phrase: 'ἐπὶ τοὺς μαθητὰς', gloss: 'out over the disciples', ref: NT('mat', 12, 49) },
      ] },
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
