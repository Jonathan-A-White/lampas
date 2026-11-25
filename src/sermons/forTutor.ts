// src/sermons/forTutor.ts — the sermons as the Bible talk's request tells the tutor of them (mw-qtu3zvz.6, `sermons`, docs/sermons.md 'The tutor'): the sermons of the passage the talk holds, as sermonsFor and sameThemeFor
// answer them for the verse (or the chapter), each {id, source, title, preacher, ref, theme?, plays?}, at most MAX_TUTOR_SERMONS (the passage's own rows first, then the rows on the same theme, which name the topic they came in by), and the verse's
// themes {topic, label}, at most MAX_TUTOR_THEMES. The tutor may link a row (`sermon`: '<source>:<id>') or narrow ('only Spurgeon', 'on grace') by answering with the rows that fit. The rows the chip opens are these same
// rows (tutorSermonRows), so a link names only what the request listed.
import { bookOf, titleOf } from '../data/books';
import { latestFor, sameThemeFor, sermonsFor, sermonsOnTheme } from './index';
import { themesFor, type Theme } from '../themes';
import { themeKey } from '../themes/themesFor';
import { MLJ_ID, MLJ_PREACHER, MLJ_SOURCE, MLJ_TITLE, mljRow } from './mljLink';
import { videoOfRow } from './player';
import type { SermonPlace, SermonRef, SermonRow } from './types';

/** The most sermon rows a request lists. */
export const MAX_TUTOR_SERMONS = 8;

/** The most themes (topics of the verse) a request lists. */
export const MAX_TUTOR_THEMES = 6;

/** One sermon as the tutor is told of it: `id` and `source` make the `sermon` link ('<source>:<id>'), `ref` is the preaching text as it is written ('Romans 5:8'), `theme` the topic a row came in by (a row on the same theme). */
export interface TutorSermon {
  id: string;
  source: string;
  title: string;
  preacher?: string;
  ref: string;
  theme?: string;
  /** true on a row the app plays in its own player (a video), the only rows the tutor's play-sermon takes (mw-qtu3zvz.84); left out on any other */
  plays?: true;
}

/** A topic of the verse, as the Themes line has it: `topic` is its id within its list, `label` the name the tutor says it by. */
export interface TutorTheme {
  topic: string;
  label: string;
}

/** The request's `sermons`: the rows and the verse's themes. */
export interface TutorSermons {
  rows: TutorSermon[];
  themes: TutorTheme[];
}

/** A row of the sermons sheet, with the topic it came in by where it is a row on the same theme. */
export type ListedSermon = SermonRow & { theme?: string };

/** The preaching text as it is written: 'Romans 5:8', 'Romans 5:6-11', 'Romans 5:12-6:4'. */
export function refText(ref: SermonRef): string {
  const name = `${bookOf(ref.book)?.name ?? ref.book} ${ref.chapter}`;
  if (ref.toChapter !== undefined && ref.toChapter !== ref.chapter) return `${name}:${ref.from}-${ref.toChapter}:${ref.to}`;
  return ref.to === ref.from ? `${name}:${ref.from}` : `${name}:${ref.from}-${ref.to}`;
}

/** The rows the request lists: `rows` in the order given (the passage's own, then those on the same theme), a sermon once, at most MAX_TUTOR_SERMONS. */
export function listedSermons(rows: readonly ListedSermon[]): ListedSermon[] {
  const seen = new Set<string>();
  const listed: ListedSermon[] = [];
  for (const row of rows) {
    const key = `${row.source}:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    listed.push(row);
    if (listed.length === MAX_TUTOR_SERMONS) break;
  }
  return listed;
}

/** The sermons to tell the tutor of, from the passage's rows and the rows on the same theme (`rows`, in that order) and the verse's `themes`. Undefined fields are left out. */
export function sermonsForTutor(rows: readonly ListedSermon[], themes: readonly Theme[]): TutorSermons {
  const told = listedSermons(rows).map(
    (row): TutorSermon => ({
      id: row.id,
      source: row.source,
      title: row.title,
      ...(row.preacher ? { preacher: row.preacher } : {}),
      ref: refText(row.ref),
      ...(row.theme ? { theme: row.theme } : {}),
      ...(videoOfRow(row) ? { plays: true as const } : {}),
    }),
  );
  const seen = new Set<string>();
  const topics: TutorTheme[] = [];
  for (const theme of themes) {
    // a theme two lists name, however written, is told once (mw-qtu3zvz.90, themeKey)
    const name = themeKey(theme.label);
    if (seen.has(name)) continue;
    seen.add(name);
    const key = `${theme.source}:${theme.topic}`;
    topics.push({ topic: key, label: theme.label });
    if (topics.length === MAX_TUTOR_THEMES) break;
  }
  return { rows: told, themes: topics };
}

/** What the talk holds of sermons: the rows a chip may open and what the request tells. */
export interface TalkSermons {
  rows: ListedSermon[];
  told: TutorSermons;
}

/**
 * The sermons of the place a talk holds (a verse, else the chapter): the sheet's own rows (the bundled ones with the service's newest, as the door counts them), then those on the same theme, and the verse's themes. A whole chapter has no themes and no rows on a theme. A source or a theme file that fails
 * is logged by the module and answers nothing; this never throws. Undefined only where the module throws; the Martyn Lloyd-Jones row (mljLink.ts) is always listed last.
 */
export async function talkSermonsFor(place: SermonPlace): Promise<TalkSermons | undefined> {
  try {
    const bundled = await sermonsFor(place);
    // the service's rows the bundle lacks (mw-qtu3zvz.63, the same chapter ask the door and the sheet share); offline or failing, the bundled rows stand
    const latest = await latestFor(place, bundled).catch(() => undefined);
    const found = latest?.found ?? bundled;
    // the verse's themes the tutor is told of are those with a sermon in a source that is On, as the Themes line has them (mw-qtu3zvz.81)
    const named = place.from === undefined ? [] : await themesFor(place).catch(() => []);
    const themes = (await Promise.all(named.map(async (theme) => ((await sermonsOnTheme(theme, latest !== undefined).catch(() => [])).length > 0 ? [theme] : [])))).flat();
    const same = await sameThemeFor(place, found).catch(() => ({ groups: [], more: 0 }));
    const rows: ListedSermon[] = [...found.here, ...found.chapter, ...same.groups.flatMap((group) => group.rows.map((row): ListedSermon => ({ ...row, theme: group.topic.label })))];
    // the Martyn Lloyd-Jones row (mw-qtu3zvz.280.17) is always the last, within the same cap: the tutor links the Trust's own search for the chapter when he is asked for one of his sermons
    const listed = listedSermons(rows).slice(0, MAX_TUTOR_SERMONS - 1);
    const told = sermonsForTutor(listed, themes);
    const mlj: TutorSermon = { id: MLJ_ID, source: MLJ_SOURCE, title: MLJ_TITLE, preacher: MLJ_PREACHER, ref: titleOf(place.book, place.chapter) };
    return { rows: [...listed, mljRow(place)], told: { ...told, rows: [...told.rows, mlj] } };
  } catch (error) {
    console.warn(`could not read the sermons of the place for the tutor: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}
