// src/data/grammar/teach/joiners.ts — the cards of the joiners tier (mw-5r3p30.234): particles, adverbs, question words, "if", interjections, the
// spellings borrowed from Athens and from poetry, two words run together, and the words kept from Aramaic and Hebrew. The adverb draws a verse as a
// sentence diagram, the adverb lit under its verb (mw-5r3p30.792).
import { greek, hang, prep, slot } from '../../../diagram/handwritten';
import type { Teach } from './types';

export const JOINERS: Record<string, Teach> = {
  particle: {
    whatItIs:
      'A particle is a small word that adds a shade of meaning: weight, a contrast, doubt, a “would”. Many are hard to put into English, and a translation may show one only by its tone. Example: English “indeed”, “surely”, “then”.',
    howToSpot:
      'Learn the common ones by sight; they never change. ἄν adds “-ever” or “would” (ὃς ἄν “whoever”); μέν … δέ is “on the one hand … on the other”; ἄρα is “so then”; γε is “at least”; ναί, “yes”. μή, the “not” of wishes and commands, is one too.',
    worked: [
      {
        word: 'ἂν',
        ref: '1 John 2:5',
        gloss: 'ever',
        steps: ['ἂν adds “-ever” to the ὃς before it: ὃς ἄν, “whoever”.', 'It has no English word of its own here; it opens the “who” up to anyone.', 'ὃς δ᾿ ἂν τηρῇ αὐτοῦ τὸν λόγον: “but whoever keeps his word”.'],
      },
    ],
  },
  adverb: {
    whatItIs: 'An adverb tells how, when, where or how much: quickly, now, here, so, truly. Example: in “he ought to walk so”, so is the adverb.',
    howToSpot:
      'Many end in -ως, from an adjective: καλῶς “well”, ἀληθῶς “truly”, οὕτως “so, in this way”. Others you learn by sight: νῦν “now”, ἤδη “already”, ἐκεῖ “there”, πάλιν “again”. An adverb never changes its ending.',
    // ἀληθῶς ἐν τούτῳ ἡ ἀγάπη τοῦ θεοῦ τετελείωται, “truly in him the love of God is made complete”: ἀληθῶς hangs under the verb and says how
    diagram: {
      reference: '1 John 2:5',
      verse: { book: '1jn', chapter: 2, verse: 5 },
      mode: 'greek',
      words: greek([7, 'ἀληθῶς'], [8, 'ἐν'], [9, 'τούτῳ'], [10, 'ἡ'], [11, 'ἀγάπη'], [12, 'τοῦ'], [13, 'θεοῦ'], [14, 'τετελείωται']),
      diagram: { clauses: [{ clause: { subject: slot([4], [hang(3), hang(6, [hang(5)])]), verb: slot([7], [hang(0), prep(1, slot([2]))]) } }] },
      lit: [0],
    },
    worked: [
      {
        word: 'οὕτως',
        ref: '1 John 2:6',
        gloss: 'so',
        steps: ['οὕτως ends in -ως: an adverb.', 'It says how he ought to walk: “so”, “in this way”.', 'καὶ αὐτὸς οὕτως περιπατεῖν: “to walk so, himself also”.'],
      },
      {
        word: 'ἀληθῶς',
        ref: '1 John 2:5',
        gloss: 'truly',
        steps: ['ἀληθῶς ends in -ως: an adverb, from the adjective ἀληθής, “true”.', 'It says how the love is made complete: “truly”.', 'ἀληθῶς ἐν τούτῳ ἡ ἀγάπη τοῦ θεοῦ τετελείωται: “truly in him the love of God is made complete”.'],
      },
    ],
  },
  interrogative: {
    examplesAs: ['adverb'],
    whatItIs: 'An interrogative word asks a question: how? where? when? why? whether? Example: “How does the love of God remain in him?”',
    howToSpot:
      'πῶς “how?”, ποῦ “where?”, πότε “when?”, διὰ τί “why?”. A question ends with the Greek question mark ;. οὐ in a question expects “yes” (“Is it not…?”); μή expects “no” (“It is not…, is it?”).',
    worked: [
      {
        word: 'πῶς',
        ref: '1 John 3:17',
        gloss: 'how',
        steps: ['πῶς asks a question: “how?”.', 'The sentence ends with ;, the Greek question mark.', 'πῶς ἡ ἀγάπη τοῦ θεοῦ μένει ἐν αὐτῷ; “How does the love of God remain in him?”'],
      },
    ],
  },
  conditional: {
    whatItIs: 'A conditional word begins an “if”: if, unless, even if. It sets a condition, and the rest says what follows. Example: “If we confess our sins, he is faithful.”',
    howToSpot:
      'εἰ “if” mostly takes the indicative: the writer puts the condition as real. ἐάν “if” takes the subjunctive: a condition that may or may not be met. εἰ μή is “except”, “unless”.',
    worked: [
      {
        word: 'Ἐὰν',
        ref: '1 John 1:9',
        gloss: 'if',
        steps: ['Ἐὰν is ἐάν, “if”.', 'It is followed by the subjunctive ὁμολογῶμεν, “we confess”: a condition that may or may not be met.', 'Ἐὰν ὁμολογῶμεν τὰς ἁμαρτίας ἡμῶν: “If we confess our sins”.'],
      },
    ],
  },
  interjection: {
    whatItIs: 'An interjection is a word thrown in to show a feeling or to catch attention: oh!, look!, woe! Example: “Woe to me if I do not preach!”',
    howToSpot: 'οὐαί “woe!”, ἰδού “look!”, ὦ “O!”. They stand apart from the rest of the sentence and never change.',
    worked: [
      {
        word: 'οὐαὶ',
        ref: '1 Corinthians 9:16',
        gloss: 'woe',
        steps: ['οὐαὶ is a cry: “woe!”.', 'It stands apart from the sentence’s grammar and never changes.', 'οὐαὶ δέ μοί ἐστιν ἐὰν μὴ εὐαγγελίζωμαι: “woe to me if I do not preach the gospel”.'],
      },
    ],
  },
  'attic-form': {
    whatItIs: 'An Attic form is a word spelt the way the Greek of old Athens spelt it, beside the everyday spelling, as English writes “colour” and “color”. The meaning is the same.',
    howToSpot:
      'The parsing marks it “Attic form”. Common ones are ττ for σσ (κρείττων for κρείσσων, “better”) and some verb forms with an extra vowel at the front, such as ἑώρακα, “I have seen”. If a word looks a little odd, it may be one.',
    worked: [
      {
        word: 'ἑωράκαμεν',
        ref: '1 John 1:1',
        gloss: 'we have seen',
        steps: ['ἑωράκαμεν is marked an Attic form: the old Athenian way of spelling it.', 'It means just what the plain form would: “we have seen”.', 'Read past the spelling to the word: ὁράω, “see”.'],
      },
    ],
  },
  poetic: {
    whatItIs: 'A poetic form is a word, or a use of one, from poetry or lofty speech rather than everyday talk, as English “o’er” for “over”. It is rare, and mostly comes in a quotation of a poet.',
    howToSpot: 'The parsing marks it “poetic”. Read it as the ordinary word it stands for; the meaning does not change.',
    table: {
      caption: 'A poetic form beside the everyday one',
      columns: ['everyday', 'means'],
      rows: [
        { label: 'τοῦ', cells: ['τούτου', 'of him'] },
        { label: 'αἰεί', cells: ['ἀεί', 'always'] },
      ],
    },
    worked: [
      {
        word: 'Τοῦ',
        ref: 'Acts 17:28',
        gloss: 'his',
        steps: ['Paul quotes a Greek poet: Τοῦ γὰρ καὶ γένος ἐσμέν.', 'In poetry τοῦ can stand for τούτου, “of him”, “his”.', '“For we are also his offspring”.'],
      },
    ],
  },
  crasis: {
    examplesAs: ['pronoun', 'adverb'],
    whatItIs: 'Crasis is two words run together into one, as English “can’t” for “cannot”. A vowel is lost where they meet.',
    howToSpot: 'A small mark like an apostrophe sits inside the word, where the two joined: κἀγώ. Most begin with καί.',
    table: {
      caption: 'Two words in one',
      columns: ['one word', 'the two words'],
      rows: [
        { label: 'and I', cells: ['κἀγώ', 'καί ἐγώ'] },
        { label: 'and to me', cells: ['κἀμοί', 'καί ἐμοί'] },
        { label: 'and me', cells: ['κἀμέ', 'καί ἐμέ'] },
        { label: 'and there', cells: ['κἀκεῖ', 'καί ἐκεῖ'] },
        { label: 'and that one', cells: ['κἀκεῖνος or κἀκεῖνοι', 'καί ἐκεῖνος'] },
        { label: 'even if', cells: ['κἄν', 'καί ἐάν'] },
      ],
    },
    worked: [
      {
        word: 'Κἀγὼ',
        ref: 'John 1:31',
        gloss: 'and I',
        steps: ['Κἀγὼ has a small mark inside it, after the κ: two words ran together.', 'They are καί, “and”, and ἐγώ, “I”, which lose the ι of καί and the ε of ἐγώ.', 'Κἀγὼ οὐκ ᾔδειν αὐτόν: “And I did not know him”.'],
      },
    ],
  },
  aramaic: {
    whatItIs: 'An Aramaic word is one the writer kept from Aramaic, the everyday language of Jesus and his people, and wrote in Greek letters. Example: Rabboni, “my Teacher”.',
    howToSpot: 'It looks Greek but does not behave like Greek: it never changes its ending, and the writer often says what it means: Ῥαββουνί, ὃ λέγεται Διδάσκαλε, “Rabboni, which means Teacher”.',
    worked: [
      {
        word: 'Ῥαββουνί',
        ref: 'John 20:16',
        gloss: 'my Teacher',
        steps: ['Ῥαββουνί is not a Greek word: it is Aramaic in Greek letters.', 'It never changes its ending.', 'John explains it at once: ὃ λέγεται Διδάσκαλε, “which means Teacher”.'],
      },
    ],
  },
  hebrew: {
    whatItIs: 'A Hebrew word is one kept from Hebrew, the language of the Old Testament, and written in Greek letters. Example: Amen, “truly”, “so be it”.',
    howToSpot: 'ἀμήν “truly, so be it”, ἁλληλουϊά “praise the Lord”, ὡσαννά “save now”, σαβαώθ “of hosts”. They never change their ending.',
    worked: [
      {
        word: 'Ἀμήν',
        ref: '1 John 5:21',
        gloss: 'so be it',
        steps: ['Ἀμήν is a Hebrew word in Greek letters.', 'It never changes, and ends many a prayer and letter.', '1 John ends with it: Ἀμήν, “So be it”.'],
      },
    ],
  },
};
