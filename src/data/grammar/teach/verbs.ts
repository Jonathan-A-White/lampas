// src/data/grammar/teach/verbs.ts — the cards of the verbs tier (mw-5r3p30.234): the verb, compound verbs, each tense with its endings, the voices
// and the deponents, and the moods. A tense's table is its endings for I, you, he, we, you, they; a card names a voice or a mood only once a card
// below it has taught it. The verb, the infinitive and the participle each draw a verse as a sentence diagram, the word they teach lit in its place
// (mw-5r3p30.792).
import { greek, hang, prep, slot } from '../../../diagram/handwritten';
import type { Teach, TeachTable } from './types';

const PERSONS = ['I', 'you (one)', 'he, she, it', 'we', 'you (many)', 'they'];

/** A table of endings by person: one column per pattern. */
const byPerson = (caption: string, columns: string[], cells: string[][]): TeachTable => ({
  caption,
  columns,
  rows: PERSONS.map((label, i) => ({ label, cells: cells.map((column) => column[i]) })),
});

/** The endings that end in -μαι, -ται, -νται: now (and the future) and in the past. */
const MAI_NOW = ['-μαι', '-σαι or -ῃ', '-ται', '-μεθα', '-σθε', '-νται'];
const MAI_PAST = ['-μην', '-σο or -ου', '-το', '-μεθα', '-σθε', '-ντο'];

export const VERBS: Record<string, Teach> = {
  verb: {
    whatItIs: 'A verb says what someone does or what happens: write, see, love, be. Every sentence has one. Example: in “We have seen it”, “have seen” is the verb.',
    howToSpot:
      'A Greek verb is a stem with an ending, and the ending tells who does it (the person) and how many (the number): λέγω “I say”, λέγεις “you say”, λέγει “he says”, λέγομεν “we say”, λέγετε “you say”, λέγουσι(ν) “they say”. So one Greek word is often a whole English sentence. A dictionary lists a verb under its “I” form: λέγω.',
    // ὁ λόγος ἦν πρὸς τὸν θεόν, “the Word was with God”: ἦν on the base line, right of the bar
    diagram: {
      reference: 'John 1:1',
      verse: { book: 'jhn', chapter: 1, verse: 1 },
      mode: 'greek',
      words: greek([6, 'ὁ'], [7, 'λόγος'], [8, 'ἦν'], [9, 'πρὸς'], [10, 'τὸν'], [11, 'θεόν']),
      diagram: { clauses: [{ clause: { subject: slot([1], [hang(0)]), verb: slot([2], [prep(3, slot([5], [hang(4)]))]) } }] },
      lit: [2],
    },
    worked: [
      {
        word: 'ἀκηκόαμεν',
        ref: '1 John 1:1',
        gloss: 'we have heard',
        steps: ['ἀκηκόαμεν says what was done: “have heard”.', 'Its ending -μεν tells who: “we”, the first person plural.', 'Its dictionary form is ἀκούω, “I hear”: one Greek word, “we have heard”.'],
      },
      {
        word: 'ἦν',
        ref: 'John 1:1',
        gloss: 'was',
        steps: ['ἦν tells what happened: “was”.', 'Its ending -ν tells who: “he, she, it”, the third person singular; here the Word.', 'Its dictionary form is εἰμί, “I am”.'],
      },
    ],
  },
  'compound-verbs': {
    whatItIs: 'A compound verb is a verb with a preposition joined to its front, as English “overcome” is “over” and “come”. The preposition usually keeps its meaning.',
    howToSpot:
      'Look for a preposition at the front of a verb: ἐκ-βάλλω “throw out”, εἰσ-έρχομαι “go in”, κατα-βαίνω “go down”. It may change to fit: ἐκ is ἐξ before a vowel, and a last vowel drops (κατ-έβη, ἀπ-αγγέλλω). Look the verb up under the whole word; knowing both parts, you can often guess it.',
    table: {
      caption: 'A preposition joined to a verb',
      columns: ['the preposition', 'the verb', 'means'],
      rows: [
        { label: 'ἐκβάλλω', cells: ['ἐκ “out of”', 'βάλλω “throw”', 'throw out'] },
        { label: 'εἰσέρχομαι', cells: ['εἰς “into”', 'ἔρχομαι “go”', 'go in'] },
        { label: 'καταβαίνω', cells: ['κατά “down”', 'βαίνω “step”', 'go down'] },
        { label: 'ἀπαγγέλλω', cells: ['ἀπό “from”', 'ἀγγέλλω “announce”', 'declare'] },
      ],
    },
    worked: [
      {
        word: 'ἀπαγγέλλομεν',
        ref: '1 John 1:2',
        gloss: 'we declare',
        steps: ['ἀπαγγέλλομεν is ἀπ- and ἀγγέλλομεν, “we announce”.', 'ἀπό, “from”, lost its last vowel before the α of the verb.', 'Together, “announce from”: “we declare”. ἀπαγγέλλομεν ὑμῖν, “we declare to you”.'],
      },
    ],
  },
  'tense-present': {
    whatItIs: 'The present tense speaks of what is happening now, or goes on happening. Example: “we write”, “we are writing”, “he keeps walking”.',
    howToSpot:
      'It is the dictionary form’s stem with the plain endings, and nothing added in front: -ω, -εις, -ει, -ομεν, -ετε, -ουσι(ν) (γράφω “I write”). A verb whose dictionary form ends in -ομαι has -ομαι, -ῃ, -εται, -ομεθα, -εσθε, -ονται (ἔρχομαι “I come”). εἰμί “I am” is a law to itself.',
    table: byPerson(
      'The present endings',
      ['γράφω “I write”', 'ἔρχομαι “I come”', 'εἰμί “I am”'],
      [
        ['-ω', '-εις', '-ει', '-ομεν', '-ετε', '-ουσι(ν)'],
        ['-ομαι', '-ῃ', '-εται', '-ομεθα', '-εσθε', '-ονται'],
        ['εἰμί', 'εἶ', 'ἐστί(ν)', 'ἐσμέν', 'ἐστέ', 'εἰσί(ν)'],
      ],
    ),
    worked: [
      {
        word: 'γράφομεν',
        ref: '1 John 1:4',
        gloss: 'we write',
        steps: ['γράφομεν: the stem γραφ- of γράφω, “I write”, and the ending -ομεν.', '-ομεν is in the table: “we”, now: “we are writing”.', 'ταῦτα γράφομεν ὑμῖν: “we write these things to you”.'],
      },
    ],
  },
  'voice-active': {
    whatItIs:
      'A voice says whether the one named does the action or has it done to him. In the active voice the one named does it. Example: “The dog bit the man”: the dog does the biting. Most verbs you meet are active.',
    howToSpot:
      'Active endings are the plain ones: -ω, -εις, -ει, -ομεν, -ετε, -ουσι(ν), and in the past -ον, -ες, -ε(ν), -σα, -σαν. Endings in -μαι, -ται, -μεθα, -σθε or -νται, or a θη before the ending, are not active: the cards above this one show them.',
    worked: [
      {
        word: 'ἐψηλάφησαν',
        ref: '1 John 1:1',
        gloss: 'touched',
        steps: ['The hands did the touching: active.', 'Its ending -σαν is a plain one, with no -ται, -σθε or θη.', 'αἱ χεῖρες ἡμῶν ἐψηλάφησαν: “our hands touched”.'],
      },
    ],
  },
  'mood-indicative': {
    whatItIs:
      'A mood is the way a verb puts its action: as a fact, a command, a wish. The indicative is the mood of plain statements and questions about what is, was or will be. Example: “He came.” “Is he here?” Most verbs in a story are indicative.',
    howToSpot:
      'It is the form you have met so far: the plain endings, and in the past an ε added in front. Only in the indicative does the tense also tell the time.',
    worked: [
      {
        word: 'ἦν',
        ref: '1 John 1:1',
        gloss: 'was',
        steps: ['ἦν says plainly what was: “was”.', 'It is a statement of fact, not a wish or a command: indicative.', 'Ὃ ἦν ἀπ᾿ ἀρχῆς: “That which was from the beginning”.'],
      },
    ],
  },
  'tense-imperfect': {
    whatItIs:
      'The imperfect tense speaks of something going on, or done again and again, in the past. Example: “he was teaching”, “they used to come”. It paints the scene; English uses “was …-ing” or “used to”.',
    howToSpot:
      'Look for two things. An ε added to the front of the stem, called the augment (λέγω, ἔλεγον); a stem that begins with a vowel lengthens it instead (ἀκούω, ἤκουον). And the endings -ον, -ες, -ε(ν), -ομεν, -ετε, -ον (or -ομην, -ου, -ετο, -ομεθα, -εσθε, -οντο). ἦν “was” is the imperfect of εἰμί. The imperfect is found only in the indicative.',
    table: byPerson(
      'The imperfect endings',
      ['ἔλεγον “I was saying”', 'ἠρχόμην “I was coming”', 'ἤμην “I was”'],
      [
        ['-ον', '-ες', '-ε(ν)', '-ομεν', '-ετε', '-ον'],
        ['-ομην', '-ου', '-ετο', '-ομεθα', '-εσθε', '-οντο'],
        ['ἤμην', 'ἦς', 'ἦν', 'ἦμεν', 'ἦτε', 'ἦσαν'],
      ],
    ),
    worked: [
      {
        word: 'ἦν',
        ref: '1 John 1:1',
        gloss: 'was',
        steps: ['ἦν is the imperfect of εἰμί, “I am”: find it in the table.', 'It speaks of the past as going on: “was”, there all along.', 'Ὃ ἦν ἀπ᾿ ἀρχῆς: “That which was from the beginning”.'],
      },
      {
        word: 'ἦν',
        ref: 'John 1:1',
        gloss: 'was',
        steps: ['ἦν is the imperfect of εἰμί, “I am”: find it in the table.', 'It speaks of the past as going on: the Word was there all along.', 'Ἐν ἀρχῇ ἦν ὁ λόγος: “In the beginning was the Word”.'],
      },
    ],
  },
  'tense-future': {
    whatItIs: 'The future tense speaks of what will happen. Example: “he will come”, “we shall live”.',
    howToSpot:
      'Look for σ just before the ending: ζή-σ-ομεν “we will live”. The endings are the present’s: -σω, -σεις, -σει, -σομεν, -σετε, -σουσι(ν). The σ joins a consonant before it: γράφω gives γράψω (φ and σ make ψ), ἄγω gives ἄξω (γ and σ make ξ). εἰμί has its own: ἔσομαι “I will be”.',
    table: byPerson(
      'The future endings',
      ['ζήσω “I will live”', 'ἔσομαι “I will be”'],
      [
        ['-σω or -ψω or -ξω', '-σεις or -ψεις or -ξεις', '-σει or -ψει or -ξει', '-σομεν or -ψομεν or -ξομεν', '-σετε or -ψετε or -ξετε', '-σουσι(ν) or -ψουσι(ν) or -ξουσι(ν)'],
        ['-σομαι', '-σῃ', '-σεται or ἔσται', '-σομεθα', '-σεσθε', '-σονται'],
      ],
    ),
    worked: [
      {
        word: 'ζήσομεν',
        ref: 'Romans 6:2',
        gloss: 'shall we live',
        steps: ['ζήσομεν: the stem ζη- of ζάω, “I live”, then σ, then -ομεν.', 'The σ before the ending marks the future; -ομεν means “we”.', 'πῶς ἔτι ζήσομεν ἐν αὐτῇ; “How shall we live in it any longer?”'],
      },
    ],
  },
  'tense-aorist': {
    whatItIs:
      'The aorist tense tells of an action as one whole event, without saying how long it took. In the indicative it is the plain past: “he said”, “they touched”. It is the usual tense for telling a story.',
    howToSpot:
      'In the indicative it has the augment in front, like the imperfect, and σα before the ending: -σα, -σας, -σε(ν), -σαμεν, -σατε, -σαν. A verb in -ομαι has -σαμην, -σω, -σατο, -σαμεθα, -σασθε, -σαντο. Some common verbs make it without σα; you will meet them later.',
    table: byPerson(
      'The aorist endings',
      ['ἐπίστευσα “I believed”', 'ἐθεασάμην “I looked at”'],
      [
        ['-σα', '-σας', '-σε(ν)', '-σαμεν', '-σατε', '-σαν'],
        ['-σαμην', '-σω', '-σατο', '-σαμεθα', '-σασθε', '-σαντο'],
      ],
    ),
    worked: [
      {
        word: 'ἐψηλάφησαν',
        ref: '1 John 1:1',
        gloss: 'touched',
        steps: ['ἐ- in front: the augment, so it is past.', 'ψηλαφη- is the stem of ψηλαφάω, “touch”; then σα and -ν: -σαν, “they”.', 'σα before the ending marks the aorist, one whole act: αἱ χεῖρες ἡμῶν ἐψηλάφησαν, “our hands touched”.'],
      },
    ],
  },
  'tense-perfect': {
    whatItIs: 'The perfect tense speaks of an action done in the past whose result still stands. Example: “we have seen”: we saw, and we still know it. γέγραπται, “it is written”: it was written, and it stands.',
    howToSpot:
      'Look for the first consonant doubled with ε (reduplication): πιστεύω gives πε-πίστευ-κα, γράφω gives γέ-γραπ-ται. A verb that begins with a vowel lengthens it instead (ὁράω, ἑώρακα). And κα before the ending: -κα, -κας, -κε(ν), -καμεν, -κατε, -κασι(ν). Forms in -μαι and -ται have no κ: γέγραπται.',
    table: byPerson(
      'The perfect endings',
      ['πεπίστευκα “I have believed”', 'γέγραμμαι “I have been written”'],
      [
        ['-κα', '-κας', '-κε(ν)', '-καμεν', '-κατε', '-κασι(ν) or -καν'],
        ['-μαι', '-σαι', '-ται', '-μεθα', '-σθε', '-νται'],
      ],
    ),
    worked: [
      {
        word: 'ἑωράκαμεν',
        ref: '1 John 1:1',
        gloss: 'we have seen',
        steps: ['ἑωρα- is the stem of ὁράω, “see”, its first vowel lengthened: the mark of the perfect.', '-καμεν: κα marks the perfect, -μεν means “we”.', 'So “we have seen”, and what we saw still stands before us.'],
      },
    ],
  },
  'tense-pluperfect': {
    whatItIs: 'The pluperfect is the perfect moved into the past: an action done whose result stood at a past time. Example: “they had come”, “he had known all along”.',
    howToSpot:
      'It is rare. Like the perfect it doubles the first consonant, often adds the augment too, and has endings with ει: -κειν, -κεις, -κει, -κειμεν, -κειτε, -κεισαν. ᾔδειν “I knew” is the pluperfect of οἶδα “I know”.',
    table: byPerson(
      'The pluperfect endings',
      ['ending', 'ᾔδειν “I knew”'],
      [
        ['-κειν', '-κεις', '-κει', '-κειμεν', '-κειτε', '-κεισαν'],
        ['ᾔδειν', 'ᾔδεις', 'ᾔδει', 'ᾔδειμεν', 'ᾔδειτε', 'ᾔδεισαν'],
      ],
    ),
    worked: [
      {
        word: 'ᾔδει',
        ref: 'John 6:6',
        gloss: 'knew',
        steps: ['ᾔδει is in the table: the pluperfect of οἶδα, “I know”.', 'Its ει ending marks it: “he knew”, known before and still known.', 'αὐτὸς γὰρ ᾔδει τί ἔμελλεν ποιεῖν: “for he himself knew what he would do”.'],
      },
    ],
  },
  'second-tenses': {
    whatItIs:
      'Some verbs make their aorist or perfect another, older way, called the second aorist and the second perfect. The meaning is the same as the usual way. English has the like: “walked” is made the usual way, “ran” another way.',
    howToSpot:
      'A second aorist has no σα: it puts the imperfect’s endings -ον, -ες, -ε(ν), -ομεν, -ετε, -ον on a changed stem, with the augment: λαμβάνω gives ἔλαβον “I took”, ἔρχομαι gives ἦλθον “I came”. A second perfect has no κα: ἀκηκόαμεν “we have heard”. Learn the changed stem with each verb.',
    table: {
      caption: 'Second aorists and perfects',
      columns: ['second aorist or perfect', 'means'],
      rows: [
        { label: 'λαμβάνω', cells: ['ἔλαβον', 'I took'] },
        { label: 'ἔρχομαι', cells: ['ἦλθον', 'I came'] },
        { label: 'λέγω', cells: ['εἶπον', 'I said'] },
        { label: 'ὁράω', cells: ['εἶδον', 'I saw'] },
        { label: 'γίνομαι', cells: ['ἐγενόμην', 'I became'] },
        { label: 'ἀκούω', cells: ['ἀκήκοα', 'I have heard'] },
        { label: 'their endings', cells: ['-ον, -ες, -ε(ν), -ομεν, -ετε, -οσαν, -ομην, -ετο, -οντο, -α, -αμεν, -ατε, -ασι(ν)', ''] },
      ],
    },
    worked: [
      {
        word: 'ἀκηκόαμεν',
        ref: '1 John 1:1',
        gloss: 'we have heard',
        steps: ['ἀκηκόαμεν is a perfect of ἀκούω, “hear”: the ἀκ- doubled, ἀκ-ηκο-.', 'There is no κα before the ending -αμεν: a second perfect.', 'It means what any perfect means: “we have heard”, and it stays with us.'],
      },
    ],
  },
  'voice-middle': {
    whatItIs:
      'In the middle voice the one who acts is caught up in the action: it is done for himself, to himself, or in his own interest. English has no such form and says “for myself” or “myself”. Example: “I wash myself”, “you ask for yourselves”.',
    howToSpot:
      'Middle endings end in -μαι, -ται, -μεθα, -σθε, -νται (now) and -μην, -το, -ντο (past), sometimes with σα before them: -σαμην, -σατο. Many verbs are middle in form but plain in meaning: the cards after this one show them.',
    table: byPerson('The middle endings', ['now', 'in the past'], [MAI_NOW, MAI_PAST]),
    worked: [
      {
        word: 'αἰτεῖσθε',
        ref: 'James 4:3',
        gloss: 'you ask',
        steps: ['αἰτεῖσθε ends in -σθε: a middle ending, “you” (many).', 'αἰτέω is “ask”; in the middle, “ask for yourselves”.', 'κακῶς αἰτεῖσθε: “you ask wrongly”, asking for your own pleasures.'],
      },
    ],
  },
  'voice-passive': {
    whatItIs:
      'In the passive voice the one named does not act but has the action done to him. Example: “The life was made known”, “the man was healed”. Who did it may follow, with “by”.',
    howToSpot:
      'Its own mark is θη: in the aorist ἐ-φανερώ-θη “it was made known”, with -θην, -θης, -θη, -θημεν, -θητε, -θησαν; and θησ for what will be done, as in -θήσομαι. Now and in the past it has the -μαι, -ται, -σθε endings, which you will meet again. Who does it is ὑπό with the genitive: ὑπὸ τοῦ θεοῦ, “by God”.',
    table: byPerson(
      'The passive endings',
      ['was done', 'will be done'],
      [
        ['-θην', '-θης', '-θη', '-θημεν', '-θητε', '-θησαν'],
        ['-θησομαι', '-θησῃ', '-θησεται', '-θησομεθα', '-θησεσθε', '-θησονται'],
      ],
    ),
    worked: [
      {
        word: 'ἐφανερώθη',
        ref: '1 John 1:2',
        gloss: 'was made known',
        steps: ['ἐ- in front: the augment, past.', 'θη before the end: aorist passive.', 'ἡ ζωὴ ἐφανερώθη: “the life was made known”: the life did not show itself; it was shown.'],
      },
    ],
  },
  'voice-middle-or-passive': {
    whatItIs:
      'In most tenses the middle and the passive share one set of forms (not where the passive has its θη). So a form can be either, and the sentence decides: “he washes himself” (middle) or “he is washed” (passive).',
    howToSpot:
      'The shared endings are -μαι, -ῃ, -ται, -μεθα, -σθε, -νται (now) and -μην, -ου, -το, -μεθα, -σθε, -ντο (past). Ask whether the one named acts for himself (middle) or has it done to him (passive). If someone else is named as doing it, often with ὑπό, it is passive.',
    table: byPerson('The middle or passive endings', ['now', 'in the past'], [MAI_NOW, MAI_PAST]),
    worked: [
      {
        word: 'φαίνεται',
        ref: 'Matthew 2:13',
        gloss: 'appears',
        steps: ['φαίνεται ends in -ται: middle or passive, “he”.', 'φαίνω is “show”: “he shows himself” (middle) or “he is shown” (passive).', 'ἄγγελος κυρίου φαίνεται: “an angel of the Lord appears”.'],
      },
    ],
  },
  'voice-middle-deponent': {
    whatItIs:
      'A deponent verb has middle forms but a plain, active meaning: the “for himself” has worn away. English has nothing like it; read it as an ordinary verb. Example: ἔρχομαι is “I come”, not “I come for myself”.',
    howToSpot:
      'Its dictionary form already ends in -ομαι, and it has no active form beside it: ἔρχομαι “come”, γίνομαι “become”, πορεύομαι “go”, θεάομαι “look at”. Middle endings, plain meaning.',
    worked: [
      {
        word: 'ἐθεασάμεθα',
        ref: '1 John 1:1',
        gloss: 'we looked at',
        steps: ['ἐθεασάμεθα is from θεάομαι, “look at”, a dictionary form in -ομαι.', '-σάμεθα is a middle aorist ending: “we”.', 'But θεάομαι is deponent: read it as plain “we looked at”, “we gazed upon”.'],
      },
    ],
  },
  'voice-passive-deponent': {
    whatItIs: 'A passive deponent is a verb with a passive form in the aorist but a plain, active meaning. Example: ἐβουλήθη is “he decided”, not “he was decided”.',
    howToSpot: 'Look for θη, the aorist passive mark, on a verb that means a plain action: ἐβουλήθη “he decided”, ἐφοβήθησαν “they were afraid”, ἐπορεύθη “he went”. Translate it as an ordinary verb.',
    worked: [
      {
        word: 'ἐβουλήθη',
        ref: 'Matthew 1:19',
        gloss: 'he decided',
        steps: ['ἐβουλήθη has θη before its end: an aorist passive form.', 'βούλομαι, “want, decide”, is deponent: read it as plain active.', 'ἐβουλήθη λάθρᾳ ἀπολῦσαι αὐτήν: “he decided to send her away quietly”.'],
      },
    ],
  },
  'voice-middle-or-passive-deponent': {
    whatItIs: 'Some deponent forms could be read as middle or as passive; either way the verb means a plain action. Example: ἔρχεται, “he comes”.',
    howToSpot: 'The -ομαι, -εται, -ονται endings of a deponent verb, in a tense where middle and passive look alike. Read it as an ordinary active verb.',
    worked: [
      {
        word: 'ἔρχεται',
        ref: '1 John 2:18',
        gloss: 'is coming',
        steps: ['ἔρχεται ends in -εται: middle or passive in form.', 'ἔρχομαι is deponent: it means plain “come”.', 'ὁ ἀντίχριστος ἔρχεται: “the antichrist is coming”.'],
      },
    ],
  },
  'voice-middle-significance': {
    whatItIs: 'Some verb forms look active but carry a middle meaning: the one acting does it for or to himself. Example: English “I wash” often means “I wash myself”.',
    howToSpot: 'The form is plain active, and the parsing adds “middle significance”. Read it with a “for himself” or “himself” sense. It is rare.',
    table: {
      caption: 'Active in form, middle in meaning',
      columns: ['its form', 'its meaning'],
      rows: [{ label: 'νίπτω', cells: ['active: “I wash”', 'middle: “I wash myself”'] }],
    },
    worked: [
      {
        word: 'νίπτω',
        gloss: 'I wash',
        steps: ['νίπτω has the plain active ending -ω.', 'Said of oneself it has a middle sense: “I wash (myself)”.', 'So read the form as active, the meaning as middle.'],
      },
    ],
  },
  'voice-impersonal-active': {
    whatItIs: 'An impersonal verb has no real person doing it; English fills the gap with “it”. Example: “it is necessary”, “it is raining”.',
    howToSpot: 'δεῖ “it is necessary, one must” and ἔξεστι(ν) “it is allowed” are the commonest. They are always third person singular: put “it” in front.',
    worked: [
      {
        word: 'Δεῖ',
        ref: 'John 3:7',
        gloss: 'it is necessary',
        steps: ['Δεῖ has no one doing it: “it is necessary”.', 'The one who must is named after it: ὑμᾶς, “you”.', 'Δεῖ ὑμᾶς γεννηθῆναι ἄνωθεν: “You must be born again”.'],
      },
    ],
  },
  'voice-none': {
    whatItIs: 'A few verb forms have no voice at all: they only say that something is, as English “is” and “seems”. Nothing is done to anyone.',
    howToSpot: 'Mostly εἰμί “I am” and its forms: ἐστίν “is”, ἦν “was”, ἔσται “will be”. A parsing may give them no voice; read them as plain “is”, “was”, “will be”.',
    worked: [
      {
        word: 'ἐστίν',
        ref: '1 John 1:5',
        gloss: 'is',
        steps: ['ἐστίν is a form of εἰμί, “I am”: “is”.', 'It does nothing to anyone; it only joins God to what he is.', 'ὁ θεὸς φῶς ἐστίν: “God is light”.'],
      },
    ],
  },
  'mood-imperative': {
    whatItIs: 'The imperative gives a command or a request: “Come!”, “Love one another!”, “Let him hear!”',
    howToSpot:
      'For “you” (one): -ε, -ου, -σον or -θι; for “you” (many): -τε or -σθε; for “let him”: -τω or -σθω; for “let them”: -τωσαν or -σθωσαν. A present command often means “keep doing it”, an aorist one “do it”. With μή it forbids: “do not”. The -τε form looks like the indicative’s: the sentence tells you which.',
    table: {
      caption: 'The command endings',
      columns: ['present', 'aorist'],
      rows: [
        { label: 'you (one)', cells: ['-ε or -ου', '-σον or -θι or -ον or -σαι'] },
        { label: 'let him', cells: ['-τω or -σθω', '-σατω or -θητω'] },
        { label: 'you (many)', cells: ['-τε or -σθε', '-σατε or -σασθε or -ετε'] },
        { label: 'let them', cells: ['-τωσαν or -σθωσαν', '-σατωσαν'] },
      ],
    },
    worked: [
      {
        word: 'ἀγαπᾶτε',
        ref: '1 John 2:15',
        gloss: 'love',
        steps: ['ἀγαπᾶτε ends in -τε: “you” (many).', 'With μή before it, it is a command, not a statement: “do not love”.', 'Μὴ ἀγαπᾶτε τὸν κόσμον: “Do not love the world”.'],
      },
    ],
  },
  'mood-subjunctive': {
    whatItIs: 'The subjunctive speaks of what may or should happen, not of plain fact: “so that you may have”, “if we confess”, “let us love”.',
    howToSpot:
      'Its mark is a long vowel in the ending, ω for ο and η for ε: -ω, -ῃς, -ῃ, -ωμεν, -ητε, -ωσι(ν), and -ωμαι, -ηται, -ωμεθα, -ησθε, -ωνται. Compare ἔχομεν “we have” with ἔχωμεν “let us have”. Look for it after ἵνα “so that” and ἐάν “if”.',
    table: byPerson(
      'The subjunctive endings',
      ['plain', 'in -μαι'],
      [
        ['-ω', '-ῃς', '-ῃ', '-ωμεν', '-ητε', '-ωσι(ν)'],
        ['-ωμαι', '-ῃ', '-ηται', '-ωμεθα', '-ησθε', '-ωνται'],
      ],
    ),
    worked: [
      {
        word: 'ἔχητε',
        ref: '1 John 1:3',
        gloss: 'you may have',
        steps: ['ἔχητε ends in -ητε: η, not the ε of ἔχετε, “you have”.', 'It follows ἵνα, “so that”: not a fact but a purpose.', 'ἵνα καὶ ὑμεῖς κοινωνίαν ἔχητε μεθ᾿ ἡμῶν: “so that you too may have fellowship with us”.'],
      },
    ],
  },
  'mood-optative': {
    whatItIs: 'The optative speaks of a wish, or of something that might just possibly be: “May it never be!”, “if he should …”. It is rare in the New Testament.',
    howToSpot: 'Look for οι or αι before the ending: γένοιτο “may it be”, πληθυνθείη “may it be multiplied”, εἴη “may it be”. Paul’s μὴ γένοιτο, “may it never be!”, is the one you will meet most.',
    worked: [
      {
        word: 'γένοιτο',
        ref: 'Romans 6:2',
        gloss: 'may it be',
        steps: ['γένοιτο has οι before its ending -το: the optative.', 'It is from γίνομαι, “become, be”: “may it be”.', 'μὴ γένοιτο: “May it never be!”'],
      },
    ],
  },
  'mood-infinitive': {
    whatItIs: 'The infinitive names an action without anyone doing it: “to see”, “to love”. Example: “he came to save”, “we ought to walk”.',
    howToSpot:
      'Its endings never show the person or the number: -ειν (λέγειν “to say”), -σαι (πιστεῦσαι “to believe”), -ναι (εἶναι “to be”), -σθαι (ἔρχεσθαι “to come”), -θηναι (γεννηθῆναι “to be born”). With the article before it, it works as a noun: τὸ θέλειν, “the wanting”.',
    table: {
      caption: 'The infinitive endings',
      columns: ['ending', 'for example'],
      rows: [
        { label: 'to say', cells: ['-ειν', 'λέγειν'] },
        { label: 'to believe', cells: ['-σαι', 'πιστεῦσαι'] },
        { label: 'to be', cells: ['-ναι', 'εἶναι'] },
        { label: 'to come', cells: ['-σθαι', 'ἔρχεσθαι'] },
        { label: 'to be born', cells: ['-θηναι', 'γεννηθῆναι'] },
        { label: 'to love', cells: ['-αν', 'ἀγαπᾶν'] },
      ],
    },
    // τὸ γὰρ θέλειν παράκειταί μοι, “for to will is present with me”: θέλειν, with τὸ, stands where a noun would, as the subject; γὰρ, which joins this
    // sentence to the one before, is left out
    diagram: {
      reference: 'Romans 7:18',
      verse: { book: 'rom', chapter: 7, verse: 18 },
      mode: 'greek',
      words: greek([14, 'τὸ'], [16, 'θέλειν'], [17, 'παράκειταί'], [18, 'μοι']),
      diagram: { clauses: [{ clause: { subject: slot([1], [hang(0)]), verb: slot([2], [hang(3)]) } }] },
      lit: [1],
    },
    worked: [
      {
        word: 'περιπατεῖν',
        ref: '1 John 2:6',
        gloss: 'to walk',
        steps: ['περιπατεῖν ends in -ειν: an infinitive.', 'No ending says who: it names the action, “to walk”.', 'ὀφείλει … οὕτως περιπατεῖν: “he ought to walk so”.'],
      },
    ],
  },
  'mood-participle': {
    whatItIs: 'A participle is a verb used as an adjective: it describes someone by what they do. Example: “the one who believes”, “while he was walking”, “a written letter”.',
    howToSpot:
      'Look for ντ in its forms (-ων, -ουσα, -ον, -οντος, -σας, -σαντος) or -μενος (-μενη, -μενον), or -ως, -υια. It takes case, number and gender like an adjective, and often has the article: ὁ πιστεύων, “the one who believes”. Translate it with “who”, “while” or “because”.',
    table: {
      caption: 'The participle endings',
      columns: ['masculine', 'feminine', 'neuter'],
      rows: [
        { label: 'with ντ', cells: ['-ων, -οντος, -οντι, -οντα, -οντες, -οντων, -ουσι(ν), -οντας, -σας, -σαντος, -σαντες', '-ουσα, -ουσης, -ουσῃ, -ουσαν, -ουσαι, -σασα', '-ον, -οντος, -οντα, -σαν'] },
        { label: 'with -μενος', cells: ['-μενος, -μενου, -μενῳ, -μενον, -μενοι, -μενων, -μενοις, -μενους', '-μενη, -μενης, -μενῃ, -μενην, -μεναι', '-μενον, -μενα'] },
        { label: 'with -ως', cells: ['-ως, -οτος, -οτες, -οτας', '-υια', '-ος'] },
        { label: 'with θ', cells: ['-θεις, -θεντος, -θεντες', '-θεισα', '-θεν'] },
      ],
    },
    // Ὁ πιστεύων εἰς τὸν υἱὸν ἔχει ζωὴν αἰώνιον, “the one who believes in the Son has eternal life”: πιστεύων, with Ὁ, is the subject, and εἰς τὸν
    // υἱὸν hangs under it, since it says whom he believes in
    diagram: {
      reference: 'John 3:36',
      verse: { book: 'jhn', chapter: 3, verse: 36 },
      mode: 'greek',
      words: greek([0, 'Ὁ'], [1, 'πιστεύων'], [2, 'εἰς'], [3, 'τὸν'], [4, 'υἱὸν'], [5, 'ἔχει'], [6, 'ζωὴν'], [7, 'αἰώνιον']),
      diagram: {
        clauses: [{ clause: { subject: slot([1], [hang(0), prep(2, slot([4], [hang(3)]))]), verb: slot([5]), complement: { kind: 'direct-object', slot: slot([6], [hang(7)]) } } }],
      },
      lit: [1],
    },
    worked: [
      {
        word: 'λέγων',
        ref: '1 John 2:4',
        gloss: 'who says',
        steps: ['λέγων: the stem λεγ- of λέγω, “say”, and -ων, a participle ending.', 'With the article ὁ it stands for a person: “the one who says”.', 'Ὁ λέγων, Ἔγνωκα αὐτόν: “The one who says, ‘I know him’”.'],
      },
    ],
  },
  'mood-participle-imperative': {
    whatItIs: 'Sometimes a participle stands in for a command, in a list of things to do. Example: instead of “Hate evil!”, the list says “hating evil”, and means it as a command.',
    howToSpot: 'A participle with no main verb to lean on, in a run of instructions (Romans 12 has many): read it as a command.',
    worked: [
      {
        word: 'Ἀποστυγοῦντες',
        ref: 'Romans 12:9',
        gloss: 'abhor',
        steps: ['Ἀποστυγοῦντες ends in -οντες: a participle, “hating”.', 'It stands in a list of instructions with no main verb.', 'So read it as a command: “Abhor what is evil”.'],
      },
    ],
  },

  eimi: {
    whatItIs: 'The verb “to be” says that someone or something is or was: “I am”, “he was”, “they are”. It is the most used verb of all, and in every language it is the odd one out.',
    howToSpot:
      'εἰμί does not follow the pattern of other verbs, so learn its forms as they are: εἰμί “I am”, εἶ “you are”, ἐστίν “he is”, ἐσμέν “we are”, ἐστέ “you are”, εἰσίν “they are”; and ἦν “he was”, ἦσαν “they were”. A dictionary lists it as εἰμί, “I am”. Most of its forms have no accent of their own beyond the one they have in the table.',
    table: {
      caption: 'The forms of εἰμί, now and then',
      columns: ['now: “am”', 'then: “was”'],
      rows: [
        { label: 'I', cells: ['εἰμί', 'ἤμην'] },
        { label: 'you (one)', cells: ['εἶ', 'ἦσθα'] },
        { label: 'he, she, it', cells: ['ἐστί(ν)', 'ἦν'] },
        { label: 'we', cells: ['ἐσμέν', 'ἦμεν'] },
        { label: 'you (many)', cells: ['ἐστέ', 'ἦτε'] },
        { label: 'they', cells: ['εἰσί(ν)', 'ἦσαν'] },
      ],
    },
    worked: [
      {
        word: 'ἐστίν',
        ref: '1 John 1:5',
        gloss: 'is',
        steps: ['ἐστίν is a form of εἰμί, “I am”, so it is not built like other verbs.', 'In the table it is the “he, she, it” form of the first column, now: “is”.', 'ὁ θεὸς φῶς ἐστίν: “God is light”.'],
      },
      {
        word: 'ἦν',
        ref: '1 John 1:1',
        gloss: 'was',
        steps: ['ἦν belongs to εἰμί, “I am”.', 'In the table it is the “he, she, it” form of the second column, then: “was”.', 'ὃ ἦν ἀπ᾿ ἀρχῆς: “what was from the beginning”.'],
      },
    ],
  },
  'contract-verbs': {
    whatItIs: 'A contract verb is a verb whose stem ends in a vowel (α, ε or ο) and whose stem vowel runs together with the vowel of the ending. English does something like it: “do not” becomes “don’t”.',
    howToSpot:
      'The entry ends in -άω, -έω or -όω: ἀγαπάω “I love”, ποιέω “I do”, πληρόω “I fill”. In the present the two vowels merge: α with the ending’s vowel gives α or ᾳ (ἀγαπᾷ), ε gives ει or ε (ποιεῖ, ποιεῖτε), ο gives ου or οι (πληροῦσιν). So you will not see the stem’s vowel and the ending’s vowel side by side. To find the entry, turn the merged vowel back.',
    worked: [
      {
        word: 'ποιοῦμεν',
        ref: '1 John 1:6',
        gloss: 'we do',
        steps: ['Its entry is ποιέω: the stem ποιε- ends in a vowel.', 'ε and the ο of the ending -ομεν run together and make ου: ποιέ-ομεν becomes ποιοῦμεν.', 'So “we do”: οὐ ποιοῦμεν τὴν ἀλήθειαν, “we do not do the truth”.'],
      },
    ],
  },
  augment: {
    whatItIs: 'The augment is a small marker in front of a Greek verb that says the action is past, as English puts “-ed” at the end of “walked”. It is a short ἐ- before the stem.',
    howToSpot:
      'Look at the start of the verb. A stem that begins with a consonant gets ἐ- in front: λύω gives ἔλυσα “I loosed”. A stem that begins with a vowel lengthens it: α becomes η (ἀγαπάω, ἠγάπησα), ε becomes η, ο becomes ω. Three kinds of past verb have it: the imperfect (ἔλεγον “I was saying”), the aorist (ἔλυσα “I loosed”) and a rare form that says “I had” done it (ἐλελύκειν “I had loosed”). Only the indicative, the form that simply tells what happened, has it: a verb that gives a command or a wish, or is an aorist outside the indicative, has none.',
    worked: [
      {
        word: 'ἐθεασάμεθα',
        ref: '1 John 1:1',
        gloss: 'we beheld',
        steps: ['ἐ- in front of the stem θεα-: the augment, so the action is past.', 'θεα- is the stem of θεάομαι, “look at”; then σα, then -μεθα, which means “we”.', 'So “we beheld”: ὃ ἐθεασάμεθα, “what we beheld”.'],
      },
      {
        word: 'ἠγάπησεν',
        ref: 'John 3:16',
        gloss: 'loved',
        steps: ['The stem of ἀγαπάω begins with α, so the augment lengthens it to η.', 'ἠγάπ- is the stem, then σε, which marks the aorist, and -ν.', 'So “he loved”: οὕτως γὰρ ἠγάπησεν ὁ θεὸς τὸν κόσμον.'],
      },
    ],
  },
  'tense-signs': {
    whatItIs: 'A tense sign is a letter or two between the stem and the ending that marks the tense. English has a sign too: the -ed of “walked” marks the past.',
    howToSpot:
      'Look between the stem and the ending. σ marks the future and the first aorist: λύσω “I shall loose”, ἔλυσα “I loosed”. θη marks the aorist passive: ἐλύθην “I was loosed”. κ marks the first perfect: λέλυκα “I have loosed”. Some verbs change the stem instead and have no sign.',
    table: {
      caption: 'The tense signs with the endings that follow them',
      columns: ['I', 'you (one)', 'he, she, it', 'we', 'you (many)', 'they'],
      rows: [
        { label: 'σ: the future', cells: ['-σω', '-σεις', '-σει', '-σομεν', '-σετε', '-σουσι(ν)'] },
        { label: 'σα: the first aorist', cells: ['-σα', '-σας', '-σε(ν)', '-σαμεν', '-σατε', '-σαν'] },
        { label: 'σα: the first aorist of a verb like θεάομαι', cells: ['-σαμην', '-σω', '-σατο', '-σαμεθα', '-σασθε', '-σαντο'] },
        { label: 'θη: the aorist passive', cells: ['-θην', '-θης', '-θη', '-θημεν', '-θητε', '-θησαν'] },
        { label: 'κα: the first perfect', cells: ['-κα', '-κας', '-κε(ν)', '-καμεν', '-κατε', '-κασι(ν)'] },
      ],
    },
    worked: [
      {
        word: 'ἐθεασάμεθα',
        ref: '1 John 1:1',
        gloss: 'we beheld',
        steps: ['θεα- is the stem and -μεθα is the ending.', 'Between them stands σα: the sign of the first aorist.', 'So σα says it is aorist: “we beheld”.'],
      },
      {
        word: 'ἐφανερώθη',
        ref: '1 John 1:2',
        gloss: 'was shown',
        steps: ['ἐ- in front is the augment; φανερω- is the stem.', 'θη after the stem is the sign of the aorist passive.', 'So “was shown”: ἡ ζωὴ ἐφανερώθη, “the life was shown”.'],
      },
    ],
  },
  reduplication: {
    whatItIs: 'Reduplication is a repeat at the start of a word. The Greek perfect marks itself by repeating the first consonant of the stem, with an ε between, as if one said “go-go”.',
    howToSpot:
      'Look at the start of a verb in the perfect: the first consonant, then ε, then the stem again. λύω gives λέ-λυκα “I have loosed”, γράφω gives γέ-γραπται “it is written”. A stem that begins with a vowel lengthens it instead: ὁράω gives ἑώρακα “I have seen”. So the perfect begins with a doubled sound or a lengthened vowel.',
    worked: [
      {
        word: 'γέγραπται',
        ref: 'Romans 1:17',
        gloss: 'it is written',
        steps: ['The stem is γραφ-, from γράφω, “I write”.', 'γέ- in front repeats the first consonant γ and adds ε: the reduplication.', 'So γέγραπται is the perfect: “it is written”, and it stands written.'],
      },
      {
        word: 'ἑωράκαμεν',
        ref: '1 John 1:1',
        gloss: 'we have seen',
        steps: ['The stem of ὁράω begins with a vowel, so it is lengthened to ἑω- instead of repeating a consonant.', 'Then -κα marks the perfect, and -μεν means “we”.', 'So “we have seen”.'],
      },
    ],
  },
  oida: {
    whatItIs: 'οἶδα is a Greek verb that looks like a perfect and means “I know”. English has the same oddity: “I have got” can mean “I own”.',
    howToSpot:
      'Its forms have the endings of a perfect and are used as a present: οἶδα “I know”, οἶδας “you know”, οἶδε(ν) “he knows”, οἴδαμεν “we know”, οἴδατε “you know”, οἴδασι(ν) “they know”. Its past is ᾔδειν “I knew”. Some dictionaries list it under εἴδω. It does not repeat its first consonant as the perfect does.',
    table: {
      caption: 'The forms of οἶδα, now and then',
      columns: ['now: “know”', 'then: “knew”'],
      rows: [
        { label: 'I', cells: ['οἶδα', 'ᾔδειν'] },
        { label: 'you (one)', cells: ['οἶδας', 'ᾔδεις'] },
        { label: 'he, she, it', cells: ['οἶδε(ν)', 'ᾔδει'] },
        { label: 'we', cells: ['οἴδαμεν', 'ᾔδειμεν'] },
        { label: 'you (many)', cells: ['οἴδατε', 'ᾔδειτε'] },
        { label: 'they', cells: ['οἴδασι(ν)', 'ᾔδεισαν'] },
      ],
    },
    worked: [
      {
        word: 'οἴδαμεν',
        ref: '1 John 3:2',
        gloss: 'we know',
        steps: ['οἴδαμεν has the ending -αμεν of a perfect and the meaning of a present.', 'The ending -μεν means “we”.', 'So “we know”: οἴδαμεν ὅτι ἐὰν φανερωθῇ, “we know that if he is shown”.'],
      },
    ],
  },
  'mi-verbs': {
    whatItIs: 'The -μι verbs are a small family of very common verbs whose dictionary entry ends in -μι, not -ω. They add their endings straight to the stem, with no joining vowel between.',
    howToSpot:
      'The entry ends in -μι: δίδωμι “I give”, τίθημι “I put”, ἵστημι “I set up”, ἀφίημι “I let go”. A verb like λύω joins its stem and ending with a vowel (λύ-ο-μεν); a -μι verb does not (δίδο-μεν). In the present the stem often has a long vowel with the endings -μι, -ς, -σι(ν). Many have a second aorist, such as ἔστην “I stood”.',
    worked: [
      {
        word: 'δίδωσιν',
        ref: 'John 3:34',
        gloss: 'he gives',
        steps: ['Its entry is δίδωμι, “I give”: a -μι verb.', 'The stem δίδω- takes -σιν straight on, with no joining vowel.', 'So “he gives”: οὐ γὰρ ἐκ μέτρου δίδωσιν τὸ πνεῦμα, “for he does not give the Spirit by measure”.'],
      },
    ],
  },
  'principal-parts': {
    whatItIs: 'The principal parts of a verb are the few forms every other form is built from. English has them: “go, went, gone”. Learn these and you can make the rest.',
    howToSpot:
      'A Greek verb has six: the present, the future, the aorist and the perfect, all active, and the perfect and the aorist passive. A dictionary lists the first and, for a verb that bends the pattern, the others too. λύω, λύσω, ἔλυσα, λέλυκα, λέλυμαι, ἐλύθην are the six of λύω. A verb like ἀκούω bends the pattern, with ἤκουσα and ἀκήκοα: learn it by its parts.',
    table: {
      caption: 'The six principal parts of λύω “I loose”',
      columns: ['the part', 'it means'],
      rows: [
        { label: 'the present active', cells: ['λύω', 'I loose'] },
        { label: 'the future active', cells: ['λύσω', 'I shall loose'] },
        { label: 'the aorist active', cells: ['ἔλυσα', 'I loosed'] },
        { label: 'the perfect active', cells: ['λέλυκα', 'I have loosed'] },
        { label: 'the perfect passive', cells: ['λέλυμαι', 'I have been loosed'] },
        { label: 'the aorist passive', cells: ['ἐλύθην', 'I was loosed'] },
      ],
    },
    worked: [
      {
        word: 'ἔλυσα',
        gloss: 'I loosed',
        steps: ['ἔλυσα is the third part of λύω: ἐ- is the augment and σα the sign.', 'The other aorist forms come from it: ἐλύσαμεν, “we loosed”.', 'The future comes from the second part, λύσω, and the perfect from the fourth, λέλυκα: each part opens a family of forms.'],
      },
    ],
  },
};
