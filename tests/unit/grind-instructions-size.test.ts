// Every grind's instructions stay under 100,000 bytes (mw-5r3p30.728): the mill warns on a prompt past that (mw-gq6.690), every ask of the grind
// pays for all of them, and at 131,254 bytes the bible-talk instructions once broke every grind (Linux's 131,072-byte argv limit). The size is
// what `cat grinds/<kind>.instructions/*.md | wc -c` prints: the bytes of its parts (or of its one file), read as the mill reads them.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instructionParts } from '../../scripts/grind-parts';

const CEILING = 100_000;

const kinds = readdirSync('grinds')
  .filter((name) => /^[a-z0-9-]+\.json$/.test(name) && !name.includes('.schema.'))
  .map((name) => name.replace(/\.json$/, ''))
  .filter((kind) => typeof (JSON.parse(readFileSync(`grinds/${kind}.json`, 'utf8')) as { instructions?: unknown }).instructions === 'string');

const bytesOf = (kind: string): number => instructionParts(kind).reduce((sum, { text }) => sum + Buffer.byteLength(text, 'utf8'), 0);

describe('the size of every grind\'s instructions', () => {
  it('finds the grinds with instructions, bible-talk and verse-ask among them', () => {
    expect(kinds).toEqual(expect.arrayContaining(['bible-talk', 'verse-ask', 'tips']));
  });

  it.each(kinds)('%s: its instructions total under 100,000 bytes', (kind) => {
    const bytes = bytesOf(kind);
    expect(bytes, `${kind}'s instructions are ${bytes} bytes; say each rule once and drop repetition to bring them under ${CEILING}`).toBeLessThan(CEILING);
  });
});
