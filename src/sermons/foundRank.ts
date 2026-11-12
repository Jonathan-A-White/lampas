// src/sermons/foundRank.ts — the order of the Sermons sheet's 'Found' (mw-qtu3zvz.66, his words 2026-11-11: "anything matching the verse or pericope or chapter in question and it's themes should rank over a general
// search"). PROVISIONAL, the Governor to confirm: a sermon on the open verse, then one on its pericope, then one on its chapter, then one on a theme of the verse, then the rest; within a tier the service's order stands.
import type { ServiceHit } from '../services/sermons';
import { canonVerses } from './merge';
import { parseOsisRef } from './osis';
import { overlaps, touches } from './sermonsFor';
import type { SermonPlace } from './types';

export interface FoundRankContext {
  place: SermonPlace;
  /** the verses of the section the open verse stands under (the MSB heading's passage), once read; none for a chapter or a verse under no heading */
  pericope?: { first: number; last: number };
  /** the topics of the verse or passage, '<theme source>:<topic>' each (its Themes line) */
  themes: ReadonlySet<string>;
  /** the sermons on the same theme as the place, '<source>:<id>' each ('On the same theme') */
  themeSermons: ReadonlySet<string>;
}

/** 0 on the open verse (or passage), 1 on its pericope, 2 on its chapter, 3 on a theme of the verse, 4 a general match. */
export function foundTier(hit: ServiceHit, context: FoundRankContext): number {
  const { place } = context;
  if (hit.kind === 'theme') return context.themes.has(`${hit.source}:${hit.id}`) ? 3 : 4;
  if (hit.ref) {
    const parsed = parseOsisRef(hit.ref, canonVerses);
    if (parsed.ok) {
      const parts = parsed.parts.filter((part) => part.book === place.book);
      if (place.from !== undefined) {
        const to = place.to ?? place.from;
        if (parts.some((part) => overlaps(part, place.chapter, place.from!, to))) return 0;
        const { pericope } = context;
        if (pericope && parts.some((part) => overlaps(part, place.chapter, pericope.first, pericope.last))) return 1;
      }
      if (parts.some((part) => touches(part, place.chapter))) return 2;
    }
  }
  return context.themeSermons.has(`${hit.source}:${hit.id}`) ? 3 : 4;
}

/** The hits nearest the open place first; a tier keeps the order it came in. */
export function rankHits(hits: readonly ServiceHit[], context: FoundRankContext): ServiceHit[] {
  return hits
    .map((hit, at) => ({ hit, at, tier: foundTier(hit, context) }))
    .sort((a, b) => a.tier - b.tier || a.at - b.at)
    .map((entry) => entry.hit);
}
