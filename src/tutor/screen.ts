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

/** The screen he asks from: its name, as the screen's own title has it, and what it shows (grinds/bible-talk.input.schema.json `screen`).
 *  Settings also lists every setting it has in `settings`, so the tutor can speak of one that is off. */
export interface ScreenContext {
  name: string;
  facts: ScreenFact[];
  settings?: ScreenSetting[];
}

/** The most facts a screen sends, the longest label and the longest value (the input schema's limits). */
export const MAX_FACTS = 12;
export const FACT_LABEL_MAX = 40;
export const FACT_VALUE_MAX = 200;
/** The most settings a screen sends and the longest name, value and help of one (the input schema's limits). */
export const MAX_SETTINGS = 30;
export const SETTING_NAME_MAX = 40;
export const SETTING_VALUE_MAX = 80;
export const SETTING_HELP_MAX = 100;

/** The name each full screen but the Reader goes by (its title, or the name the Settings list has for it). */
export const SCREEN_NAMES: Record<Exclude<Route, 'home'>, string> = {
  goal: 'Goal',
  words: 'Words',
  review: 'Review',
  test: 'Quick test',
  drill: 'Parsing drill',
  paradigms: 'Paradigms',
  placement: 'Placement',
  settings: 'Settings',
  studyway: 'My study way',
  import: 'Import',
  about: 'About',
  preface: 'Preface',
};

const cut = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…');

/** The context the schema takes: a fact with no label or value is dropped, the rest cut to the limits, at most MAX_FACTS. */
export function fitScreen(context: ScreenContext): ScreenContext {
  const facts = context.facts
    .map((f) => ({ label: cut(f.label.trim(), FACT_LABEL_MAX), value: cut(f.value.trim(), FACT_VALUE_MAX) }))
    .filter((f) => f.label !== '' && f.value !== '')
    .slice(0, MAX_FACTS);
  if (!context.settings) return { name: context.name, facts };
  const settings = context.settings
    .map((x) => ({ name: cut(x.name.trim(), SETTING_NAME_MAX), value: cut(x.value.trim(), SETTING_VALUE_MAX), help: cut(x.help.trim(), SETTING_HELP_MAX) }))
    .filter((x) => x.name !== '' && x.value !== '' && x.help !== '')
    .slice(0, MAX_SETTINGS);
  return { name: context.name, facts, settings };
}

/** The key part of a screen's name: 'My study way' is 'my-study-way' (the talk is kept under 'screen.my-study-way'). */
export const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** What the Goal screen suggests first (the Governor's own question, 2026-10-09). */
export const SIMPLEST_VERSE = "What's the simplest verse in the New Testament for me to learn first, given where I am?";

const SUGGESTIONS: Record<string, string[]> = {
  Goal: [SIMPLEST_VERSE, 'What should I learn next toward my goal, and why?', 'How close am I to being able to read my goal?'],
  Words: ['Which of my words should I work on first?', 'How can I remember the words I keep missing?'],
  Review: ['Why do I keep forgetting words like this?', 'How should I use Review each day?'],
  'Quick test': ['How can I get better at the Quick test?', 'Which words should I learn next?'],
  'Parsing drill': ['How do I read a Greek verb form?', 'What should I know before I try this drill?'],
  Paradigms: ['How do I learn a paradigm table?', 'Which table should I learn first?'],
  Placement: ['What is the placement for?', 'Where should I start with Greek grammar?'],
  Settings: ['Which settings suit a beginner?', 'What would Accordance give me?', 'What do I lose with the Weave off?'],
  'My study way': ['What should I write in my study way?', 'How does the tutor use my study way?'],
  Import: ['What words should I add to my list?', 'How do I write a word list to import?'],
  Preface: ['Why does Lampas read the Byzantine text?', 'How does the Majority text differ from the critical text?'],
  About: ['What is Lampas for?', 'Which texts does Lampas use?', 'What does each of these do for Lampas?'],
};

/** The two or three questions the sheet opens with on the screen `name`; none for a name it does not know. */
export const suggestionsFor = (name: string): string[] => SUGGESTIONS[name] ?? [];

/** The questions for the Reader's chapter talk (the Reader's own button and Talk bar). */
export const READER_SUGGESTIONS: string[] = [
  'What is this chapter about?',
  "What's the simplest verse in this chapter for me to learn first, given where I am?",
  'Which words here are worth learning first?',
];
