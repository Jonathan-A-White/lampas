// The listening page of the letter-sounds research (public/sounds-trial.html, docs/research/letter-sounds.md, mw-5r3p30.395): every item the
// story names is on it, in every candidate's column, each clip it plays is a small MP3 that ships in public/, the app links to none of it and the
// worker never precaches it. The page draws its rows with its own script, so its body is put in this test's document and the script run against it.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';

const html = readFileSync('public/sounds-trial.html', 'utf8');

/** The items the acceptance criteria name: the four vowel sounds, Ὃ, ὁ, ἡ, ὦ, three letter drills, and the voice on whole words. */
const ITEMS = ['vowel-a', 'vowel-e', 'vowel-ee', 'vowel-o', 'O-1jn', 'o', 'ee', 'omega', 'beta', 'gamma', 'theta', 'voice-o-logos', 'voice-ee-zoe', 'voice-o-anthrope', 'voice-1jn'];
const CLIP_CANDIDATES = ['espeak', 'piper', 'coqui', 'chatterbox'];
const ONE_GREEK_LETTER = /^\p{Script=Greek}$/u;

beforeAll(() => {
  const body = /<body>([\s\S]*)<\/body>/.exec(html)![1];
  const script = /<script>([\s\S]*?)<\/script>/.exec(body)![1];
  document.body.innerHTML = body.replace(/<script>[\s\S]*?<\/script>/, '');
  new Function(script)();
});

const card = (id: string): Element => {
  const found = document.querySelector(`section[data-item="${id}"]`);
  expect(found, id).not.toBeNull();
  return found!;
};
const clipsOf = (root: ParentNode): string[] => [...root.querySelectorAll<HTMLElement>('button[data-clip]')].map((b) => b.dataset.clip!);
const bare = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/‍/g, '').trim();

describe('the letter-sounds listening page', () => {
  it('has every item, each with the phone’s own voice and every clip candidate beside it', () => {
    for (const id of ITEMS) {
      const section = card(id);
      expect(section.querySelectorAll('button[data-say][data-candidate="phone"]').length, `${id}: phone voice`).toBeGreaterThan(0);
      for (const candidate of CLIP_CANDIDATES) {
        expect(section.querySelectorAll(`button[data-clip][data-candidate="${candidate}"]`).length, `${id}: ${candidate}`).toBeGreaterThan(0);
      }
    }
  });

  it('hands the phone’s voice a whole word beside each one-letter word and each drill letter, for comparison', () => {
    for (const [id, word] of [['O-1jn', 'ὃ ἦν ἀπ᾽ ἀρχῆς'], ['o', 'ὁ λόγος'], ['ee', 'ἡ ζωή'], ['omega', 'ὦ ἄνθρωπε'], ['beta', 'βίβλος'], ['gamma', 'ἀγάπη'], ['theta', 'θεός']] as const) {
      const said = [...card(id).querySelectorAll<HTMLElement>('button[data-say]')].map((b) => b.dataset.say);
      expect(said, id).toContain(word);
    }
  });

  it('tries the phone’s voice on the bare letter, a doubled letter and a joiner for each lone vowel (the tricks the research weighs)', () => {
    for (const [id, letter] of [['O-1jn', 'ο'], ['o', 'ο'], ['ee', 'η'], ['omega', 'ω']] as const) {
      const said = [...card(id).querySelectorAll<HTMLElement>('button[data-say][data-mode="plain"]')].map((b) => b.dataset.say!);
      expect(said.some((s) => bare(s) === letter), `${id}: the bare letter`).toBe(true);
      expect(said, `${id}: doubled`).toContain(letter + letter);
      expect(said, `${id}: a zero-width joiner`).toContain(`${letter}‍`);
    }
    const o = card('o');
    expect(o.querySelector('button[data-mode="ssml-xml"][data-ph="o"]'), 'SSML with the XML header').not.toBeNull();
    expect(o.querySelector('button[data-mode="ssml-raw"][data-ph="o"]'), 'a raw SSML tag').not.toBeNull();
    expect(o.querySelector('button[data-mode="cut"][data-ms]'), 'a phrase cut short').not.toBeNull();
  });

  it('plays the drill letter three ways in each neural voice: its name, its bare sound and a word', () => {
    for (const id of ['beta', 'gamma', 'theta']) {
      for (const candidate of ['piper', 'coqui', 'chatterbox']) {
        const clips = [...card(id).querySelectorAll<HTMLElement>(`button[data-clip][data-candidate="${candidate}"]`)].map((b) => b.dataset.clip!);
        expect(clips.some((c) => /\/name-/.test(c)), `${id} ${candidate}: the name`).toBe(true);
        expect(clips.some((c) => /\/word-/.test(c)), `${id} ${candidate}: a word`).toBe(true);
        expect(clips.some((c) => /\/(v|gh|th)\.mp3$/.test(c)), `${id} ${candidate}: the sound`).toBe(true);
      }
    }
  });

  it('plays today’s clips (public/sounds/modern) for eSpeak NG on the one-letter words, byte for byte', () => {
    for (const [id, vowel] of [['O-1jn', 'o'], ['o', 'o'], ['ee', 'ee'], ['omega', 'o']] as const) {
      const clips = [...card(id).querySelectorAll<HTMLElement>('button[data-clip][data-candidate="espeak"]')].map((b) => b.dataset.clip!);
      expect(clips).toContain(`/sounds-trial/espeak/${vowel}.mp3`);
      expect(readFileSync(`public/sounds-trial/espeak/${vowel}.mp3`).equals(readFileSync(`public/sounds/modern/${vowel}.mp3`)), vowel).toBe(true);
    }
  });

  it('plays only clips that ship: each a root-absolute MP3 under public/sounds-trial/, under 24 KB', () => {
    const clips = [...new Set(clipsOf(document))];
    expect(clips.length).toBeGreaterThan(40);
    for (const url of clips) {
      expect(url).toMatch(/^\/sounds-trial\/[a-z]+\/[a-z0-9-]+\.mp3$/);
      const path = `public${url}`;
      expect(existsSync(path), `${url} is missing`).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.length, url).toBeGreaterThan(400);
      expect(bytes.length, url).toBeLessThan(24 * 1024);
      // an MPEG audio frame's sync word: no ID3 tag is written
      expect(bytes[0], url).toBe(0xff);
      expect(bytes[1] & 0xe0, url).toBe(0xe0);
    }
  });

  it('ships no clip the page does not play', () => {
    const played = new Set(clipsOf(document));
    for (const candidate of readdirSync('public/sounds-trial')) {
      for (const file of readdirSync(`public/sounds-trial/${candidate}`)) {
        expect(statSync(`public/sounds-trial/${candidate}/${file}`).isFile()).toBe(true);
        expect(played.has(`/sounds-trial/${candidate}/${file}`), `${candidate}/${file} is on no button`).toBe(true);
      }
    }
  });

  it('hands the phone’s voice no SSML as plain text: a one-letter button is the letter, with or without its marks', () => {
    for (const button of document.querySelectorAll<HTMLElement>('button[data-say][data-mode="plain"]')) {
      const said = button.dataset.say!;
      expect(said).not.toMatch(/[<>]/);
      const letters = [...bare(said).replace(/[\s.,]/g, '')];
      if (letters.length === 1) expect(letters[0], said).toMatch(ONE_GREEK_LETTER);
    }
  });

  it('is linked from no screen of the app, and neither it nor its clips are precached', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
    const mentions = walk('src').filter((f) => /\.(ts|tsx|css)$/.test(f) && readFileSync(f, 'utf8').includes('sounds-trial'));
    expect(mentions).toEqual([]);
    expect(injectManifestOptions.globIgnores).toEqual(expect.arrayContaining(['sounds-trial.html', 'sounds-trial/**']));
    expect(injectManifestOptions.globPatterns.some((g) => g.startsWith('sounds-trial'))).toBe(false);
  });

  it('credits the three trial voices itself, since About credits only what the app uses (mw-5r3p30.875)', () => {
    const credits = document.getElementById('credits')?.textContent ?? '';
    for (const word of ['Piper', 'MIT', 'rapunzelina', 'CC0', 'Coqui', 'MPL-2.0', 'BSD-3-Clause', 'Chatterbox', 'Resemble AI']) expect(credits, word).toContain(word);
    expect(readFileSync('ATTRIBUTION.md', 'utf8')).not.toMatch(/Piper|Coqui|Chatterbox/);
  });

  it('asks no index to list it', () => {
    expect(/<meta name="robots" content="[^"]*noindex/.test(html)).toBe(true);
  });
});
