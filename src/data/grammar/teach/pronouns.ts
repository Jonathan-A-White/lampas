// src/data/grammar/teach/pronouns.ts — the cards of the pronouns tier (mw-5r3p30.234): the three persons (met first as I, you, he and as the end of an
// action word, before the verb has its own card), the pronoun, and each kind of pronoun with its forms.
import type { Teach } from './types';

const GENDERS = ['masculine', 'feminine', 'neuter'];
const CASE_ROWS = ['nominative', 'genitive', 'dative', 'accusative'];

export const PRONOUNS: Record<string, Teach> = {
  'person-1st': {
    examplesAs: ['verb', 'pronoun'],
    whatItIs: 'The first person is the one speaking: “I”, or “we” when the speaker is one of a group. Example: “I write”, “we have seen”.',
    howToSpot:
      'Greek shows it two ways. By a word: ἐγώ “I”, ἡμεῖς “we”, and their other forms, such as μου “my” and ἡμῶν “our”. Or by the end of an action word alone, with no word for “I” at all: γράφω “I write”, ἀκηκόαμεν “we have heard”. An action word that ends in -ω or -μαι is “I”; one that ends in -μεν or -μεθα is “we”.',
    table: {
      caption: 'I and we',
      columns: ['the word', 'the ending of an action word'],
      rows: [
        { label: 'I, me, my', cells: ['ἐγώ, μου, μοι, με, ἐμοῦ, ἐμοί, ἐμέ', '-ω, -μαι'] },
        { label: 'we, us, our', cells: ['ἡμεῖς, ἡμῶν, ἡμῖν, ἡμᾶς', '-μεν, -μεθα'] },
      ],
    },
    worked: [
      {
        word: 'ἀκηκόαμεν',
        ref: '1 John 1:1',
        gloss: 'we have heard',
        steps: ['ἀκηκόαμεν ends in -μεν.', '-μεν is “we”: John speaks for himself and the others who were with Jesus.', 'ὃ ἀκηκόαμεν: “that which we have heard”.'],
      },
    ],
  },
  'person-2nd': {
    examplesAs: ['verb', 'pronoun'],
    whatItIs: 'The second person is the one spoken to: “you”. Example: “you know”, “I write to you”. English “you” can be one person or many; Greek tells them apart.',
    howToSpot:
      'The word: σύ “you” for one and ὑμεῖς “you” for many, with σου and ὑμῶν “your”. The end of an action word: -ς or -σαι for one (λέγεις “you say”), -τε or -σθε for many (οἴδατε “you know”).',
    table: {
      caption: 'You',
      columns: ['the word', 'the ending of an action word'],
      rows: [
        { label: 'you, your (one)', cells: ['σύ, σου, σοι, σε, σοῦ, σοί, σέ', '-ς, -σαι, -ου, -ῃ'] },
        { label: 'you, your (many)', cells: ['ὑμεῖς, ὑμῶν, ὑμῖν, ὑμᾶς', '-τε, -σθε'] },
      ],
    },
    worked: [
      {
        word: 'ὑμῖν',
        ref: '1 John 1:2',
        gloss: 'to you',
        steps: ['ὑμῖν is a form of ὑμεῖς, “you” many.', 'John writes to many readers: “we declare to you”.', 'Beside it, ἡμῖν is “to us”: the first letter, υ or η, tells you from us.'],
      },
    ],
  },
  'person-3rd': {
    examplesAs: ['verb', 'pronoun'],
    whatItIs: 'The third person is the one spoken about: “he”, “she”, “it”, “they”. Example: “he was”, “they touched”. Any person or thing named, “the Word was”, is third person too.',
    howToSpot:
      'The word αὐτός, αὐτή, αὐτό “he, she, it” (αὐτοί “they”) is added only for weight, since the end of an action word already says it. For one: -ει, -σι(ν), -ε(ν), -ν, -ται, -το. For many: -ουσι(ν), -ασι(ν), -σαν, -ον, -νται, -ντο.',
    table: {
      caption: 'He, she, it, they',
      columns: ['the word', 'the ending of an action word'],
      rows: [
        { label: 'he, she, it', cells: ['αὐτός, αὐτή, αὐτό, αὐτοῦ, αὐτῆς, αὐτῷ, αὐτῇ, αὐτόν, αὐτήν', '-ει, -σι(ν), -ε(ν), -ν, -ται, -το, -ῃ, -η'] },
        { label: 'they, them', cells: ['αὐτοί, αὐταί, αὐτά, αὐτῶν, αὐτοῖς, αὐταῖς, αὐτούς, αὐτάς', '-ουσι(ν), -ασι(ν), -σαν, -ον, -νται, -ντο'] },
      ],
    },
    worked: [
      {
        word: 'ἐψηλάφησαν',
        ref: '1 John 1:1',
        gloss: 'touched',
        steps: ['ἐψηλάφησαν ends in -σαν.', '-σαν is “they”: the ones spoken about, here the hands.', 'αἱ χεῖρες ἡμῶν ἐψηλάφησαν: “our hands touched”.'],
      },
      {
        word: 'ἦν',
        ref: 'John 1:1',
        gloss: 'was',
        steps: ['ἦν ends in -ν, with no word for “he” or “it” beside it.', 'It speaks of the one spoken about: here the Word.', 'Ἐν ἀρχῇ ἦν ὁ λόγος: “In the beginning was the Word”.'],
      },
    ],
  },
  pronoun: {
    whatItIs: 'A pronoun stands in for a noun so the noun need not be said again: I, you, he, this, who. Example: in “Paul wrote, and he sent it”, he and it are pronouns.',
    howToSpot:
      'A Greek pronoun changes its ending for case, number and gender, as a noun does. Each kind has forms of its own, met on the cards that follow: ἐγώ “I” and αὐτός “he” (personal), οὗτος “this” (pointing), ὅς “who, which” (relative), τίς “who?” (asking).',
    worked: [
      {
        word: 'ἡμῶν',
        ref: '1 John 1:1',
        gloss: 'our',
        steps: ['ἡμῶν stands in for the people speaking, so their names need not be said.', 'It is a pronoun, a form of ἐγώ: “of us”, “our”.', 'αἱ χεῖρες ἡμῶν: “our hands”.'],
      },
    ],
  },
  'pronoun-personal': {
    whatItIs: 'A personal pronoun stands for a person or thing by its person: I, you, he, she, it, we, they. Example: “We have seen him.”',
    howToSpot:
      'Since the end of an action word already says who acts, ἐγώ, σύ and ἡμεῖς are added only for weight: “I myself”. The other cases are common: μου “my”, ἡμῶν “our”, αὐτοῦ “his”, usually after the noun they belong to.',
    table: {
      caption: 'The personal pronouns',
      columns: ['I, we', 'you', 'he, she, it, they'],
      rows: [
        { label: 'nominative singular', cells: ['ἐγώ', 'σύ', 'αὐτός, αὐτή, αὐτό'] },
        { label: 'genitive singular', cells: ['μου or ἐμοῦ', 'σου or σοῦ', 'αὐτοῦ, αὐτῆς'] },
        { label: 'dative singular', cells: ['μοι or ἐμοί', 'σοι or σοί', 'αὐτῷ, αὐτῇ'] },
        { label: 'accusative singular', cells: ['με or ἐμέ', 'σε or σέ', 'αὐτόν, αὐτήν, αὐτό'] },
        { label: 'nominative plural', cells: ['ἡμεῖς', 'ὑμεῖς', 'αὐτοί, αὐταί, αὐτά'] },
        { label: 'genitive plural', cells: ['ἡμῶν', 'ὑμῶν', 'αὐτῶν'] },
        { label: 'dative plural', cells: ['ἡμῖν', 'ὑμῖν', 'αὐτοῖς, αὐταῖς'] },
        { label: 'accusative plural', cells: ['ἡμᾶς', 'ὑμᾶς', 'αὐτούς, αὐτάς, αὐτά'] },
      ],
    },
    worked: [
      {
        word: 'ἡμῶν',
        ref: '1 John 1:1',
        gloss: 'our',
        steps: ['Find ἡμῶν in the table: genitive plural of ἐγώ, “of us”.', 'After a noun it says whose: τοῖς ὀφθαλμοῖς ἡμῶν, “our eyes”.', 'It is first person: John and those with him.'],
      },
    ],
  },
  'pronoun-demonstrative': {
    whatItIs: 'A demonstrative pronoun points: this, that, these, those. Example: “This is the message”, “that one walked”.',
    howToSpot:
      'οὗτος “this” points to what is near, ἐκεῖνος “that” to what is further off. Both change for case, number and gender, and with a noun the noun has its article: οὗτος ὁ λόγος, “this word”. The forms of οὗτος start with τ except four, which have a rough breathing: οὗτος, αὕτη, οὗτοι, αὗται.',
    table: {
      caption: 'οὗτος “this”, and ἐκεῖνος “that”',
      columns: GENDERS,
      rows: [
        { label: 'nominative singular', cells: ['οὗτος', 'αὕτη', 'τοῦτο'] },
        { label: 'genitive singular', cells: ['τούτου', 'ταύτης', 'τούτου'] },
        { label: 'dative singular', cells: ['τούτῳ', 'ταύτῃ', 'τούτῳ'] },
        { label: 'accusative singular', cells: ['τοῦτον', 'ταύτην', 'τοῦτο'] },
        { label: 'nominative plural', cells: ['οὗτοι', 'αὗται', 'ταῦτα'] },
        { label: 'genitive plural', cells: ['τούτων', 'τούτων', 'τούτων'] },
        { label: 'dative plural', cells: ['τούτοις', 'ταύταις', 'τούτοις'] },
        { label: 'accusative plural', cells: ['τούτους', 'ταύτας', 'ταῦτα'] },
        {
          label: 'ἐκεῖνος, every case',
          cells: [
            'ἐκεῖνος, ἐκείνου, ἐκείνῳ, ἐκεῖνον, ἐκεῖνοι, ἐκείνων, ἐκείνοις, ἐκείνους',
            'ἐκείνη, ἐκείνης, ἐκείνῃ, ἐκείνην, ἐκεῖναι, ἐκείναις, ἐκείνας',
            'ἐκεῖνο, ἐκείνου, ἐκείνῳ, ἐκεῖνα, ἐκείνων, ἐκείνοις',
          ],
        },
      ],
    },
    worked: [
      {
        word: 'αὕτη',
        ref: '1 John 1:5',
        gloss: 'this',
        steps: ['Find αὕτη in the table: nominative singular feminine of οὗτος.', 'It points to what comes next, ἡ ἀγγελία, “the message”, also feminine.', 'Καὶ ἔστιν αὕτη ἡ ἀγγελία: “And this is the message”.'],
      },
    ],
  },
  'pronoun-relative': {
    whatItIs:
      'A relative pronoun opens a part of the sentence that tells more about a word before it: who, which, that. Example: “the man who called”, “that which we have heard”.',
    howToSpot:
      'ὅς, ἥ, ὅ “who, which”: every form has a rough breathing and an accent, and most look like the article with its τ taken off (ὅν, ἥν, οὗ, ἧς, ᾧ, ᾗ). It takes its gender and number from the word it points back to, and its case from its own job in its own part of the sentence. Do not take ὅ “which” for ὁ “the”: the accent tells them apart.',
    table: {
      caption: 'ὅς, ἥ, ὅ “who, which”',
      columns: GENDERS,
      rows: [
        ...CASE_ROWS.map((c, i) => ({ label: `${c} singular`, cells: [['ὅς', 'ἥ', 'ὅ'], ['οὗ', 'ἧς', 'οὗ'], ['ᾧ', 'ᾗ', 'ᾧ'], ['ὅν', 'ἥν', 'ὅ']][i] })),
        ...CASE_ROWS.map((c, i) => ({ label: `${c} plural`, cells: [['οἵ', 'αἵ', 'ἅ'], ['ὧν', 'ὧν', 'ὧν'], ['οἷς', 'αἷς', 'οἷς'], ['οὕς', 'ἅς', 'ἅ']][i] })),
      ],
      note: 'ὅστις, ἥτις, ὅ τι “whoever, which” is ὅς with τις joined to it: ὅστις, ἥτις, οἵτινες.',
    },
    worked: [
      {
        word: 'Ὃ',
        ref: '1 John 1:1',
        gloss: 'that which',
        steps: ['Ὃ is ὅ with a capital, for it begins the letter.', 'Find it in the table: neuter singular, “that which”. It has an accent, so it is not ὁ “the”.', 'Ὃ ἦν ἀπ᾿ ἀρχῆς: “That which was from the beginning”; the rest of the sentence tells what it is.'],
      },
    ],
  },
  'pronoun-interrogative': {
    whatItIs: 'An interrogative pronoun asks a question: who? what? which? Example: “Who is the liar?”',
    howToSpot:
      'τίς, τί “who? what?” always keeps its acute accent, on the first syllable, and the question ends with the Greek question mark ;. τί can also mean “why?”.',
    table: {
      caption: 'τίς, τί “who? what?”',
      columns: ['who', 'what'],
      rows: [
        { label: 'nominative singular', cells: ['τίς', 'τί'] },
        { label: 'genitive singular', cells: ['τίνος', 'τίνος'] },
        { label: 'dative singular', cells: ['τίνι', 'τίνι'] },
        { label: 'accusative singular', cells: ['τίνα', 'τί'] },
        { label: 'nominative plural', cells: ['τίνες', 'τίνα'] },
        { label: 'genitive plural', cells: ['τίνων', 'τίνων'] },
        { label: 'dative plural', cells: ['τίσι(ν)', 'τίσι(ν)'] },
        { label: 'accusative plural', cells: ['τίνας', 'τίνα'] },
      ],
    },
    worked: [
      {
        word: 'Τίς',
        ref: '1 John 2:22',
        gloss: 'who',
        steps: ['Τίς has its acute accent: it is the question word “who?”.', 'The sentence ends with ;, the Greek question mark.', 'Τίς ἐστιν ὁ ψεύστης; “Who is the liar?”'],
      },
    ],
  },
  'pronoun-indefinite': {
    whatItIs: 'An indefinite pronoun means someone or something without saying who: someone, anyone, something, a certain. Example: “If anyone sins…”',
    howToSpot:
      'τις, τι is spelt like the question word τίς but is an enclitic: it has no accent of its own on its first syllable, and it often follows its word, ἄνθρωπός τις, “a certain man”. Its forms are those of τίς with the accent gone or moved: τις, τι, τινός, τινί, τινά, τινές, τινῶν, τισί(ν), τινάς.',
    table: {
      caption: 'τις, τι “someone, something”',
      columns: ['someone', 'something'],
      rows: [
        { label: 'nominative singular', cells: ['τις', 'τι'] },
        { label: 'genitive singular', cells: ['τινός', 'τινός'] },
        { label: 'dative singular', cells: ['τινί', 'τινί'] },
        { label: 'accusative singular', cells: ['τινά', 'τι'] },
        { label: 'nominative plural', cells: ['τινές', 'τινά'] },
        { label: 'genitive plural', cells: ['τινῶν', 'τινῶν'] },
        { label: 'dative plural', cells: ['τισί(ν)', 'τισί(ν)'] },
        { label: 'accusative plural', cells: ['τινάς', 'τινά'] },
      ],
    },
    worked: [
      {
        word: 'τις',
        ref: '1 John 2:1',
        gloss: 'anyone',
        steps: ['τις has no accent: it is not the question word τίς.', 'It means “someone”, “anyone”.', 'ἐάν τις ἁμάρτῃ: “if anyone sins”.'],
      },
    ],
  },
  'pronoun-reflexive': {
    whatItIs: 'A reflexive pronoun turns the action back on the one who does it: myself, yourselves, himself. Example: “we deceive ourselves”.',
    howToSpot:
      'It is ἑαυτ- “himself”, ἐμαυτ- “myself” or σεαυτ- “yourself” with the endings of αὐτός: ἑαυτόν, ἑαυτοῦ, ἑαυτῷ. In the plural ἑαυτ- serves for every person: ἑαυτούς “ourselves, yourselves, themselves”. It is never the one who acts, so it has no nominative.',
    table: {
      caption: 'Myself, yourself, himself',
      columns: ['myself', 'yourself', 'himself, herself, itself'],
      rows: [
        { label: 'genitive singular', cells: ['ἐμαυτοῦ', 'σεαυτοῦ', 'ἑαυτοῦ, ἑαυτῆς'] },
        { label: 'dative singular', cells: ['ἐμαυτῷ', 'σεαυτῷ', 'ἑαυτῷ, ἑαυτῇ'] },
        { label: 'accusative singular', cells: ['ἐμαυτόν', 'σεαυτόν', 'ἑαυτόν, ἑαυτήν, ἑαυτό'] },
        { label: 'plural, every person', cells: ['ἑαυτῶν, ἑαυτοῖς, ἑαυτούς', 'ἑαυτῶν, ἑαυτοῖς, ἑαυτούς, ἑαυτά', 'ἑαυτῶν, ἑαυτοῖς, ἑαυταῖς, ἑαυτούς, ἑαυτάς'] },
      ],
    },
    worked: [
      {
        word: 'ἑαυτοὺς',
        ref: '1 John 1:8',
        gloss: 'ourselves',
        steps: ['ἑαυτοὺς is ἑαυτ- with -ους: accusative plural.', 'It turns the action back on the ones acting: “ourselves”.', 'ἑαυτοὺς πλανῶμεν: “we deceive ourselves”.'],
      },
    ],
  },
  'pronoun-possessive': {
    whatItIs: 'A possessive pronoun says whose something is: my, your, our. Example: “my joy”, “our fellowship”.',
    howToSpot:
      'Greek has two ways. Most often it puts the genitive of a personal pronoun after the noun: ἡ χαρὰ ἡμῶν, “our joy”. Less often it uses the adjectives ἐμός “my”, σός “your”, ἡμέτερος “our” and ὑμέτερος “your”, which take the case, number and gender of the thing owned. The owner is called the possessor.',
    table: {
      caption: 'The possessive adjectives',
      columns: GENDERS,
      rows: [
        { label: 'my', cells: ['ἐμός, ἐμοῦ, ἐμῷ, ἐμόν', 'ἐμή, ἐμῆς, ἐμῇ, ἐμήν', 'ἐμόν, ἐμοῦ, ἐμῷ, ἐμά'] },
        { label: 'your (one)', cells: ['σός, σοῦ, σῷ, σόν', 'σή, σῆς, σῇ, σήν', 'σόν, σά'] },
        { label: 'our', cells: ['ἡμέτερος, ἡμετέρου, ἡμετέρῳ', 'ἡμετέρα, ἡμετέρας, ἡμετέρᾳ, ἡμετέραν', 'ἡμέτερον, ἡμέτερα'] },
        { label: 'your (many)', cells: ['ὑμέτερος, ὑμετέρου, ὑμετέρῳ', 'ὑμετέρα, ὑμετέρας, ὑμετέρᾳ, ὑμετέραν', 'ὑμέτερον, ὑμέτερα'] },
      ],
    },
    worked: [
      {
        word: 'ἡμετέρα',
        ref: '1 John 1:3',
        gloss: 'our',
        steps: ['ἡμετέρα is the adjective “our”: the possessor is “we”.', 'It matches κοινωνία, “fellowship”, the thing owned: nominative singular feminine.', 'ἡ κοινωνία δὲ ἡ ἡμετέρα: “and our fellowship”.'],
      },
    ],
  },
  'pronoun-reciprocal': {
    whatItIs: 'A reciprocal pronoun says people do the same to each other: one another, each other. Example: “love one another”.',
    howToSpot: 'ἀλλήλων “of one another”, ἀλλήλοις “to one another”, ἀλλήλους “one another”. It is always plural, since it needs two at least, and it is never the one who acts.',
    table: {
      caption: 'One another',
      columns: ['form'],
      rows: [
        { label: 'genitive plural', cells: ['ἀλλήλων'] },
        { label: 'dative plural', cells: ['ἀλλήλοις'] },
        { label: 'accusative plural', cells: ['ἀλλήλους'] },
      ],
    },
    worked: [
      {
        word: 'ἀλλήλους',
        ref: '1 John 3:11',
        gloss: 'one another',
        steps: ['ἀλλήλους is accusative plural: the ones loved.', 'Each loves the others: “one another”.', 'ἵνα ἀγαπῶμεν ἀλλήλους: “that we should love one another”.'],
      },
    ],
  },
  'pronoun-correlative': {
    whatItIs: 'A correlative pronoun matches an amount or a kind with another: as many as, such, so great. Example: “as many as received him”.',
    howToSpot:
      'Look for ὅσος “as many as, as great as”, οἷος “such as, of the kind that”, τοιοῦτος “such” and τοσοῦτος “so great”. They change for case, number and gender, and often come in pairs: ὅσοι … οὗτοι, “as many as … these”.',
    worked: [
      {
        word: 'Ὅσοι',
        ref: 'John 1:12',
        gloss: 'as many as',
        steps: ['Ὅσοι is a form of ὅσος: nominative plural masculine.', 'It matches a number of people: “as many as”.', 'Ὅσοι δὲ ἔλαβον αὐτόν: “But as many as received him”.'],
      },
    ],
  },
  'pronoun-correlative-interrogative': {
    whatItIs: 'Some pronouns can ask a question or match one thing with another, and the sentence decides which: how much? how many? what kind? Example: “How much do you owe?”',
    howToSpot: 'πόσος “how much? how many?” and ποῖος “what kind?”. With the Greek question mark ; they ask; beside a matching word they compare.',
    worked: [
      {
        word: 'Πόσον',
        ref: 'Luke 16:5',
        gloss: 'how much',
        steps: ['Πόσον is a form of πόσος, “how much?”.', 'The sentence ends with ;: here it asks.', 'Πόσον ὀφείλεις τῷ κυρίῳ μου; “How much do you owe my master?”'],
      },
    ],
  },
};
