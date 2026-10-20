// src/tutor/screen.ts — what the tutor is told about the screen he asks from (mw-5r3p30.91, docs/ask-tutor.md): the screen's name and its useful
// facts (the `screen` field of the bible-talk request), and the questions the sheet suggests for it. Pure: the screens report their facts
// through src/tutor/screenContext.ts, the Ask the tutor control (src/AskTutor.tsx) reads them.
import type { Route } from '../nav/route';

/** One thing the screen shows, as the tutor reads it: 'Learn next' and 'The Greek alphabet'. */
export interface ScreenFact {
  label: string;
  value: string;
}

/** One setting as Settings shows it (mw-5r3p30.107): its name, what it holds now ('Off', 'Solid words', '0.8x') and its hint, the line under its control. */
export interface ScreenSetting {
  name: string;
  value: string;
  help: string;
}

/** One credit as About shows it (mw-vtjxh4.2): the source's name, what it gives this reader, its licence and its link. */
export interface ScreenCredit {
  name: string;
  use: string;
  licence: string;
  link: string;
}

/** One question of a drill as the results screen reports it (mw-5r3p30.649): the point of the idea it tests, what was asked, the answer he gave, the right answer and whether he was right. `hinted` is
 *  set (true) only on a right answer a Hint helped with, which Drill it does not count. */
export interface ScreenDrillAnswer {
  idea: string;
  asked: string;
  answer: string;
  right_answer: string;
  right: boolean;
  hinted?: true;
}

/** The screen he asks from: its name, as the screen's own title has it, and what it shows (grinds/bible-talk.input.schema.json `screen`).
 *  Settings also lists every setting it has in `settings`, so the tutor can speak of one that is off; About lists every credit in `credits`; the results of a drill list every question in `drill`. */
export interface ScreenContext {
  name: string;
  facts: ScreenFact[];
  settings?: ScreenSetting[];
  credits?: ScreenCredit[];
  drill?: ScreenDrillAnswer[];
}

/** The most facts a screen sends, the longest label and the longest value (the input schema's limits). */
export const MAX_FACTS = 12;
export const FACT_LABEL_MAX = 40;
export const FACT_VALUE_MAX = 200;
/** The most settings a screen sends and the longest name, value and help of one (the input schema's limits). */
export const MAX_SETTINGS = 50;
export const SETTING_NAME_MAX = 40;
export const SETTING_VALUE_MAX = 80;
export const SETTING_HELP_MAX = 100;
/** The most credits a screen sends and the longest name, use, licence and link of one (the input schema's limits). */
export const MAX_CREDITS = 40;
export const CREDIT_NAME_MAX = 40;
export const CREDIT_USE_MAX = 160;
export const CREDIT_LICENCE_MAX = 60;
export const CREDIT_LINK_MAX = 120;

/** The name the results of a drill go by (src/tutor/drillTalk.ts): the screen he asked from, which is no route. */
export const DRILL_SCREEN = 'Drill it';

/** The most questions a drill's results send (Drill it asks at most 14) and the longest text of one (the input schema's limits). */
export const MAX_DRILL_ANSWERS = 14;
export const DRILL_ANSWER_MAX = { idea: 60, asked: 100, answer: 40, right_answer: 40 } as const;

/** The name each full screen but the Reader goes by (its title, or the name the Settings list has for it). */
export const SCREEN_NAMES: Record<Exclude<Route, 'home' | 'share' | 'unlock'>, string> = {
  goal: 'Goal',
  path: 'The whole path',
  ipa: 'Learn the IPA sounds',
  sounds: 'Hard sounds',
  words: 'Words',
  review: 'Review',
  today: 'Today',
  test: 'Quick test',
  drill: 'Parsing drill',
  paradigms: 'Paradigms',
  placement: 'Placement',
  settings: 'Settings',
  studyway: 'My study way',
  aboutyou: 'About you',
  memory: 'Memory',
  requests: 'Your requests',
  askmore: 'Ask for more',
  import: 'Import',
  about: 'About',
  preface: 'Preface',
  essay: 'The Case for Byzantine Priority',
};

const cut = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…');

/** The context the schema takes: a fact with no label or value is dropped, the rest cut to the limits, at most MAX_FACTS. */
export function fitScreen(context: ScreenContext): ScreenContext {
  const facts = context.facts
    .map((f) => ({ label: cut(f.label.trim(), FACT_LABEL_MAX), value: cut(f.value.trim(), FACT_VALUE_MAX) }))
    .filter((f) => f.label !== '' && f.value !== '')
    .slice(0, MAX_FACTS);
  const fitted: ScreenContext = { name: context.name, facts };
  if (context.settings) {
    fitted.settings = context.settings
      .map((x) => ({ name: cut(x.name.trim(), SETTING_NAME_MAX), value: cut(x.value.trim(), SETTING_VALUE_MAX), help: cut(x.help.trim(), SETTING_HELP_MAX) }))
      .filter((x) => x.name !== '' && x.value !== '' && x.help !== '')
      .slice(0, MAX_SETTINGS);
  }
  if (context.credits) {
    fitted.credits = context.credits
      .map((c) => ({ name: cut(c.name.trim(), CREDIT_NAME_MAX), use: cut(c.use.trim(), CREDIT_USE_MAX), licence: cut(c.licence.trim(), CREDIT_LICENCE_MAX), link: c.link.trim() }))
      .filter((c) => c.name !== '' && c.use !== '' && c.licence !== '' && c.link !== '' && c.link.length <= CREDIT_LINK_MAX)
      .slice(0, MAX_CREDITS);
  }
  if (context.drill) {
    const max = DRILL_ANSWER_MAX;
    fitted.drill = context.drill
      .map((d): ScreenDrillAnswer => ({
        idea: cut(d.idea.trim(), max.idea),
        asked: cut(d.asked.trim(), max.asked),
        answer: cut(d.answer.trim(), max.answer),
        right_answer: cut(d.right_answer.trim(), max.right_answer),
        right: d.right,
        ...(d.hinted ? { hinted: true as const } : {}),
      }))
      .filter((d) => d.idea !== '' && d.asked !== '' && d.answer !== '' && d.right_answer !== '')
      .slice(0, MAX_DRILL_ANSWERS);
  }
  return fitted;
}

/** The key part of a screen's name: 'My study way' is 'my-study-way' (the talk is kept under 'screen.my-study-way'). */
export const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** What the Goal screen suggests first (the Governor's own question, 2026-10-09). */
export const SIMPLEST_VERSE = "What's the simplest verse in the New Testament for me to learn first, given where I am?";

/** The suggestion that opens the phone's picture picker instead of sending words (the Talk sheet, mw-1fwagb.7): a screenshot of what he read, one tap. */
export const SEND_A_SCREENSHOT = 'Send a screenshot';

const SUGGESTIONS: Record<string, string[]> = {
  Goal: [SIMPLEST_VERSE, 'What should I learn next toward my goal, and why?', 'How close am I to being able to read my goal?'],
  'Learn the IPA sounds': ['What is IPA, and is it worth learning?', 'How do I tell /x/ and /ç/ apart?'],
  'Hard sounds': ['How can I tell if I am saying this sound right?', 'What is a good way to practise this sound each day?'],
  'The whole path': ['What should I learn next on this path?', 'Why does this idea come before that one?'],
  Words: ['Which of my words should I work on first?', 'How can I remember the words I keep missing?'],
  Review: ['Why do I keep forgetting words like this?', 'How should I use Review each day?'],
  Today: ['Talk about what I read', SEND_A_SCREENSHOT, 'How do I choose what Today shows?'],
  'Quick test': ['How can I get better at the Quick test?', 'Which words should I learn next?'],
  'Parsing drill': ['How do I read a Greek verb form?', 'What should I know before I try this drill?'],
  Paradigms: ['How do I learn a paradigm table?', 'Which table should I learn first?'],
  Placement: ['What is the placement for?', 'Where should I start with Greek grammar?'],
  Settings: ['Which settings suit a beginner?', 'What would Accordance give me?', 'What do I lose with the Weave off?'],
  'My study way': ['What should I write in my study way?', 'How does the tutor use my study way?'],
  'About you': ['What should I tell the tutor about me?', 'How does the tutor use what I write here?'],
  Memory: ['What kind of notes can I keep here?', 'How do I move my notes to another phone?'],
  'Your requests': ['What happened to my idea?', 'What do the statuses mean?'],
  'Ask for more': ['What does Lampas have already?', 'What happens to what I ask for?'],
  [DRILL_SCREEN]: ['Why did I get these wrong?', 'What should I practise next?'],
  Import: ['What words should I add to my list?', 'How do I write a word list to import?'],
  Preface: ['Why does Lampas read the Byzantine text?', 'How does the Majority text differ from the critical text?'],
  'The Case for Byzantine Priority': ['What is Robinson arguing in this essay?', 'What does "Byzantine priority" mean?', 'What do the other scholars say against it?'],
  About: ['Why do you credit all these?', 'What does each of these do for Lampas?', 'What does STEPBible give me?'],
};

/** The two or three questions the sheet opens with on the screen `name`; none for a name it does not know. */
export const suggestionsFor = (name: string): string[] => SUGGESTIONS[name] ?? SUGGESTIONS[Object.values(SCREEN_NAMES).find((n) => n.toLowerCase() === name) ?? ''] ?? [];

/** The questions for the Reader's chapter talk (the Reader's own button and Talk bar). */
export const READER_SUGGESTIONS: string[] = [
  'What is this chapter about?',
  "What's the simplest verse in this chapter for me to learn first, given where I am?",
  'Which words here are worth learning first?',
];
