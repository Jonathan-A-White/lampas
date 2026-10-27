// src/data/grammar/teach/nouns.ts — the cards of the nouns tier (mw-5r3p30.234): the noun (its stem, its endings, its cases), number, the two joiners
// of every verse, the five cases, the three genders, the article, the adjective and the rest. A case's table is its endings in four model nouns,
// labelled by the noun, not by a gender, since gender comes after the cases; the article's is its 24 forms. The noun, the four cases, the conjunction,
// the article and the adjective each draw a short verse as a sentence diagram, the words they teach lit (mw-5r3p30.791, mw-5r3p30.792).
import { greek, hang, prep, slot, understood, w } from '../../../diagram/handwritten';
import type { Teach, TeachTable } from './types';

/** The four model nouns every case table is laid out by, and what they mean (in the caption, so a column stays narrow). */
const MODELS = ['λόγος', 'ἀρχή', 'τέκνον', 'χείρ'];
const MODEL_MEANINGS = 'λόγος “word”, ἀρχή “beginning”, τέκνον “child” and χείρ “hand”';

/** A case's endings in the four model nouns, singular and plural. */
const caseTable = (name: string, singular: string[], plural: string[]): TeachTable => ({
  caption: `The ${name} endings of ${MODEL_MEANINGS}`,
  columns: MODELS,
  rows: [
    { label: 'singular', cells: singular },
    { label: 'plural', cells: plural },
  ],
});

const GENDERS = ['masculine', 'feminine', 'neuter'];

/** 'we', the subject a first person plural verb's ending carries. */
const WE = understood('ἡμεῖς');

export const NOUNS: Record<string, Teach> = {
  noun: {
    whatItIs: 'A noun is a word that names a person, a place, a thing or an idea: Paul, Rome, book, love. Example: in “God is love”, God and love are nouns.',
    howToSpot:
      'A Greek noun has two parts: a stem, which carries the meaning and stays the same, and an ending, which changes with the noun’s job in the sentence. These forms of one noun are called its cases. λόγος, λόγου, λόγῳ and λόγον are all “word”: the stem λογ- stays, the ending moves. A dictionary lists a noun under one form, its dictionary form: λόγος.',
    table: {
      caption: `The endings of ${MODEL_MEANINGS}: the stem stays, the ending changes`,
      columns: MODELS,
      rows: [
        { label: 'one: who acts', cells: ['-ος', '-η', '-ον', 'χείρ'] },
        { label: 'one: of', cells: ['-ου', '-ης', '-ου', '-ος'] },
        { label: 'one: to, for', cells: ['-ῳ', '-ῃ', '-ῳ', '-ι'] },
        { label: 'one: acted on', cells: ['-ον', '-ην', '-ον', '-α'] },
        { label: 'more: who act', cells: ['-οι', '-αι', '-α', '-ες'] },
        { label: 'more: of', cells: ['-ων', '-ων', '-ων', '-ων'] },
        { label: 'more: to, for', cells: ['-οις', '-αις', '-οις', '-σι(ν)'] },
        { label: 'more: acted on', cells: ['-ους', '-ας', '-α', '-ας'] },
      ],
      note: 'Each row is one case; the cards that follow name them.',
    },
    // ὅτι ὁ θεὸς ἀγάπη ἐστίν, “because God is love”: θεὸς the subject, ἀγάπη what he is
    diagram: {
      reference: '1 John 4:8',
      verse: { book: '1jn', chapter: 4, verse: 8 },
      mode: 'greek',
      words: greek([8, 'ὁ'], [9, 'θεὸς'], [10, 'ἀγάπη'], [11, 'ἐστίν']),
      diagram: { clauses: [{ clause: { subject: slot([1], [hang(0)]), verb: slot([3]), complement: { kind: 'predicate-nominative', slot: slot([2]) } } }] },
      lit: [1, 2],
    },
    worked: [
      {
        word: 'λόγου',
        ref: '1 John 1:1',
        gloss: 'word',
        steps: [
          'Find the stem: λογ-, the part that means “word”.',
          'Find the ending: -ου. In the table it is the row “one: of”: one word, and “of”.',
          'Its dictionary form is λόγος; λόγου is the same noun with another ending.',
          'περὶ τοῦ λόγου τῆς ζωῆς: “concerning the Word of life”.',
        ],
      },
      {
        word: 'λόγος',
        ref: 'John 1:1',
        gloss: 'word',
        steps: ['Find the stem: λογ-, “word”.', 'Find the ending: -ος, the row “one: who acts”. It is the dictionary form itself.', 'ὁ λόγος: “the Word”, who is the one spoken of.'],
      },
    ],
  },
  'number-singular': {
    whatItIs: 'Singular means one: one book, one child. English shows it mostly by having no -s: “book”, not “books”.',
    howToSpot: 'In Greek the ending tells you. In the noun table the rows marked “one” are the singular endings: λόγος, λόγου, λόγῳ and λόγον are each one word.',
    worked: [
      {
        word: 'ἀρχῆς',
        ref: '1 John 1:1',
        gloss: 'beginning',
        steps: ['The stem is ἀρχ-, the ending -ης.', '-ης is in a row marked “one”: one beginning, so it is singular.', 'ἀπ᾿ ἀρχῆς: “from the beginning”.'],
      },
      {
        word: 'λόγος',
        ref: 'John 1:1',
        gloss: 'word',
        steps: ['The stem is λογ-, the ending -ος.', '-ος is in a row marked “one”: one word, singular.', 'ὁ λόγος: “the Word”.'],
      },
    ],
  },
  'number-plural': {
    whatItIs: 'Plural means more than one: books, children, eyes. English mostly adds -s; Greek changes the ending.',
    howToSpot: 'Learn the plural endings beside the singular ones. A plural noun ends in -οι, -αι, -α or -ες, -ων (in every noun), -οις, -αις or -σι(ν), -ους or -ας.',
    table: {
      caption: 'Singular and plural endings',
      columns: ['singular', 'plural'],
      rows: [
        { label: 'like λόγος', cells: ['-ος, -ου, -ῳ, -ον', '-οι, -ων, -οις, -ους'] },
        { label: 'like ἀρχή', cells: ['-η, -ης, -ῃ, -ην', '-αι, -ων, -αις, -ας'] },
        { label: 'like τέκνον', cells: ['-ον, -ου, -ῳ, -ον', '-α, -ων, -οις, -α'] },
        { label: 'like χείρ', cells: ['χείρ, -ος, -ι, -α', '-ες, -ων, -σι(ν), -ας'] },
      ],
    },
    worked: [
      {
        word: 'ὀφθαλμοῖς',
        ref: '1 John 1:1',
        gloss: 'eyes',
        steps: ['The stem is ὀφθαλμ-, the ending -οις.', '-οις is in the plural column: more than one, eyes, not one eye.', 'Its dictionary form is ὀφθαλμός, “eye”.'],
      },
      {
        word: 'χεῖρες',
        ref: '1 John 1:1',
        gloss: 'hands',
        steps: ['The stem is χειρ-, the ending -ες.', '-ες is in the plural column, for nouns like χείρ: hands.', 'αἱ χεῖρες ἡμῶν: “our hands”.'],
      },
    ],
  },
  conjunction: {
    whatItIs: 'A conjunction is a joining word: it links words, or whole sentences. Example: and, but, or, for, because: “bread and wine”, “he came, but they left”.',
    howToSpot:
      'Learn the common ones by sight; their ending never changes. δέ and γάρ never stand first: they come second in their sentence, though English puts “but” and “for” first.',
    table: {
      caption: 'The commonest conjunctions',
      columns: ['means'],
      rows: [
        { label: 'καί', cells: ['and, also'] },
        { label: 'δέ', cells: ['and, but'] },
        { label: 'ἀλλά', cells: ['but'] },
        { label: 'γάρ', cells: ['for'] },
        { label: 'οὖν', cells: ['so, then'] },
        { label: 'ὅτι', cells: ['that, because'] },
        { label: 'ἵνα', cells: ['so that'] },
        { label: 'ἤ', cells: ['or'] },
      ],
    },
    // Ἐν αὐτῷ ζωὴ ἦν, καὶ ἡ ζωὴ ἦν τὸ φῶς τῶν ἀνθρώπων, “in him was life, and the life was the light of men”: καὶ joins the two sentences
    diagram: {
      reference: 'John 1:4',
      verse: { book: 'jhn', chapter: 1, verse: 4 },
      mode: 'greek',
      words: greek([0, 'Ἐν'], [1, 'αὐτῷ'], [2, 'ζωὴ'], [3, 'ἦν'], [4, 'καὶ'], [5, 'ἡ'], [6, 'ζωὴ'], [7, 'ἦν'], [8, 'τὸ'], [9, 'φῶς'], [10, 'τῶν'], [11, 'ἀνθρώπων']),
      diagram: {
        clauses: [
          { clause: { subject: slot([2]), verb: slot([3], [prep(0, slot([1]))]) } },
          { joinedBy: w(4), clause: { subject: slot([6], [hang(5)]), verb: slot([7]), complement: { kind: 'predicate-nominative', slot: slot([9], [hang(8), hang(11, [hang(10)])]) } } },
        ],
      },
      lit: [4],
    },
    worked: [
      {
        word: 'καὶ',
        ref: '1 John 1:1',
        gloss: 'and',
        steps: ['καί means “and”; with another word after it the text writes καὶ, its accent turned.', 'Its ending never changes.', 'καὶ αἱ χεῖρες ἡμῶν: “and our hands”.'],
      },
    ],
  },
  negative: {
    examplesAs: ['particle', 'adjective', 'adverb'],
    whatItIs: 'A negative is a word that says no or not: not, no, never, nobody. Example: “I do not know.”',
    howToSpot:
      'Greek has two words for “not”: οὐ for a plain fact (οὐκ before a smooth breathing, οὐχ before a rough one) and μή for a wish, a command or an “if”. Words built on them are negative too: οὐδέ, μηδέ “and not”; οὐδείς, μηδείς “no one”.',
    table: {
      caption: 'The words for not',
      columns: ['for a fact', 'for a wish or command'],
      rows: [
        { label: 'not', cells: ['οὐ or οὐκ or οὐχ or οὐχί', 'μή'] },
        { label: 'and not, nor', cells: ['οὐδέ', 'μηδέ'] },
        { label: 'no one, none', cells: ['οὐδείς or οὐδεμία or οὐδέν', 'μηδείς or μηδεμία or μηδέν'] },
        { label: 'never', cells: ['οὐδέποτε', 'μηδέποτε'] },
        { label: 'no longer', cells: ['οὐκέτι', 'μηκέτι'] },
      ],
    },
    worked: [
      {
        word: 'οὐκ',
        ref: '1 John 1:5',
        gloss: 'not',
        steps: ['οὐκ is οὐ, “not”, with κ before a word that begins with a vowel.', 'It says a plain fact: there is not.', 'σκοτία ἐν αὐτῷ οὐκ ἔστιν οὐδεμία: “in him is no darkness at all”.'],
      },
      {
        word: 'οὐ',
        ref: 'John 1:5',
        gloss: 'not',
        steps: ['οὐ is “not”, for a plain fact.', 'The next word begins with a consonant, so it is plain οὐ.', 'ἡ σκοτία αὐτὸ οὐ κατέλαβεν: “the darkness did not overcome it”.'],
      },
    ],
  },
  'case-nominative': {
    whatItIs:
      'The nominative is the case of the subject: the one who does the action, or who is spoken about. English shows the subject by putting it first. Example: in “The Word was God”, the Word is the subject.',
    howToSpot:
      'It is the first row of the noun table, and the dictionary form of a noun. Singular: -ος, -η, -ον; plural: -οι, -αι, -α, -ες. Since the ending marks the subject, it may stand anywhere: in καὶ θεὸς ἦν ὁ λόγος, “and the Word was God”, ὁ λόγος is the subject though it comes last.',
    table: caseTable('nominative', ['-ος', '-η', '-ον', 'χείρ'], ['-οι', '-αι', '-α', '-ες']),
    // αἱ χεῖρες ἡμῶν ἐψηλάφησαν, “our hands touched”: χεῖρες the subject, αἱ and ἡμῶν hanging under it
    diagram: {
      reference: '1 John 1:1',
      verse: { book: '1jn', chapter: 1, verse: 1 },
      mode: 'greek',
      words: greek([14, 'αἱ'], [15, 'χεῖρες'], [16, 'ἡμῶν'], [17, 'ἐψηλάφησαν']),
      diagram: { clauses: [{ clause: { subject: slot([1], [hang(0), hang(2)]), verb: slot([3]) } }] },
      lit: [1],
    },
    worked: [
      {
        word: 'χεῖρες',
        ref: '1 John 1:1',
        gloss: 'hands',
        steps: ['The stem is χειρ-, the ending -ες.', '-ες is the nominative plural of nouns like χείρ.', 'αἱ χεῖρες ἡμῶν ἐψηλάφησαν: “our hands touched”: the hands do the touching, so they are the subject.'],
      },
      {
        word: 'λόγος',
        ref: 'John 1:1',
        gloss: 'word',
        steps: ['The stem is λογ-, the ending -ος: nominative singular.', 'ἦν ὁ λόγος: “the Word was”: the Word is the subject.', 'It is also the dictionary form.'],
      },
    ],
  },
  'case-accusative': {
    whatItIs:
      'The accusative is the case of the object: the person or thing an action is done to. Example: in “We declare to you the life”, the life is the object; in “The dog bit the man”, the man is.',
    howToSpot:
      'Singular: -ον, -ην (or -αν), -ον, -α; plural: -ους, -ας, -α, -ας. After εἰς “into” and πρός “toward” it shows where something goes.',
    table: caseTable('accusative', ['-ον', '-ην or -αν', '-ον', '-α'], ['-ους', '-ας', '-α', '-ας']),
    // ἐθεασάμεθα τὴν δόξαν αὐτοῦ, “we beheld his glory”: the subject is the verb's ending, δόξαν the direct object
    diagram: {
      reference: 'John 1:14',
      verse: { book: 'jhn', chapter: 1, verse: 14 },
      mode: 'greek',
      words: greek([10, 'ἐθεασάμεθα'], [11, 'τὴν'], [12, 'δόξαν'], [13, 'αὐτοῦ']),
      diagram: { clauses: [{ clause: { subject: WE, verb: slot([0]), complement: { kind: 'direct-object', slot: slot([2], [hang(1), hang(3)]) } } }] },
      lit: [2],
    },
    worked: [
      {
        word: 'ζωὴν',
        ref: '1 John 1:2',
        gloss: 'life',
        steps: ['The stem is ζω-, the ending -ην.', '-ην is the accusative singular of nouns like ἀρχή.', 'ἀπαγγέλλομεν ὑμῖν τὴν ζωήν: “we declare to you the life”: the life is what is declared, the object.'],
      },
      {
        word: 'θεόν',
        ref: 'John 1:1',
        gloss: 'God',
        steps: ['The stem is θε-, the ending -ον: accusative singular.', 'After πρός it shows the one the Word was turned toward.', 'πρὸς τὸν θεόν: “with God”.'],
      },
    ],
  },
  'case-genitive': {
    whatItIs: 'The genitive is the case of “of”: it shows whose something is, what it belongs to, or where it comes from. English uses “of” or ’s. Example: “the Word of life”, “God’s love”.',
    howToSpot:
      'Singular: -ου, -ης (or -ας), -ου, -ος; plural: -ων in every noun. When you meet one, try “of” before it. After ἀπό “from” and ἐκ “out of” it is always the genitive.',
    table: caseTable('genitive', ['-ου', '-ης or -ας', '-ου', '-ος'], ['-ων', '-ων', '-ων', '-ων']),
    // ἡ ζωὴ ἦν τὸ φῶς τῶν ἀνθρώπων, “the life was the light of men”: ἀνθρώπων hangs under φῶς and says whose light
    diagram: {
      reference: 'John 1:4',
      verse: { book: 'jhn', chapter: 1, verse: 4 },
      mode: 'greek',
      words: greek([5, 'ἡ'], [6, 'ζωὴ'], [7, 'ἦν'], [8, 'τὸ'], [9, 'φῶς'], [10, 'τῶν'], [11, 'ἀνθρώπων']),
      diagram: {
        clauses: [{ clause: { subject: slot([1], [hang(0)]), verb: slot([2]), complement: { kind: 'predicate-nominative', slot: slot([4], [hang(3), hang(6, [hang(5)])]) } } }],
      },
      lit: [6],
    },
    worked: [
      {
        word: 'ζωῆς',
        ref: '1 John 1:1',
        gloss: 'life',
        steps: ['The stem is ζω-, the ending -ης.', '-ης is the genitive singular: put “of” before it, “of life”.', 'τοῦ λόγου τῆς ζωῆς: “the Word of life”: ζωῆς says which Word.'],
      },
    ],
  },
  'case-dative': {
    whatItIs:
      'The dative is the case of “to” or “for”: the one something is given to or done for. It can also mean “with” (what something is done with) or “in” (a place or a time). Example: “She gave the book to the child.”',
    howToSpot:
      'Singular: -ῳ, -ῃ (or -ᾳ), -ῳ, -ι, mostly with the iota under the letter; plural: -οις, -αις, -οις, -σι(ν). Try “to”, “for”, “with” or “in” before it and keep the one that makes sense.',
    table: caseTable('dative', ['-ῳ', '-ῃ or -ᾳ', '-ῳ', '-ι'], ['-οις', '-αις', '-οις', '-σι(ν)']),
    // ἑωράκαμεν τοῖς ὀφθαλμοῖς ἡμῶν, “we have seen with our eyes”: ὀφθαλμοῖς hangs under the verb and says what they saw with
    diagram: {
      reference: '1 John 1:1',
      verse: { book: '1jn', chapter: 1, verse: 1 },
      mode: 'greek',
      words: greek([7, 'ἑωράκαμεν'], [8, 'τοῖς'], [9, 'ὀφθαλμοῖς'], [10, 'ἡμῶν']),
      diagram: { clauses: [{ clause: { subject: WE, verb: slot([0], [hang(2, [hang(1), hang(3)])]) } }] },
      lit: [2],
    },
    worked: [
      {
        word: 'ὀφθαλμοῖς',
        ref: '1 John 1:1',
        gloss: 'eyes',
        steps: ['The stem is ὀφθαλμ-, the ending -οις.', '-οις is the dative plural.', 'Here it is what they saw with: ἑωράκαμεν τοῖς ὀφθαλμοῖς ἡμῶν, “we have seen with our eyes”.'],
      },
      {
        word: 'ἀρχῇ',
        ref: 'John 1:1',
        gloss: 'beginning',
        steps: ['The stem is ἀρχ-, the ending -ῃ, with the iota under the η.', '-ῃ is the dative singular.', 'Here it is a time, “in”: Ἐν ἀρχῇ, “In the beginning”.'],
      },
    ],
  },
  'case-vocative': {
    whatItIs: 'The vocative is the case for calling someone: speaking straight to them. Example: “Lord, help me!”, “Little children, keep yourselves from idols.”',
    howToSpot:
      'Often it looks like the nominative. Nouns like λόγος change -ος to -ε: κύριε “Lord!”, ἀδελφέ “brother!”. Look for a name or a title said to someone, often first in the sentence and set off by a comma, sometimes after ὦ “O”.',
    table: caseTable('vocative', ['-ε', '-η or -α', '-ον', 'χείρ'], ['-οι', '-αι', '-α', '-ες']),
    worked: [
      {
        word: 'Τεκνία',
        ref: '1 John 2:1',
        gloss: 'little children',
        steps: ['Τεκνία is the plural of τεκνίον, “little child”, a noun like τέκνον: ending -α.', 'John is speaking straight to his readers: he calls them.', 'So it is vocative: Τεκνία μου, “My little children”.'],
      },
    ],
  },
  'gender-masculine': {
    whatItIs:
      'Gender is one of three groups every Greek noun belongs to. English keeps it only in he, she and it, but in Greek even things have one: λόγος “word” is masculine. Masculine is the group of “he”: men, and many things. The next two cards give the other two groups.',
    howToSpot:
      'A dictionary marks it. Most nouns whose dictionary form ends in -ος are masculine: λόγος, θεός, κόσμος, ὀφθαλμός. So are many in -ης (μαθητής “disciple”) and some like χείρ (πατήρ “father”).',
    worked: [
      {
        word: 'λόγου',
        ref: '1 John 1:1',
        gloss: 'word',
        steps: ['λόγου is a form of λόγος.', 'Its dictionary form ends in -ος, like most masculine nouns.', 'So λόγος is masculine, though a word is not a man: gender is grammar, not male or female.'],
      },
      {
        word: 'θεὸς',
        ref: 'John 1:1',
        gloss: 'God',
        steps: ['θεός ends in -ος.', 'Like most nouns in -ος it is masculine.', 'θεὸς ἦν ὁ λόγος: “the Word was God”.'],
      },
    ],
  },
  'gender-feminine': {
    whatItIs: 'Feminine is the second gender, the group of “she”: women, and many things and ideas. Example: ἀγάπη “love”, ζωή “life” and ἀρχή “beginning” are feminine.',
    howToSpot:
      'Most nouns whose dictionary form ends in -η or -α are feminine: ζωή, ἀρχή, ἡμέρα “day”, δόξα “glory”. Some ending in -ος are feminine too (ὁδός “way”), and many like χείρ (χείρ itself, σάρξ “flesh”). The dictionary tells you for sure.',
    worked: [
      {
        word: 'ζωῆς',
        ref: '1 John 1:1',
        gloss: 'life',
        steps: ['ζωῆς is a form of ζωή, “life”.', 'Its dictionary form ends in -η, like most feminine nouns.', 'So ζωή is feminine: τῆς ζωῆς, “of life”.'],
      },
      {
        word: 'ἀρχῇ',
        ref: 'John 1:1',
        gloss: 'beginning',
        steps: ['ἀρχῇ is a form of ἀρχή, “beginning”.', 'Its dictionary form ends in -η: feminine.', 'Ἐν ἀρχῇ: “In the beginning”.'],
      },
    ],
  },
  'gender-neuter': {
    whatItIs: 'Neuter is the third gender, neither masculine nor feminine: the group of “it”. Example: τέκνον “child”, ἔργον “work” and πνεῦμα “spirit” are neuter.',
    howToSpot:
      'Neuter nouns end in -ον (τέκνον, ἔργον) or -μα (πνεῦμα, ῥῆμα “word”). A neuter noun has the same form for its subject and its object, and in the plural both end in -α: τέκνα, ἔργα, ῥήματα.',
    worked: [
      {
        word: 'τέκνα',
        ref: 'John 1:12',
        gloss: 'children',
        steps: ['τέκνα is the plural of τέκνον, “child”.', 'Its dictionary form ends in -ον: it is neuter.', 'Its plural ends in -α, as every neuter’s does for subject and object: τέκνα θεοῦ, “children of God”.'],
      },
      {
        word: 'φῶς',
        ref: '1 John 1:5',
        gloss: 'light',
        steps: ['φῶς, “light”, is neuter: the dictionary marks it.', 'Its subject and object forms are the same, φῶς.', 'ὁ θεὸς φῶς ἐστιν: “God is light”.'],
      },
    ],
  },
  article: {
    whatItIs: 'The article is the word “the”. It points to a particular person or thing: “the Word”, not just “a word”. Greek has no word for “a”: λόγος alone can be “a word”.',
    howToSpot:
      'The Greek article takes the case, number and gender of its noun, so it shows you the noun’s case at a glance. All its forms begin with τ except four, which have a rough breathing instead: ὁ, ἡ, οἱ, αἱ. Read it with the noun it goes with: τοῦ λόγου, “of the Word”.',
    table: {
      caption: 'The article: “the”',
      columns: GENDERS,
      rows: [
        { label: 'nominative singular', cells: ['ὁ', 'ἡ', 'τό'] },
        { label: 'genitive singular', cells: ['τοῦ', 'τῆς', 'τοῦ'] },
        { label: 'dative singular', cells: ['τῷ', 'τῇ', 'τῷ'] },
        { label: 'accusative singular', cells: ['τόν', 'τήν', 'τό'] },
        { label: 'nominative plural', cells: ['οἱ', 'αἱ', 'τά'] },
        { label: 'genitive plural', cells: ['τῶν', 'τῶν', 'τῶν'] },
        { label: 'dative plural', cells: ['τοῖς', 'ταῖς', 'τοῖς'] },
        { label: 'accusative plural', cells: ['τούς', 'τάς', 'τά'] },
      ],
    },
    // θεὸς ἦν ὁ λόγος, “the Word was God”: ὁ marks λόγος as the subject, though it comes last; θεὸς, with no article, is what the Word was
    diagram: {
      reference: 'John 1:1',
      verse: { book: 'jhn', chapter: 1, verse: 1 },
      mode: 'greek',
      words: greek([13, 'θεὸς'], [14, 'ἦν'], [15, 'ὁ'], [16, 'λόγος']),
      diagram: { clauses: [{ clause: { subject: slot([3], [hang(2)]), verb: slot([1]), complement: { kind: 'predicate-nominative', slot: slot([0]) } } }] },
      lit: [2],
    },
    worked: [
      {
        word: 'τοῖς',
        ref: '1 John 1:1',
        gloss: 'the',
        steps: [
          'Find τοῖς in the table: dative plural masculine (or neuter).',
          'It goes with the next word that matches it: ὀφθαλμοῖς, “eyes”, dative plural masculine.',
          'Together, with the dative’s “with”: τοῖς ὀφθαλμοῖς ἡμῶν, “with our eyes”.',
        ],
      },
      {
        word: 'ὁ',
        ref: 'John 1:1',
        gloss: 'the',
        steps: ['Find ὁ in the table: nominative singular masculine.', 'It goes with λόγος, also nominative singular masculine.', 'ὁ λόγος: “the Word”.'],
      },
    ],
  },
  adjective: {
    whatItIs: 'An adjective describes a noun: good, holy, new, eternal. Example: in “a new commandment”, new is the adjective; in “the commandment is old”, old is.',
    howToSpot:
      'A Greek adjective takes the case, number and gender of the noun it describes, so its ending often matches the noun’s. Most have the endings of λόγος, ἀρχή and τέκνον, one set for each gender: ἀγαθός, ἀγαθή, ἀγαθόν, “good”. With ὁ “the” before it and no noun, it stands for a person or a thing: ὁ ἅγιος, “the holy one”.',
    table: {
      caption: 'The endings of ἀγαθός, ἀγαθή, ἀγαθόν “good”',
      columns: GENDERS,
      rows: [
        { label: 'nominative singular', cells: ['-ος', '-η or -α', '-ον'] },
        { label: 'genitive singular', cells: ['-ου', '-ης or -ας', '-ου'] },
        { label: 'dative singular', cells: ['-ῳ', '-ῃ or -ᾳ', '-ῳ'] },
        { label: 'accusative singular', cells: ['-ον', '-ην or -αν', '-ον'] },
        { label: 'nominative plural', cells: ['-οι', '-αι', '-α'] },
        { label: 'genitive plural', cells: ['-ων', '-ων', '-ων'] },
        { label: 'dative plural', cells: ['-οις', '-αις', '-οις'] },
        { label: 'accusative plural', cells: ['-ους', '-ας', '-α'] },
      ],
    },
    // τὸ φῶς τὸ ἀληθινὸν ἤδη φαίνει, “the true light is already shining”: ἀληθινὸν hangs under φῶς, with its own τὸ under it
    diagram: {
      reference: '1 John 2:8',
      verse: { book: '1jn', chapter: 2, verse: 8 },
      mode: 'greek',
      words: greek([18, 'τὸ'], [19, 'φῶς'], [20, 'τὸ'], [21, 'ἀληθινὸν'], [22, 'ἤδη'], [23, 'φαίνει']),
      diagram: { clauses: [{ clause: { subject: slot([1], [hang(0), hang(3, [hang(2)])]), verb: slot([5], [hang(4)]) } }] },
      lit: [3],
    },
    worked: [
      {
        word: 'καινὴν',
        ref: '1 John 2:7',
        gloss: 'new',
        steps: ['καινὴν is a form of καινός, “new”: the ending -ην.', 'It describes ἐντολήν, “commandment”, and matches it: accusative singular feminine.', 'οὐκ ἐντολὴν καινὴν γράφω ὑμῖν: “I write no new commandment to you”.'],
      },
    ],
  },
  comparative: {
    whatItIs: 'A comparative says something has more of a quality than another: bigger, better, more holy. Example: “God is greater than our heart.”',
    howToSpot:
      'Look for -τερος (ἰσχυρότερος “stronger”) or -ων, -ονος (μείζων “greater”, πλείων “more”, κρείσσων “better”). What it is compared with is in the genitive, or comes after ἤ “than”.',
    table: {
      caption: 'The comparative',
      columns: ['its endings', 'for example'],
      rows: [
        { label: 'like ἰσχυρότερος', cells: ['-τερος, -τερα, -τερον, -τερου, -τερῳ, -τεροι, -τερων, -τεροις, -τερους', 'ἰσχυρότερος “stronger”'] },
        { label: 'like μείζων', cells: ['-ων, -ον, -ονος, -ονι, -ονα, -ονες, -ονων, -οσι(ν), -ονας', 'μείζων “greater”'] },
        { label: 'short forms', cells: ['-ω, -ους', 'μείζω “greater things”'] },
      ],
    },
    worked: [
      {
        word: 'μείζων',
        ref: '1 John 3:20',
        gloss: 'greater',
        steps: ['μείζων is the comparative of μέγας “great”: “greater”.', 'What it is greater than follows in the genitive: τῆς καρδίας ἡμῶν, “than our heart”.', 'μείζων ἐστὶν ὁ θεὸς τῆς καρδίας ἡμῶν: “God is greater than our heart”.'],
      },
    ],
  },
  superlative: {
    whatItIs: 'A superlative says something has the most of a quality: greatest, least, most holy, first, last. Example: “I am the least of the apostles.”',
    howToSpot:
      'Look for -τατος (ἁγιώτατος “most holy”) or -ιστος (ἐλάχιστος “least”, μέγιστος “greatest”). πρῶτος “first” and ἔσχατος “last” count too. Greek often uses the comparative where English says “the most”.',
    table: {
      caption: 'The superlative',
      columns: ['its endings', 'for example'],
      rows: [
        { label: 'like ἁγιώτατος', cells: ['-τατος, -τατη, -τατον, -τατῃ, -τατοι', 'ἁγιώτατος “most holy”'] },
        { label: 'like ἐλάχιστος', cells: ['-ιστος, -ιστη, -ιστον, -ιστου, -ιστῳ, -ιστοι, -ιστων, -ιστοις, -ιστους', 'ἐλάχιστος “least”'] },
        { label: 'first, last', cells: ['πρῶτος, -τος, -τη, -τον, -του, -τῃ, -την, -τοι, -τοις, -τους', 'ἔσχατος “last”'] },
      ],
    },
    worked: [
      {
        word: 'ἐλάχιστος',
        ref: '1 Corinthians 15:9',
        gloss: 'least',
        steps: ['ἐλάχιστος ends in -ιστος: a superlative.', 'It is the “most” form of “small”: “least”.', 'ὁ ἐλάχιστος τῶν ἀποστόλων: “the least of the apostles”.'],
      },
    ],
  },
  numeral: {
    whatItIs: 'A numeral is a number word: one, two, twelve. Example: “the twelve disciples”, “three who testify”.',
    howToSpot:
      'εἷς (μία, ἕν) “one”, δύο “two”, τρεῖς “three” and τέσσαρες “four” change their endings like an adjective; from five up most never change: πέντε “five”, δώδεκα “twelve”.',
    table: {
      caption: 'Number words',
      columns: ['its forms'],
      rows: [
        { label: 'one', cells: ['εἷς or ἑνός or ἑνί or ἕνα or μία or μιᾶς or μιᾷ or μίαν or ἕν'] },
        { label: 'two', cells: ['δύο or δυσί(ν)'] },
        { label: 'three', cells: ['τρεῖς or τρία or τριῶν or τρισί(ν)'] },
        { label: 'four', cells: ['τέσσαρες or τέσσαρα or τεσσάρων or τέσσαρας'] },
        { label: 'five', cells: ['πέντε'] },
        { label: 'seven', cells: ['ἑπτά'] },
        { label: 'twelve', cells: ['δώδεκα'] },
      ],
    },
    worked: [
      {
        word: 'τρεῖς',
        ref: '1 John 5:7',
        gloss: 'three',
        steps: ['τρεῖς is the number word “three”.', 'It changes its ending like an adjective: τρία for neuter, τριῶν “of three”.', 'Ὅτι τρεῖς εἰσιν οἱ μαρτυροῦντες: “For there are three who testify”.'],
      },
    ],
  },
  'proper-name': {
    whatItIs: 'A proper name is the name of one particular person or place: Paul, Jesus, Jerusalem. English writes it with a capital, and so does Greek.',
    howToSpot:
      'A Greek name starts with a capital: Ἰησοῦς, Παῦλος, Ἰωάννης. A Greek name changes its endings like any noun (Ἰησοῦς, Ἰησοῦ, Ἰησοῦν); a name from Hebrew often never changes (Ἀβραάμ, Δαυίδ). A name often has the article, ὁ Ἰησοῦς, which English leaves out.',
    worked: [
      {
        word: 'Ἰησοῦ',
        ref: '1 John 1:3',
        gloss: 'Jesus',
        steps: ['Ἰησοῦ starts with a capital: a name.', 'It is Ἰησοῦς with the ending -ου: genitive, “of Jesus”.', 'μετὰ τοῦ υἱοῦ αὐτοῦ Ἰησοῦ χριστοῦ: “with his Son Jesus Christ”.'],
      },
    ],
  },
  indeclinable: {
    whatItIs: 'An indeclinable word has one form and never changes its ending, as English “sheep” is the same for one or many.',
    howToSpot:
      'Most are names from Hebrew (Ἀβραάμ, Ἰσραήλ, Δαυίδ) and number words from five up (πέντε, δώδεκα). Since the ending says nothing, the article or the sense gives the case: τοῦ Ἀβραάμ, “of Abraham”. A single letter used as a name is one too: τὸ Α καὶ τὸ Ω, “the Alpha and the Omega”.',
    worked: [
      {
        word: 'Ἀβραάμ',
        ref: 'John 8:39',
        gloss: 'Abraham',
        steps: ['Ἀβραάμ is a name from Hebrew.', 'It never changes: “Abraham”, “of Abraham”, “to Abraham” are all Ἀβραάμ.', 'The article tells the case: τὰ ἔργα τοῦ Ἀβραάμ, “the works of Abraham”.'],
      },
    ],
  },

  'stem-and-ending': {
    whatItIs: 'Most words are a stem with an ending. The stem carries the meaning and stays; the ending adds a detail. Example: in English “walked”, walk- is the stem and -ed is the ending, which says it is past.',
    howToSpot:
      'Cut a Greek word where the part that changes begins. λόγος and λόγου share λογ-, the stem; -ος and -ου are the endings. λύω “I loose” and λύομεν “we loose” share λυ-, and the ending says who. A dictionary entry shows a word with its ending (λόγος, λύω): take the ending off and what is left is the stem.',
    table: {
      caption: 'Words cut into a stem and an ending',
      columns: ['the word', 'the stem', 'the ending'],
      rows: [
        { label: '“word”', cells: ['λόγος', 'λογ-', '-ος'] },
        { label: '“of a word”', cells: ['λόγου', 'λογ-', '-ου'] },
        { label: '“I loose”', cells: ['λύω', 'λυ-', '-ω'] },
        { label: '“we loose”', cells: ['λύομεν', 'λυ-', '-ομεν'] },
        { label: '“you loose”', cells: ['λύετε', 'λυ-', '-ετε'] },
      ],
      note: 'The stem stays; only the ending moves.',
    },
    worked: [
      {
        word: 'λόγου',
        ref: '1 John 1:1',
        gloss: 'of the word',
        steps: ['Take off the ending -ου: what is left, λογ-, is the stem, which means “word”.', 'The ending -ου tells the job the word does here; -ος would tell another.', 'Put the entry’s ending back on the stem and you have the form a dictionary lists: λόγος, “word”.'],
      },
      {
        word: 'ἀρχῆς',
        ref: '1 John 1:1',
        gloss: 'of the beginning',
        steps: ['Take off the ending -ῆς: what is left, ἀρχ-, is the stem, which means “beginning”.', 'The entry reads ἀρχή: the same stem with the ending -ή.', 'The ending changes with the job in the sentence: ἀρχή, ἀρχῆς, ἀρχήν.'],
      },
    ],
  },
  'declension-1': {
    whatItIs: 'A declension is a family of nouns that change their endings in the same way, as the English nouns that add -s for more than one. Greek has three. The first is the nouns whose stem ends in α or η.',
    howToSpot:
      'Look for -α or -η in the nominative singular: ἡμέρα “day”, φωνή “sound”, ἀρχή “beginning”. Nearly all are feminine. A few masculine nouns have -ης (προφήτης “prophet”, whose genitive is -ου). The genitive singular of a feminine noun is -ας or -ης: ἀρχή, ἀρχῆς. The plural is the same for all of them: -αι, -ων, -αις, -ας.',
    table: {
      caption: 'The first declension endings of ἡμέρα “day”, φωνή “sound” and προφήτης “prophet”',
      columns: ['ἡμέρα', 'φωνή', 'προφήτης'],
      rows: [
        { label: 'one: nominative', cells: ['-α', '-η', '-ης'] },
        { label: 'one: genitive', cells: ['-ας', '-ης', '-ου'] },
        { label: 'one: dative', cells: ['-ᾳ', '-ῃ', '-ῃ'] },
        { label: 'one: accusative', cells: ['-αν', '-ην', '-ην'] },
        { label: 'more: nominative', cells: ['-αι', '-αι', '-αι'] },
        { label: 'more: genitive', cells: ['-ων', '-ων', '-ων'] },
        { label: 'more: dative', cells: ['-αις', '-αις', '-αις'] },
        { label: 'more: accusative', cells: ['-ας', '-ας', '-ας'] },
      ],
    },
    worked: [
      {
        word: 'ἀρχῆς',
        ref: '1 John 1:1',
        gloss: 'of the beginning',
        steps: ['Its entry is ἀρχή: a noun in -η, so the first declension.', 'ἀρχ- is the stem; -ῆς is the genitive ending of the table.', 'So ἀρχῆς is “of the beginning”.'],
      },
    ],
  },
  'declension-2': {
    whatItIs: 'The second declension is the family of nouns whose stem ends in ο. Most are masculine and a good many are neuter.',
    howToSpot:
      'Look for -ος or -ον in the nominative singular: λόγος “word”, ἄνθρωπος “man”, τέκνον “child”. The ones in -ος are masculine, those in -ον neuter. The genitive singular is -ου for both: λόγου, τέκνου. A neuter has the same ending for its nominative and its accusative.',
    table: {
      caption: 'The second declension endings of λόγος “word” and τέκνον “child”',
      columns: ['λόγος', 'τέκνον'],
      rows: [
        { label: 'one: nominative', cells: ['-ος', '-ον'] },
        { label: 'one: genitive', cells: ['-ου', '-ου'] },
        { label: 'one: dative', cells: ['-ῳ', '-ῳ'] },
        { label: 'one: accusative', cells: ['-ον', '-ον'] },
        { label: 'more: nominative', cells: ['-οι', '-α'] },
        { label: 'more: genitive', cells: ['-ων', '-ων'] },
        { label: 'more: dative', cells: ['-οις', '-οις'] },
        { label: 'more: accusative', cells: ['-ους', '-α'] },
      ],
    },
    worked: [
      {
        word: 'λόγου',
        ref: '1 John 1:1',
        gloss: 'of the word',
        steps: ['Its entry is λόγος: a noun in -ος, so the second declension.', 'λογ- is the stem; -ου is the genitive ending of the table.', 'So λόγου is “of the word”.'],
      },
    ],
  },
  'dictionary-entry': {
    whatItIs: 'A dictionary entry tells you what you need to know to use a word. For an English noun it gives the word, how to make the plural when that is odd, and what it is: “child, children”. A Greek entry works the same way.',
    howToSpot:
      'A noun is listed with three pieces: the nominative, the ending of the genitive, and the article, which shows the gender. ἄγγελος, -ου, ὁ reads “ἄγγελος, whose genitive is ἀγγέλου, masculine”. An adjective is listed as ἀγαθός, -ή, -όν: the endings for the masculine, the feminine and the neuter. A word for what is done is listed as λύω, “I loose”. Look a word up under its entry, not under the form you met.',
    table: {
      caption: 'How a dictionary lists three words',
      columns: ['the entry', 'the nominative', 'the genitive ending', 'the article shows'],
      rows: [
        { label: 'a noun', cells: ['ἄγγελος, -ου, ὁ', 'ἄγγελος', '-ου', 'masculine'] },
        { label: 'a noun', cells: ['ἡμέρα, -ας, ἡ', 'ἡμέρα', '-ας', 'feminine'] },
        { label: 'a noun', cells: ['τέκνον, -ου, τό', 'τέκνον', '-ου', 'neuter'] },
      ],
    },
    worked: [
      {
        word: 'ἄγγελος',
        gloss: 'messenger',
        steps: ['The entry ἄγγελος, -ου, ὁ begins with the nominative: ἄγγελος, “messenger”.', 'The ending -ου is the genitive: ἀγγέλου, “of a messenger”.', 'The article ὁ is masculine, so ἄγγελος is a masculine noun.'],
      },
    ],
  },
  'declension-3': {
    whatItIs: 'The third declension is every noun that is not of the first or the second. Its stems end in all sorts of letters, so its nominative does not tell you the stem; the genitive does.',
    howToSpot:
      'A noun that does not end in -α, -η, -ης, -ος or -ον is likely of the third declension: σάρξ “flesh”, πατήρ “father”, πνεῦμα “spirit”, πίστις “faith”, βασιλεύς “king”. Find the stem by taking -ος off the genitive of its entry: σάρξ, σαρκός gives σαρκ-. The plural is -ες in the nominative, -ων in the genitive, -σι(ν) in the dative and -ας in the accusative.',
    table: {
      caption: 'The third declension endings of σάρξ “flesh”, πατήρ “father” and πνεῦμα “spirit”',
      columns: ['σάρξ', 'πατήρ', 'πνεῦμα'],
      rows: [
        { label: 'one: nominative', cells: ['σάρξ', 'πατήρ', 'πνεῦμα'] },
        { label: 'one: genitive', cells: ['-ος', '-ος', '-ος'] },
        { label: 'one: dative', cells: ['-ι', '-ι', '-ι'] },
        { label: 'one: accusative', cells: ['-α', '-α', 'πνεῦμα'] },
        { label: 'more: nominative', cells: ['-ες', '-ες', '-ατα'] },
        { label: 'more: genitive', cells: ['-ων', '-ων', '-ων'] },
        { label: 'more: dative', cells: ['-σι(ν)', '-σι(ν)', '-σι(ν)'] },
        { label: 'more: accusative', cells: ['-ας', '-ας', '-ατα'] },
      ],
      note: 'The stem is not what you see in the nominative: σαρκ-, πατρ-, πνευματ-.',
    },
    worked: [
      {
        word: 'σαρκός',
        ref: 'John 1:13',
        gloss: 'of flesh',
        steps: ['Its entry is σάρξ, σαρκός, ἡ: the genitive shows the stem σαρκ-.', 'Take the stem and add -ός, the genitive ending of the table.', 'So σαρκός is “of flesh”, and the third declension has made σάρξ out of σαρκ- and ς.'],
      },
    ],
  },
};
