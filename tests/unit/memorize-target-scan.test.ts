// tests/unit/memorize-target-scan.test.ts — every verse of the New Testament gives a target (mw-fu7dqf.1): the recall judge and the reading check agree on the text.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { wovenOf } from '../../src/reader/useWoven';
import { readingText, wovenReading } from '../../src/services/reading';
import { tokensOf } from '../../src/memorize/target';
import { isGreekBook } from '../support/data-books';

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);

describe('sweep: every chapter in public/data', () => {
  it('every verse has en and el tokens, none empty; en reads the English; a fully solid weave reads as the reading check does', () => {
    let verses = 0;
    const problems: string[] = [];
    for (const book of readdirSync('public/data').filter((b) => statSync(`public/data/${b}`).isDirectory() && isGreekBook(b))) {
      for (const file of readdirSync(`public/data/${book}`)) {
        if (!/^\d+\.json$/.test(file)) continue;
        const chapter = JSON.parse(readFileSync(`public/data/${book}/${file}`, 'utf8')) as Chapter;
        const lemmas = new Set(chapter.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
        const settings = (weaveOrder: 'english' | 'greek') => ({
          view: 'english' as const, weave: 'solid' as const, weaveShown: true, weaveGrammar: 'any' as const, weaveOrder, levels: new Map(), solid: lemmas,
        });
        const weaves = { english: wovenOf(chapter, settings('english')), greek: wovenOf(chapter, settings('greek')) };
        chapter.verses.forEach((verse: Verse, v) => {
          verses++;
          const at = `${book} ${chapter.chapter}:${verse.n}`;
          const en = tokensOf(verse, 'en');
          const el = tokensOf(verse, 'el');
          if (!en.length || !el.length) problems.push(`${at}: no ${en.length ? 'el' : 'en'} tokens`);
          if (en.some((t) => t.lang !== 'en') || el.some((t) => t.lang !== 'el')) problems.push(`${at}: a token in the wrong language`);
          for (const t of [...en, ...el]) if (!t.text || t.text !== t.text.trim() || /\s/.test(t.text)) problems.push(`${at}: token ${JSON.stringify(t.text)}`);
          if (en.map((t) => t.text).join(' ') !== words(readingText(verse, 'english')).join(' ')) problems.push(`${at}: en differs from the English reading`);
          if (el.map((t) => t.text).join(' ') !== words(readingText(verse, 'greek')).join(' ')) problems.push(`${at}: el differs from the Greek reading`);
          for (const order of ['english', 'greek'] as const) {
            const woven = weaves[order]?.[v] ?? null;
            const weave = tokensOf(verse, 'weave', woven);
            if (!weave.length || weave.some((t) => !t.text || /\s/.test(t.text))) problems.push(`${at}: weave (${order}) has an empty or spaced token`);
            const reading = wovenReading([verse], [woven], 'el');
            const expected = reading ? reading.segments.map((s) => s.text).join(' ') : readingText(verse, 'english');
            if (weave.map((t) => t.text).join(' ') !== words(expected).join(' ')) problems.push(`${at}: weave (${order}) differs from the reading check`);
          }
        });
      }
    }
    expect(verses).toBeGreaterThan(7900);
    expect(problems.slice(0, 20)).toEqual([]);
  }, 120_000);
});
