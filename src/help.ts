// src/help.ts — what Help says (mw-5r3p30.823, his A on mw-5r3p30.821): the app's own notes as a short list of pieces, one line each, each a page of a few lines. The notes used to stand on the
// Preface (src/preface.ts), which keeps only the texts we chose. Plain words, no promise beyond what the app does; a page is under HELP_MAX_WORDS words so it fits a phone screen, and a
// paragraph is under 400 characters because the tutor is told each one as a screen fact (src/tutor/screen.ts FACT_VALUE_MAX).

import { LISTED_HINTS } from './tips/hints';

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
      'The title opens the chapter picker. A tap on a verse number opens the Verse view: Listen, Read it aloud, Ask the tutor, Copy link, Share and Memorize. A tap on a word opens its sheet.',
      'An Old Testament chapter opens in English or, from How much Hebrew? at Curious, in its Hebrew. Copy and Share give the verse, passage or chapter as you read it, with its reference and link (Settings > Reading > When you copy).',
      'Where manuscripts differ, Variants in Settings can show it. Five short lessons explain how to read that, and they read offline.',
      'Each variant’s sheet has Go deeper, and the tutor explains it without ruling.',
    ],
    opens: { label: 'Lessons on variant readings', route: 'lessons' },
  },
  {
    id: 'languages',
    title: 'Greek and Hebrew',
    line: 'How much Greek and Hebrew you see.',
    body: [
      'Lampas opens as a plain English Bible. At the top of Settings, Which languages? chooses English only, Greek, Hebrew or Greek and Hebrew.',
      'Each language chosen has a dial, How much Greek? or How much Hebrew?, from Curious to All in. Each step shows more of that language and nothing more: Curious its view and a word’s Strong’s number, Dipping a toe the Weave, Learning new words each day, Reading in Greek or Hebrew opens the Reader in it. English only hides them all and keeps your levels. The Study resources follow the dials.',
      'The sentence Diagram is Greek and English only.',
    ],
  },
  {
    id: 'goal',
    title: 'Goal',
    line: 'Where you are and what to learn next.',
    body: [
      'Goal shows where you are on the grammar of the language you are learning. Choose a goal, and Learn next opens the lesson that brings you nearer to it.',
      'Optional on the Goal screen: a course in the standard symbols for the sounds of Greek (the IPA), and short lessons on the Hard sounds an English ear finds hard. Nothing else in Lampas needs them.',
    ],
  },
  {
    id: 'ladders',
    title: 'The ladders',
    line: 'Lessons and Drill it.',
    body: [
      'Grammar is a ladder of ideas, each with a lesson card. Drill it proves an idea only on questions you have not been asked before; when too few are left it says More questions are on their way, and proves nothing meanwhile.',
      'An idea you missed and then answer right is marked to confirm, and counts as known only when a new question on it is right; a miss returns it to missed.',
      'On a lesson’s sheet, Ask the tutor opens a talk about that lesson. When a drill ends, the tutor is told every question and answer.',
    ],
  },
  {
    id: 'words',
    title: 'Words',
    line: 'New words, Quick test, Parsing drill.',
    body: [
      'Words lists the words you are learning. New words each day (from Learning on the dial) offers the commonest words of the chapter you do not have yet; its sheet shows the word large with how it sounds, its meaning and an easy verse, and Got it puts it in Words. A Hebrew word is shown right to left.',
      'Where both languages are chosen, Words and Review show a Greek | Hebrew switch. The Quick test asks words of both together; the Parsing drill reads the chapter of the language you are in.',
    ],
  },
  {
    id: 'review',
    title: 'Review',
    line: 'What is due, and Today.',
    body: [
      'Review asks the words and ideas that are due; with both languages chosen it asks the side the switch is on. A word you pick right asks how well you knew it: Know it well moves it up a step at once, Kind of counts as a right, Don’t know brings it back tomorrow. Going on without a tap counts as Kind of.',
      'Today lists what is due: Review, Memorize and the rest. The tutor is told what is on it, and can offer Open today’s drill.',
    ],
  },
  {
    id: 'paradigms',
    title: 'Paradigms',
    line: 'Tables of endings.',
    body: [
      'Paradigms are tables of endings, opened as you learn the grammar. A table opened from a word’s sheet, or from See the table on a Review ending card, can show that word’s own forms: This word | The pattern. Every form the New Testament uses is laid in its cells, never a made-up one; a cell the text never uses says not in the NT, and a tap on a form opens the Reader there.',
      'With Hebrew chosen, the list also has four Hebrew tables, drawn right to left.',
    ],
  },
  {
    id: 'memorize',
    title: 'Memorize',
    line: 'Learn a verse by heart.',
    body: [
      'A Memorize button on a verse, a passage or a row of a verse list puts it on the schedule, in English or in the language of the verse your dials allow. Memorize, in the Library beside Verse lists, shows Due today with Start, and Your verses with the step each is on.',
      'In a session, hold the bar to say the verse, or Type it. A verse list holds references you save; it has Play, Play all and Memorize this list. Today has a Memorize piece too (Settings > Daily > Memorize).',
    ],
  },
  {
    id: 'tutor',
    title: 'The tutor',
    line: 'Ask about a verse, a word or a screen.',
    body: [
      'The round Ask the tutor button opens a talk about the screen you are on; hold to talk, type, or send a picture. The tutor can look things up in the app and do what you ask: a change shows what it did with an Undo, a step that needs your yes waits for your tap, and a screen it takes you to is a step of Back.',
      'Every talk is kept on the phone: Settings > Conversations lists them, newest first, with a search. Under Talk in Settings you choose whether the bars are held or tapped, and when your words are sent.',
    ],
  },
  {
    id: 'library',
    title: 'Your Logos library and maps',
    line: 'Books you own, and maps.',
    body: [
      'If you own Logos, Your Logos library (the first row of Settings) lists the books Lampas can open, by kind, each Off, On or Pinned, with a search; Import reads the list Logos saves. Lampas keeps only that list and your choices, and sends nothing of your library unless you ask. On a verse, In Logos opens it in your own Bible.',
      'A Maps · N button on a verse and at the foot of a chapter opens the maps of that place from Bible Mapper; Settings > Study resources > Maps turns each source on or off.',
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
