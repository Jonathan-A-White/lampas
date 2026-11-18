// tests/unit/catalogue-short-names.test.ts — a short name in the catalogue is at most 60 characters (mw-qtu3zvz.148): the Sermons list draws a name in two lines at most
// (docs/design/sermon-sources.md section 5) and cuts a longer one, so the rules give a longer title a short name of its own (data/logos/catalogue-rules.json "shorts", or
// the "short" of an id rule); the title is never changed. Every kind is checked, not only sermons.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { KindFile } from '../../src/resources/catalogue';

const dir = join(__dirname, '../../src/resources/catalogue');
const MAX_SHORT = 60;

describe('the catalogue’s short names', () => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ f, file: JSON.parse(readFileSync(join(dir, f), 'utf8')) as KindFile }));

  it('reads every kind’s file, sermons among them', () => {
    expect(files.map((x) => x.f)).toContain('sermons.json');
    expect(files.flatMap((x) => x.file.entries).length).toBeGreaterThan(500);
  });

  it('holds no short name over 60 characters, in any kind', () => {
    const over = files.flatMap(({ f, file }) => file.entries.filter((e) => [...e.short].length > MAX_SHORT).map((e) => `${f} ${e.resource}: ${[...e.short].length} “${e.short}”`));
    expect(over).toEqual([]);
  });

  it('gives every entry a short name', () => {
    const none = files.flatMap(({ f, file }) => file.entries.filter((e) => !e.short.trim()).map((e) => `${f} ${e.resource}`));
    expect(none).toEqual([]);
  });
});
