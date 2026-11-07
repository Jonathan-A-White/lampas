// src/help.ts — what Help says (mw-5r3p30.823, his A on mw-5r3p30.821): the app's own notes as a short list of pieces, one line each, each a page of a few lines. The notes used to stand on the
// Preface (src/preface.ts), which keeps only the texts we chose. Plain words, no promise beyond what the app does; a page is under HELP_MAX_WORDS words so it fits a phone screen, and a
// paragraph is under 400 characters because the tutor is told each one as a screen fact (src/tutor/screen.ts FACT_VALUE_MAX).

import { LISTED_HINTS } from './tips/hints';
import { DOOR_BACK_LINE } from './tutor/doorHidden';

export interface HelpPage {
  /** the address: #/help?page=<id> */
  id: string;
  /** the name on the list and over the page */
  title: string;
  /** the one line under the name on the list */
  line: string;
  /** the page: a few short paragraphs */
  body: string[];
  /** a button at the page's foot: its name and the screen it opens */
  opens?: { label: string; route: 'lessons' };
}

/** The most pieces the list holds, and the most words a page holds. */
export const HELP_MAX_PAGES = 12;
export const HELP_MAX_WORDS = 120;

export const HELP_PAGES: HelpPage[] = [
  {
    id: 'reader',
    title: 'The Reader',
    line: 'Chapters, words and verses.',
    body: [
      'The title opens the chapter picker. A tap on a verse number opens the Verse view (Listen, Read it aloud, Practise, Share, Memorize); a hold copies it. A word opens its sheet.',
      'An Old Testament chapter reads in Hebrew (How much Hebrew?), or with Old Testament in Greek (Septuagint) on, in Swete’s Greek with Brenton’s English. Its title gives both numberings (Psalms 23, Greek 22); a book not ready stays Hebrew.',
      'Variants in Settings can show where manuscripts differ. A variant’s sheet has Go deeper and Read this. The tutor explains it without ruling.',
      'English from the 2026 Greek shows Lampas’s own English, marked RP 2026, where that Greek changes it.',
    ],
    opens: { label: 'Lessons on variant readings', route: 'lessons' },
  },
  {
    id: 'languages',
    title: 'Greek and Hebrew',
    line: 'How much of each you see.',
    body: [
      'Lampas opens as a plain English Bible; in Settings, Which languages? chooses English only, Greek, Hebrew or both.',
      'Each language has a dial, How much Greek? or How much Hebrew?; English only hides both.',
      'Old Testament in Greek (Septuagint), under How much Greek? from Curious up, starts off. The switch is English | Weave | Greek; Weave aligns Swete’s Greek and Brenton’s English by chunk, with a note where they are not aligned.',
      'With it on, Memorize, Diagram, the Quick test, the Parsing drill and Review read a Septuagint chapter as Greek, and the frontier counts its words. The sentence Diagram works in English, Greek and Hebrew.',
    ],
  },
  {
    id: 'goal',
    title: 'Goal',
    line: 'Where you are and what to learn next.',
    body: [
      'Goal shows where you are on the grammar of the language you are learning. Choose a goal, and Learn next opens the lesson that brings you nearer to it.',
      'Optional on the Goal screen: a course in the standard symbols for the sounds of Greek (the IPA), and short lessons on the Hard sounds an English ear finds hard. Nothing else in Lampas needs them. A Try it step or Say it records you on the phone only and keeps no recording.',
    ],
  },
  {
    id: 'ladders',
    title: 'The ladders',
    line: 'Lessons and Drill it.',
    body: [
      'Grammar is a ladder of ideas, each with a lesson card. Drill it proves an idea only on questions you have not been asked before; when too few are left it says More questions are on their way, and proves nothing meanwhile.',
      'An idea you missed and then answer right is marked to confirm, and counts as known only when a new question on it is right; a miss returns it to missed.',
      'A lesson shows how a word is built, where a source says so. On a lesson’s sheet, the floating ? opens a talk about that lesson. When a drill ends, the tutor is told every question and answer.',
    ],
  },
  {
    id: 'words',
    title: 'Words',
    line: 'New words, Quick test, Parsing drill.',
    body: [
      'In Tools, Words lists the words you are learning. New words each day (from Learning on the dial) offers the commonest words of the chapter you do not have; Got it adds one.',
      'Where both languages are chosen, Words and Review show a Greek | Hebrew switch; the Quick test asks both, the Parsing drill the language you are in.',
      'A Septuagint word’s card says how Lampas read it, by one of five layers: the New Testament’s forms, the paradigm parser, agreement with neighbours, a model’s reading, or a guess. Sure, likely or unsure says how far to trust it. A dotted guess is never learned. See Greek and Hebrew.',
    ],
  },
  {
    id: 'review',
    title: 'Review',
    line: 'What is due, and Today.',
    body: [
      'In Tools, Review asks the words and ideas that are due; with both languages chosen it asks the side the switch is on. A word you pick right asks how well you knew it: Know it well moves it up a step at once, Kind of counts as a right, Don’t know brings it back tomorrow. Going on without a tap counts as Kind of.',
      'Today lists what is due: Review, Memorize and the rest. The tutor is told what is on it, and can offer Open today’s drill.',
    ],
  },
  {
    id: 'paradigms',
    title: 'Paradigms',
    line: 'Tables of endings.',
    body: [
      'In Tools, Paradigms are tables of endings, opened as you learn the grammar. A table opened from a word’s sheet, or from See the table on a Review ending card, can show that word’s own forms: This word | The pattern. Every form the New Testament uses is laid in its cells, never a made-up one; a cell the text never uses says not in the NT, and a tap on a form opens the Reader there.',
      'From a Septuagint word, This word also lays the Septuagint’s forms, each cell saying if found in the Septuagint, the NT or both.',
      'With Hebrew chosen, the list also has four Hebrew tables, drawn right to left.',
    ],
  },
  {
    id: 'memorize',
    title: 'Memorize',
    line: 'Learn a verse by heart.',
    body: [
      'A Memorize button on a verse, a passage or a row of a verse list puts it on the schedule, in English or in the language of the verse your dials allow. Memorize, in Tools beside Verse lists, shows Due today with Start, and Your verses with the step each is on. With the Septuagint on (see Greek and Hebrew), an Old Testament verse is learned in Swete’s Greek.',
      'In a session, hold the bar to say the verse, or Type it. A verse list holds references you save; it has Play, Play all and Memorize this list. Today has a Memorize piece too (Settings > Daily > Memorize).',
    ],
  },
  {
    id: 'tutor',
    title: 'The tutor',
    line: 'Ask about a verse, a word or a screen.',
    body: [
      'The floating ? on the side of the hand you hold your phone in (Settings > Hand) is the one way to the tutor. It opens a talk about what is in front of you: hold to talk, type, or send a picture. A change the tutor makes has an Undo.',
      `Two fingers tapped on a screen put the ? away. ${DOOR_BACK_LINE} In the Reader's text it enters immersive reading.`,
      'Every talk is kept on the phone: Settings > Conversations lists them, with a search. Under Talk in Settings you choose whether the bars are held or tapped.',
    ],
  },
  {
    id: 'library',
    title: 'Your Logos library, maps and sermons',
    line: 'Books you own, maps and sermons.',
    body: [
      'If you own Logos, Your Logos library (in Tools) lists the books Lampas can open, each Off, On or Pinned; Import reads your Logos list. Lampas keeps only that list and your choices. On a verse, In Logos opens it in your Bible.',
      'Maps · N on a verse, heading or place line opens that place’s maps from Bible Mapper; Settings > Study resources > Maps turns each source on or off.',
      'Sermons · N beside it lists sermons preached on the verse, then its chapter: Spurgeon’s from CCEL, Matthew Henry’s from the Internet Archive. Each opens where it lives, online.',
    ],
  },
  {
    id: 'licence',
    title: 'The licence',
    line: 'Free to read; what a licence adds.',
    body: [
      'Lampas is free to read: the Greek, the English, the lessons and the quizzes need no licence. A licence unlocks the AI, which is the tutor and everything sent to it. Until a phone has one, Settings shows those options off, with “Needs a licence”.',
      'The Licence page has Get a licence: it is free, asks for an email and a phone (Twilio sends a code to each to prove them; Lampas keeps them only as scrambled fingerprints). A licence covers up to five devices: My devices lists them, each with Rename and Remove, and a new phone joins by Get a licence with the same phone number.',
    ],
  },
  {
    id: 'tips',
    title: 'Tips',
    line: 'The one-line tips, to read again.',
    body: [
      'A tip shows once on its screen until you tap Got it. Settings > Tips turns them off. All of them:',
      LISTED_HINTS.map((h) => `${h.text}.`).join(' '),
    ],
  },
];

export const helpPageById = (id: string | null | undefined): HelpPage | undefined => HELP_PAGES.find((p) => p.id === id);

/** The words of a page, as the limit counts them: its name, its line and its paragraphs. */
export const wordsOf = (page: HelpPage): number => [page.title, page.line, ...page.body].join(' ').split(/\s+/).filter(Boolean).length;
