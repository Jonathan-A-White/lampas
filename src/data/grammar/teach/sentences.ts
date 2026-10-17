// src/data/grammar/teach/sentences.ts — the cards of the sentences tier (mw-br588b.2): the uses the finder (uses.ts) knows, each taught from one real verse. A card
// teaches the idea and what to look for; the verse he reads shows it marked on the idea sheet. Terms are held to the ideas it rests on (tests/unit/teach-cards.test.ts).
import type { Teach } from './types';

export const SENTENCES: Record<string, Teach> = {
  agreement: {
    whatItIs: 'Words agree when they match their noun in case, number and gender. An adjective or the article that goes with a noun takes the same ending pattern, so you see which words belong together. Example: “the good shepherd”, where in Greek “the” and “good” both fit “shepherd”.',
    howToSpot: 'Find a noun, then look at the words beside it: an article or an adjective with the same case, number and gender is its partner. They usually stand side by side, but a small word may come between.',
    worked: [
      {
        word: 'ζωὴ',
        ref: '1 John 1:2',
        gloss: 'life',
        steps: ['ζωὴ: a noun, nominative, singular, feminine.', 'The article ἡ in front of it is also nominative, singular and feminine, so the two agree.', 'ἡ ζωὴ: “the life”.'],
      },
    ],
  },
  'article-substantival': {
    whatItIs: 'The article can stand alone, with no noun after it, and then it means “the one”, “those” or “the thing”. What follows says who or what it is. Example: “the one who comes” or “those in the house”.',
    howToSpot: 'Look for an article followed by a participle, an adjective or a phrase, and no noun that agrees with it: τοῖς ἐν Χριστῷ Ἰησοῦ is “those in Christ Jesus”. Add “the one” or “those” in English.',
    worked: [
      {
        word: 'τοῖς',
        ref: 'Romans 8:1',
        gloss: 'those',
        steps: ['τοῖς is the article: dative, plural.', 'No noun follows it. A phrase follows: ἐν Χριστῷ Ἰησοῦ, “in Christ Jesus”.', 'So the article stands for people: “those in Christ Jesus”.'],
      },
    ],
  },
  'article-position': {
    whatItIs: 'Where an adjective stands beside the article and its noun changes what the words say. Next to the article it tells which one; away from it, it states something about the noun. Example: “the good man” (which man) against “the man is good” (a statement).',
    howToSpot: 'Article, adjective, noun, or article, noun, article, adjective: it tells which one (“the eternal life”). Adjective before the article, or after the noun with no second article: it states something (“faithful is the word”).',
    worked: [
      {
        word: 'αἰώνιον',
        ref: '1 John 1:2',
        gloss: 'eternal',
        steps: ['αἰώνιον is an adjective, and it agrees with ζωὴν.', 'It comes after the noun with a second article: τὴν ζωὴν τὴν αἰώνιον.', 'So it tells which life: “the eternal life”.'],
      },
    ],
  },
  postpositive: {
    whatItIs: 'A few small words always come second in their clause, even though the English comes first: “and”, “but”, “for”, “so”. Example: Greek says “the fellowship and ours”, and you read it “and our fellowship”.',
    howToSpot: 'δέ, γάρ, οὖν and μέν never open a clause. They follow the first word, or the first phrase, of the clause. When one comes second, start the clause with it in English.',
    worked: [
      {
        word: 'δὲ',
        ref: '1 John 1:3',
        gloss: 'and',
        steps: ['δὲ stands second in its clause, after ἡ κοινωνία.', 'It never opens a clause, so read it first.', 'ἡ κοινωνία δὲ ἡ ἡμετέρα: “and our fellowship”.'],
      },
    ],
  },
  'clause-hoti': {
    whatItIs: 'A clause with “that” says what someone says, knows or sees: “we announce that God is light”. “Because” gives a reason: “I am glad because you came”. The clause has its own verb.',
    howToSpot: 'Look for ὅτι. After a verb of saying, knowing or seeing it means “that”; when it gives a reason it means “because”. The verb of the clause comes after it, and the clause ends where the next clause opens.',
    worked: [
      {
        word: 'ὅτι',
        ref: '1 John 1:5',
        gloss: 'that',
        steps: ['ὅτι follows ἀναγγέλλομεν “we announce”, a verb of saying, so it means “that”.', 'The clause after it has its own verb: ἐστιν.', 'ὅτι ὁ θεὸς φῶς ἐστιν: “that God is light”.'],
      },
    ],
  },
  'clause-hina': {
    whatItIs: 'A clause of purpose says why something is done: “so that” or “in order that”. Example: “I write to you so that you may know”. The verb of the clause often says “may”.',
    howToSpot: 'Look for ἵνα. Its verb is in the subjunctive, which is where the English “may” comes from. Read ἵνα as “so that” and add “may”.',
    worked: [
      {
        word: 'ἔχητε',
        ref: '1 John 1:3',
        gloss: 'may have',
        steps: ['ἔχητε is the subjunctive, second person plural.', 'ἵνα stands earlier in the clause and begins it: “so that”.', 'ἵνα καὶ ὑμεῖς κοινωνίαν ἔχητε: “so that you also may have fellowship”.'],
      },
    ],
  },
  'participle-adverbial': {
    whatItIs: 'A participle can tell when, how or why the main verb happens. Example: “Having entered, he passed through” is “when he entered, he passed through”. It adds a detail to the main verb and is not the main verb.',
    howToSpot: 'Look for a participle in the nominative with no article, beside a verb of its own. It names an action just before or with the main verb. Try “when”, “because”, “and” or “while” in English.',
    worked: [
      {
        word: 'εἰσελθὼν',
        ref: 'Luke 19:1',
        gloss: 'entering',
        steps: ['εἰσελθὼν is a participle in the nominative, with no article.', 'The main verb is διήρχετο: “he was passing through”.', 'The participle says what came first: “having entered, he was passing through Jericho”.'],
      },
    ],
  },
  'genitive-absolute': {
    whatItIs: 'A noun and a participle in the genitive, tied to nothing else in the sentence, set the scene: “when they had gone out”, “while he was speaking”. Example: “His work finished, the man went home.”',
    howToSpot: 'Look for a participle and a noun or αὐτός “he, they”, both genitive, that agree with each other and that are not the subject or object of the main verb. Read them first, as “when”, “after” or “since”.',
    worked: [
      {
        word: 'ἐξελθόντων',
        ref: 'Mark 11:12',
        gloss: 'going out',
        steps: ['ἐξελθόντων is a participle in the genitive plural.', 'αὐτῶν is also genitive plural, and it names who went out.', 'ἐξελθόντων αὐτῶν ἀπὸ Βηθανίας: “when they had gone out from Bethany”.'],
      },
    ],
  },
  periphrastic: {
    whatItIs: 'A form of “to be” can stand beside a participle, and the two together act as one verb. Example: “was teaching” says what “taught” says. The participle carries the meaning, and “to be” carries the time.',
    howToSpot: 'Look for a form of εἰμί (ᾖ, ἦν, ἐστίν, ἔσται) beside a participle in the nominative, close to it. Read the two as one verb, with the time of εἰμί.',
    worked: [
      {
        word: 'πεπληρωμένη',
        ref: '1 John 1:4',
        gloss: 'fulfilled',
        steps: ['πεπληρωμένη is a participle in the nominative, singular, feminine.', 'ᾖ stands beside it: “may be”.', 'ᾖ πεπληρωμένη: “may be fulfilled”, said of ἡ χαρὰ “the joy”.'],
      },
    ],
  },
  'infinitive-articular': {
    whatItIs: 'An infinitive with the article is a noun made from a verb. Example: “living”, “dying”, “the doing of it”. After a preposition it often says the purpose or result: “so as to eat”.',
    howToSpot: 'Look for τό, τοῦ or τῷ followed by an infinitive, alone or after a preposition such as εἰς or διά. Translate it with “-ing”, or with “so as to” after a preposition.',
    worked: [
      {
        word: 'ζῇν',
        ref: 'Philippians 1:21',
        gloss: 'living',
        steps: ['ζῇν is an infinitive.', 'The article τὸ stands in front of it, so it works as a noun.', 'τὸ ζῇν: “the living”, or “to live”.'],
      },
    ],
  },
  'infinitive-complement': {
    whatItIs: 'Some verbs say little until an infinitive finishes them: “I am able to”, “I wish to”, “I am about to”, “it is necessary to”. Example: “I wish to go.”',
    howToSpot: 'Look for δύναμαι, θέλω, μέλλω, δεῖ or ἄρχομαι with an infinitive close by and no article before the infinitive. The infinitive finishes the verb.',
    worked: [
      {
        word: 'ἀγνοεῖν',
        ref: '1 Corinthians 12:1',
        gloss: 'to be ignorant',
        steps: ['ἀγνοεῖν is an infinitive.', 'θέλω “I wish” needs something to finish it, and the infinitive does.', 'οὐ θέλω ὑμᾶς ἀγνοεῖν: “I do not wish you to be ignorant”.'],
      },
    ],
  },
  'subjunctive-hortatory': {
    whatItIs: 'The subjunctive can urge a group to act: “let us”. Example: “Let us go.” The speaker is part of the group.',
    howToSpot: 'Look for a subjunctive in the first person plural that stands on its own, with no ἵνα, ἐάν or other clause word before it. Say “let us” before it.',
    worked: [
      {
        word: 'Ἄγωμεν',
        ref: 'John 11:7',
        gloss: 'let us go',
        steps: ['Ἄγωμεν is a subjunctive, first person plural.', 'No ἵνα or ἐάν comes before it, so it stands on its own.', 'Ἄγωμεν εἰς τὴν Ἰουδαίαν: “let us go into Judea”.'],
      },
    ],
  },
  prohibition: {
    whatItIs: 'To forbid, Greek puts μή before a verb. Two forms say “do not”: the present imperative and the aorist subjunctive. Example: “Do not be afraid.”',
    howToSpot: 'Look for μή at the start, followed by a present imperative or an aorist subjunctive in the second person. Translate it “do not”.',
    worked: [
      {
        word: 'θαυμάζετε',
        ref: '1 John 3:13',
        gloss: 'be amazed',
        steps: ['θαυμάζετε is a present imperative, second person plural.', 'μή stands in front of it.', 'Μὴ θαυμάζετε: “do not be amazed”.'],
      },
    ],
  },
  'ou-me': {
    whatItIs: 'The strongest way to say that something will not happen is οὐ μή with a subjunctive or a future. It means “never” or “by no means”. Example: “It will never happen.”',
    howToSpot: 'Look for οὐ and μή side by side with a subjunctive or a future after them. It is a statement, not a command, so do not read the μή as “do not”.',
    worked: [
      {
        word: 'μὴ',
        ref: 'Matthew 24:35',
        gloss: 'not',
        steps: ['οὐ μὴ stand together before the verb παρέλθωσιν, a subjunctive.', 'Together they say a strong no: “by no means”.', 'οὐ μὴ παρέλθωσιν: “will never pass away”.'],
      },
    ],
  },
  condition: {
    whatItIs: 'An “if” clause sets a condition, and the sentence says what follows. Greek has three kinds: one takes the “if” as true, one leaves it open, and one says it was not so. Example: “If you are hungry, eat.”',
    howToSpot: 'εἰ with the indicative takes it as true (“since”, “if indeed”). ἐάν with the subjunctive leaves it open (“if ever”). εἰ with a past indicative, and ἄν in the other clause, says it was not so (“if it had been”).',
    worked: [
      {
        word: 'Ἐὰν',
        ref: '1 John 1:9',
        gloss: 'if',
        steps: ['Ἐὰν “if” is followed by ὁμολογῶμεν, a subjunctive.', 'ἐάν with the subjunctive leaves the condition open.', 'Ἐὰν ὁμολογῶμεν τὰς ἁμαρτίας ἡμῶν: “if we confess our sins”.'],
      },
    ],
  },
};
