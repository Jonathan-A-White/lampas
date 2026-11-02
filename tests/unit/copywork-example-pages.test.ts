// The copywork examples' test pages (mw-5r3p30.952): the app sends a photo at TALK_MAX_EDGE (1600 px) on the long edge, so a test page
// drawn at 900 px has letters and vowel points a third as big as the phone's, and the grind honestly misreads a 4 px dot. Every page is
// rendered by scripts/render-copywork-examples.ts at the width the phone sends, and the examples hold the words the model must get right.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { TALK_MAX_EDGE } from '../../src/talk/pictures';
import { COPYWORK_PAGES } from '../../scripts/render-copywork-examples';

const DIR = 'grinds/examples/copywork';
const names = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

/** The width and height of a JPEG, read from its start-of-frame marker. */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  let at = 2;
  while (at < bytes.length) {
    if (bytes[at] !== 0xff) throw new Error('not a JPEG marker stream');
    const marker = bytes[at + 1];
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error('no frame header');
}

const read = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, 'utf8')) as { photos: string[]; expect: Record<string, unknown> };

describe('the copywork example pages are the size the phone sends', () => {
  it('finds the twelve examples, each with a page in the render script', () => {
    expect(names).toHaveLength(12);
    expect(Object.keys(COPYWORK_PAGES).sort()).toEqual(names);
  });

  it.each(names)('%s: its page is TALK_MAX_EDGE wide and under 1 MB', (name) => {
    const [photo] = read(name).photos;
    const bytes = readFileSync(`${DIR}/${photo}`);
    const { width, height } = jpegSize(bytes);
    expect(width, `${photo} width`).toBe(TALK_MAX_EDGE);
    expect(height, `${photo} height`).toBeLessThanOrEqual(TALK_MAX_EDGE);
    expect(statSync(`${DIR}/${photo}`).size, `${photo} size`).toBeLessThan(1024 * 1024);
  });
});

describe('the lines dropped for a small point are back', () => {
  const holds = (name: string, path: string, value: unknown) => expect(read(name).expect[path], `${name} ${path}`).toEqual(value);

  it('hbo-dictation-sounds-alike-genesis-1-1 holds הַשָּׁמַיִם right (725acbae)', () => holds('hbo-dictation-sounds-alike-genesis-1-1', 'words.4.mark', { equals: 'right' }));
  it('hbo-dictation-perfect-genesis-1-3 holds וַיֹּאמֶר right (4f2f20db)', () => holds('hbo-dictation-perfect-genesis-1-3', 'words.0.mark', { equals: 'right' }));
  it('hbo-dictation-perfect-genesis-1-3 holds word 0 sounds_alike absent (4e2be1f4)', () => holds('hbo-dictation-perfect-genesis-1-3', 'words.0.sounds_alike', { present: false }));
  it('grc-dictation-sounds-alike-john-1-5 holds τῇ right (0924d166)', () => holds('grc-dictation-sounds-alike-john-1-5', 'words.4.mark', { equals: 'right' }));
});
