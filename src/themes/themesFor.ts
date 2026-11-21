// src/themes/themesFor.ts — the topics of a verse or a passage from a list of theme sources (docs/sermons.md 'The themes'): the topics that have a link overlapping it, each with the part its narrowest link names.
// A whole chapter has none (a chapter touches two or three dozen topics: a line for a verse is a line a person can read).
import { overlaps } from '../sermons/sermonsFor';
import type { Link, Theme, ThemePlace, ThemeSource, Topic } from './types';

/** How wide a link is, in verses of its first chapter to its last: the order's measure (a link across chapters is wider than any in one). */
const width = (link: Link): number => (link.ref.toChapter ?? link.ref.chapter) * 1000 + link.ref.to - (link.ref.chapter * 1000 + link.ref.from);

/** The Themes line's words for a topic: its label, then ': ' and the part's where the link names one ('Love-Hatred: Of God'). */
export const themeText = (label: string, partLabel: string | undefined): string => (partLabel === undefined ? label : `${label}: ${partLabel}`);

/**
 * The key two lists' topics are one theme by (mw-qtu3zvz.90): the label's letters and numbers, lower case, with accents, apostrophes and the module's trailing punctuation dropped and any other punctuation read as a space.
 * An inverted form ('Sinner's Friend, Christ the') or a different word ('Faithfulness') is a different key: the rule joins what is the same name written two ways, and no more.
 */
export const themeKey = (label: string): string =>
  label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The themes with a theme two lists give once: the first of each name (`themeKey`), in the order given. Each theme keeps its own source and topic, so a caller that wants the sermons of both reads them from `themes`, not from this. */
export function joinThemes<T extends Pick<Theme, 'label'>>(themes: readonly T[]): T[] {
  const seen = new Set<string>();
  return themes.filter((theme) => {
    const key = themeKey(theme.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A source that fails leaves the others to answer: the failure is logged, and its topics are none. */
async function themesOf(source: ThemeSource, place: ThemePlace & { from: number }): Promise<Theme[]> {
  try {
    const { topics, links } = await source.book(place.book);
    const to = place.to ?? place.from;
    const byId = new Map<string, Topic>(topics.map((t) => [t.id, t]));
    // of a topic's links on the place, the narrowest, then the lowest part (the sermon-index service's rule, docs/api.md 'The theme tier')
    const best = new Map<string, Link>();
    for (const link of links) {
      if (!overlaps(link.ref, place.chapter, place.from, to) || !byId.has(link.topic)) continue;
      const held = best.get(link.topic);
      if (!held || width(link) < width(held) || (width(link) === width(held) && (link.part ?? 0) < (held.part ?? 0))) best.set(link.topic, link);
    }
    return [...best.entries()]
      .sort(([ta, a], [tb, b]) => width(a) - width(b) || byId.get(ta)!.label.localeCompare(byId.get(tb)!.label) || (a.part ?? 0) - (b.part ?? 0))
      .map(([id, link]) => {
        const topic = byId.get(id)!;
        const partLabel = link.part === undefined ? undefined : topic.parts.find((p) => p.n === link.part)?.label;
        return {
          source: source.id,
          sourceName: source.name,
          topic: id,
          label: topic.label,
          ...(partLabel === undefined ? {} : { part: link.part, partLabel }),
          verses: topic.verses,
          ...(topic.books === undefined ? {} : { books: topic.books }),
          text: themeText(topic.label, partLabel),
        };
      });
  } catch (error) {
    console.warn(`could not read the themes of ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/** The topics of a verse or passage, source by source in the list's order, each source's narrower links first, then by label. A place with no `from` (a whole chapter) has none. */
export async function themesForSources(sources: readonly ThemeSource[], place: ThemePlace): Promise<Theme[]> {
  const from = place.from;
  if (from === undefined) return [];
  return (await Promise.all(sources.map((source) => themesOf(source, { ...place, from })))).flat();
}
