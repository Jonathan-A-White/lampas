// src/data/hardSounds/schema.ts — the shape of a Hard sounds lesson (mw-5r3p30.361, PROVISIONAL, the Governor to confirm), and the one check every lesson
// file passes. A lesson is a data file of this folder (<id>.json): which Greek pronunciation it teaches, the English accents it is written for (a sound
// hard for an American ear may be easy for a British one), the standard sounds it teaches (src/speech/sounds.ts, shown only to a reader whose accent is IPA),
// the letters whose sheets link to it, and its steps: why it is hard for your accent, start from a sound you know, hear it, tell them apart, try it, and
// it may add a stretch (a harder form of the sound, to hear and say, whose own IPA the screen shows under IPA only) and end with a verse.
// src/hardSounds/HardSoundLesson.tsx draws any lesson that passes, so a new lesson is a new file and no code.
// A text is one string for every accent, or one per accent the lesson is for. A text names no IPA: the screen alone shows the sound's id, under IPA.
import { ACCENTS } from '../../speech/accents';
import { PRONUNCIATIONS } from '../../speech/pronunciation';
import { SOUND_IDS, type SoundId } from '../../speech/sounds';

/** The accents a lesson is written for: every English accent but IPA, which reads the American lessons (src/hardSounds/lessons.ts lessonAccent). */
export const LESSON_ACCENTS: readonly string[] = ACCENTS.filter((a) => a.id !== 'ipa').map((a) => a.id);

/** What a step says: the same for every accent, or by accent id ('american', 'british'). */
export type Said = string | Readonly<Record<string, string>>;

/** The steps of a lesson, by kind, in the order a lesson takes them. */
export const STEP_KINDS = ['why', 'from-known', 'hear', 'contrast', 'try', 'stretch', 'verse'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

/** Every lesson has one of each of these; 'verse' is the one a lesson may leave out. */
const REQUIRED_KINDS: readonly StepKind[] = ['why', 'from-known', 'hear', 'contrast', 'try'];

export type HardSoundStep =
  /** why the sound is hard for an ear of his accent */
  | { kind: 'why'; text: Said }
  /** a sound he already makes, and how to move from it; words to hear, when the step has them */
  | { kind: 'from-known'; text: Said; words?: string[] }
  /** Greek words that have the sound, each to hear */
  | { kind: 'hear'; text: Said; words: string[] }
  /** pairs of Greek words told apart by the sound, each word to hear */
  | { kind: 'contrast'; text: Said; pairs: [string, string][] }
  /** words to say after the voice */
  | { kind: 'try'; text: Said; words: string[] }
  /** a harder form of the sound, to hear and say, offered as only a stretch (mw-5r3p30.359: the trill after the tap); `ipa` is its standard id, shown only under IPA */
  | { kind: 'stretch'; text: Said; words: string[]; ipa?: string }
  /** a verse rich in the sound ('1jn.1.2'), to hear and to read aloud in the Verse view */
  | { kind: 'verse'; text: Said; ref: string };

export interface HardSoundLesson {
  /** the file's name: 'tapped-r' */
  id: string;
  /** what the list and the lesson's header show: 'Rolling your r' */
  title: string;
  /** what a letter sheet's link to it says before '(optional)': 'Learn to roll your r'; 'Learn to say it' when a lesson gives none */
  learn?: string;
  /** the Greek pronunciation it teaches: 'modern' */
  scheme: string;
  /** the accents it is written for: ['american', 'british'] */
  for: string[];
  /** the standard sounds it teaches: ['/ɾ/'] */
  sounds: SoundId[];
  /** the letters (or pairs) whose sheets link to it: ['ρ'] */
  letters: string[];
  steps: HardSoundStep[];
}

const GREEK_WORD = /^[\p{Script=Greek}\p{M}’']+$/u;
/** What IPA writes that plain text does not (as tests/unit/no-ipa-shown.test.tsx); θ is Greek's own. */
const IPA_ONLY = /[ɣʝðɛɔʃːçŋɾɡ]/u;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** What is wrong with a text: it must be said for every accent the lesson is for, and name no IPA. */
function saidProblems(said: unknown, accents: readonly string[], at: string): string[] {
  const texts: [string, unknown][] = isObject(said) ? accents.map((a) => [`${at}.${a}`, said[a]]) : [[at, said]];
  if (isObject(said)) for (const key of Object.keys(said)) if (!accents.includes(key)) texts.push([`${at}.${key}`, 'is for an accent the lesson is not for']);
  return texts.flatMap(([where, text]) => {
    if (text === 'is for an accent the lesson is not for') return [`${where} ${text}`];
    if (!isText(text)) return [`${where}: no text for ${where.split('.').pop()}`];
    if (IPA_ONLY.test(text) || SOUND_IDS.some((id) => text.includes(id))) return [`${where}: IPA in a text (only the screen shows it, under IPA)`];
    return [];
  });
}

const wordsProblems = (words: unknown, at: string, required: boolean): string[] => {
  if (words === undefined && !required) return [];
  if (!Array.isArray(words) || words.length === 0) return [`${at}: a list of Greek words`];
  return words.flatMap((w, i) => (typeof w === 'string' && GREEK_WORD.test(w) ? [] : [`${at}[${i}]: ${JSON.stringify(w)} is not a Greek word`]));
};

function stepProblems(step: unknown, i: number, accents: readonly string[]): string[] {
  const at = `steps[${i}]`;
  if (!isObject(step)) return [`${at}: a step is an object`];
  const kind = step.kind;
  if (!(STEP_KINDS as readonly unknown[]).includes(kind)) return [`${at}: no kind of step ${JSON.stringify(kind)} (${STEP_KINDS.join(', ')})`];
  const problems = saidProblems(step.text, accents, `${at}.text`);
  if (kind === 'from-known') problems.push(...wordsProblems(step.words, `${at}.words`, false));
  if (kind === 'hear' || kind === 'try' || kind === 'stretch') problems.push(...wordsProblems(step.words, `${at}.words`, true));
  if (kind === 'contrast') {
    const pairs = step.pairs;
    if (!Array.isArray(pairs) || pairs.length === 0) problems.push(`${at}.pairs: a list of pairs of Greek words`);
    else
      pairs.forEach((pair, p) => {
        if (!Array.isArray(pair) || pair.length !== 2) problems.push(`${at}.pairs[${p}]: a pair is two Greek words`);
        else problems.push(...wordsProblems(pair, `${at}.pairs[${p}]`, true));
      });
  }
  if (kind === 'stretch' && step.ipa !== undefined && (typeof step.ipa !== 'string' || !/^\/[^/\s]+\/$/.test(step.ipa))) problems.push(`${at}.ipa: a sound between slashes, such as '/r/'`);
  if (kind === 'verse' && (typeof step.ref !== 'string' || !/^[0-9a-z]+\.\d+\.\d+$/.test(step.ref))) problems.push(`${at}.ref: a verse such as '1jn.1.2'`);
  return problems;
}

/** Everything wrong with `raw` as a lesson; none for a lesson the screen can draw. */
export function lessonProblems(raw: unknown): string[] {
  if (!isObject(raw)) return ['a lesson is an object'];
  const problems: string[] = [];
  if (typeof raw.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.id)) problems.push("id: kebab case, the file's name ('tapped-r')");
  if (!isText(raw.title)) problems.push('title: a title');
  if (raw.learn !== undefined && (!isText(raw.learn) || IPA_ONLY.test(raw.learn) || SOUND_IDS.some((id) => (raw.learn as string).includes(id)))) problems.push('learn: a plain label, with no IPA');
  if (!PRONUNCIATIONS.some((p) => p.id === raw.scheme)) problems.push(`scheme: one of ${PRONUNCIATIONS.map((p) => p.id).join(', ')}`);
  const accents = Array.isArray(raw.for) ? raw.for : [];
  if (accents.length === 0 || accents.some((a) => !LESSON_ACCENTS.includes(a as string))) problems.push(`for: one or more of ${LESSON_ACCENTS.join(', ')}`);
  if (!Array.isArray(raw.sounds) || raw.sounds.length === 0 || raw.sounds.some((s) => !(SOUND_IDS as readonly unknown[]).includes(s))) problems.push('sounds: one or more standard sound ids');
  if (!Array.isArray(raw.letters) || raw.letters.some((l) => typeof l !== 'string' || !GREEK_WORD.test(l))) problems.push('letters: Greek letters or pairs');
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  if (steps.length === 0) return [...problems, 'steps: a list of steps'];
  steps.forEach((step, i) => problems.push(...stepProblems(step, i, accents as string[])));
  const kinds = steps.map((s) => (isObject(s) ? s.kind : undefined));
  if (kinds[0] !== 'why') problems.push('steps: a lesson starts with why it is hard');
  for (const kind of REQUIRED_KINDS) if (!kinds.includes(kind)) problems.push(`steps: no ${kind} step`);
  if (kinds.includes('stretch') && kinds.indexOf('stretch') < kinds.indexOf('try')) problems.push('steps: a stretch comes after try');
  if (kinds.indexOf('verse') >= 0 && kinds.indexOf('verse') !== kinds.length - 1) problems.push('steps: a verse step comes last');
  return problems;
}

/** `raw` as a lesson; throws, naming every problem, when it is not one. */
export function parseLesson(raw: unknown): HardSoundLesson {
  const problems = lessonProblems(raw);
  if (problems.length) throw new Error(`Not a Hard sounds lesson${isObject(raw) && typeof raw.id === 'string' ? ` (${raw.id})` : ''}:\n${problems.join('\n')}`);
  return raw as unknown as HardSoundLesson;
}
