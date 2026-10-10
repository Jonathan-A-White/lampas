// What the speaker beside a flagged word says (mw-5r3p30.140): the answer's `say`, else the respelling the tip itself gives
// (LEE-vites -> 'lee vites'), else the word. A phone voice read 'Levites' as LEV-its though the tip said LEE-vites.
import { describe, expect, it } from 'vitest';
import { sayOf, tipRespelling } from '../../src/services/reading';

const levites = { word: 'Levites', tip: 'Stress the first syllable, long e: say it as LEE-vites.' };

describe('sayOf', () => {
  it('speaks the tip\'s capitalised respelling, lower-cased with the hyphens as spaces, when there is no say', () => {
    expect(sayOf(levites)).toBe('lee vites');
  });

  it('prefers the answer\'s say over the tip', () => {
    expect(sayOf({ ...levites, say: 'lee vights' })).toBe('lee vights');
  });

  it('speaks the word when the tip names no respelling', () => {
    expect(sayOf({ word: 'together', tip: 'Say the th softly.' })).toBe('together');
    expect(sayOf({ word: 'blessed', tip: 'One beat, as in blest.' })).toBe('blessed');
  });

  it('does not take an ordinary hyphenated word or an all-capitals word for a respelling', () => {
    expect(sayOf({ word: 'well', tip: 'A well-known word, said NOW and slowly.' })).toBe('well');
  });

  it('takes a respelling whose capitals are in the middle of it', () => {
    expect(sayOf({ word: 'Levites', tip: 'Say luh-VY-tees.' })).toBe('luh vy tees');
  });

  it('leaves a Greek reading to the Greek word, whatever the tip spells', () => {
    expect(sayOf({ word: 'γεῖρας', tip: 'Soft y, as in YEE-ras.' }, 'greek')).toBe('γεῖρας');
  });
});

describe('tipRespelling', () => {
  it('is null for a tip with none', () => {
    expect(tipRespelling('Say it again.')).toBeNull();
  });
});
