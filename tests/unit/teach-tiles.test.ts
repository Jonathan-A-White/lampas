// tests/unit/teach-tiles.test.ts — the teach tiles of the idea sheet (mw-5r3p30.232): every idea of the letters, sounds and marks tiers has at
// least one tile, a tile says its sound as the chosen pronunciation does (never from the ladder), and another scheme changes it.
import { describe, expect, it } from 'vitest';
import { itemsOf, ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { ideaSound } from '../../src/data/grammar/lessons';
import { teachTiles } from '../../src/data/grammar/teachTiles';
import type { Pronunciation } from '../../src/speech/pronunciation';
import { MODERN } from '../../src/speech/schemes/modern';

const bare = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const TEACHING = LADDER.filter((i) => i.tier === 'letters' || i.tier === 'sounds' || i.tier === 'marks');

/** A second scheme that says every sound differently, so a tile that read anything but the scheme would show. */
const OTHER: Pronunciation = {
  ...MODERN,
  id: 'other',
  label: 'Other',
  lessons: Object.fromEntries(Object.keys(MODERN.lessons ?? {}).map((id) => [id, { sound: `other-${id}` }])),
};

describe('teachTiles', () => {
  it('gives every idea of the letters, sounds and marks tiers at least one tile', () => {
    expect(TEACHING.length).toBeGreaterThan(40);
    for (const idea of TEACHING) expect(teachTiles(idea, MODERN).length, idea.id).toBeGreaterThanOrEqual(1);
  });

  it('gives a grammar idea no tile', () => {
    expect(teachTiles(ideaOf('case-genitive'), MODERN)).toEqual([]);
  });

  it('shows the 24 letters in alphabet order with capital and small, a name, a sound, and the vowels marked', () => {
    const tiles = teachTiles(ideaOf('alphabet'), MODERN);
    expect(tiles).toHaveLength(24);
    expect(tiles[0]).toMatchObject({ form: 'Α α', name: 'alpha', vowel: true, say: { text: 'α', as: 'letter' }, ideaId: 'letter-alpha' });
    expect(tiles[23]).toMatchObject({ form: 'Ω ω', name: 'omega' });
    expect(tiles.filter((t) => t.vowel).map((t) => t.form)).toEqual(['Α α', 'Ε ε', 'Η η', 'Ι ι', 'Ο ο', 'Υ υ', 'Ω ω']);
    expect(tiles.map((t) => t.id)).toEqual(itemsOf('alphabet').map((i) => i.id));
  });

  it('shows a tile for each breathing, with an example word from the New Testament to hear', () => {
    const tiles = teachTiles(ideaOf('breathings'), MODERN);
    expect(tiles.map((t) => t.id)).toEqual(['breathing-rough', 'breathing-smooth']);
    for (const tile of tiles) {
      expect(tile.sound).toBe(ideaSound(ideaOf(tile.id), MODERN));
      expect(tile.example?.word).toBeTruthy();
      expect(tile.example?.gloss).toBeTruthy();
    }
  });

  it('shows the vowel pairs and consonant pairs with the scheme\'s sound and an example word', () => {
    for (const group of ['diphthongs', 'consonant-pairs']) {
      const tiles = teachTiles(ideaOf(group), MODERN);
      expect(tiles.map((t) => t.id)).toEqual(itemsOf(group).map((i) => i.id));
      for (const tile of tiles) {
        expect(tile.form).toBe(ideaOf(tile.id).pair);
        expect(bare(tile.example?.word ?? ''), tile.id).toContain(tile.form);
      }
    }
  });

  it('gives an item its own tile, and no link to its own sheet', () => {
    const [tile] = teachTiles(ideaOf('letter-beta'), MODERN);
    expect(tile).toMatchObject({ id: 'letter-beta', form: 'Β β', name: 'beta', sound: 'v, as in “vase”' });
    expect(tile.ideaId).toBeUndefined();
  });

  it('reads every sound from the scheme, and another scheme changes it', () => {
    let withSound = 0;
    for (const idea of TEACHING) {
      for (const [scheme, expected] of [[MODERN, (id: string) => ideaSound(ideaOf(id), MODERN)], [OTHER, (id: string) => `other-${id}`]] as const) {
        for (const tile of teachTiles(idea, scheme)) {
          if (!tile.sound) continue;
          withSound += 1;
          expect(tile.sound, `${idea.id}/${tile.id}`).toBe(expected(tile.id));
        }
      }
    }
    expect(withSound).toBeGreaterThan(100);
    expect(teachTiles(ideaOf('letter-alpha'), OTHER)[0].sound).toBe('other-letter-alpha');
  });

  it('gives no sound for a scheme that teaches none, never another scheme\'s', () => {
    const silent: Pronunciation = { ...MODERN, id: 'silent', lessons: {} };
    for (const idea of TEACHING) for (const tile of teachTiles(idea, silent)) expect(tile.sound, `${idea.id}/${tile.id}`).toBeUndefined();
  });

  it('gives a mark with no sound of its own a note instead, and every spoken tile something to say', () => {
    for (const id of ['accents', 'iota-subscript', 'punctuation', 'movable-letters', 'marks-change-word', 'enclitics', 'syllables']) {
      for (const tile of teachTiles(ideaOf(id), MODERN)) expect(tile.sound ?? tile.note ?? tile.name, `${id}/${tile.id}`).toBeTruthy();
    }
    for (const idea of TEACHING) {
      for (const tile of teachTiles(idea, MODERN)) {
        if (tile.say) expect(tile.say.text.length, `${idea.id}/${tile.id}`).toBeGreaterThan(0);
        if (tile.example) expect(tile.example.word.length).toBeGreaterThan(0);
      }
    }
  });
});
