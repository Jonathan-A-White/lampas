// tests/unit/memorize-languages.test.ts — languagesFor at every pair of dial levels (mw-gdcyf98.15): an Old Testament verse is offered English always, Hebrew from Hebrew Curious and the Weave from
// Hebrew Dipping a toe; a New Testament verse the same by the Greek dial; the other language's dial never counts, 'el' is never offered on an Old Testament verse nor 'he' on a New Testament one.
import { describe, expect, it } from 'vitest';
import { isMemorizeLang, langName, languagesFor, MEMORIZE_LANGS, type MemorizeLang } from '../../src/memorize/languages';
import type { InterestLevel } from '../../src/settings/definitions/interest';

const LEVELS: InterestLevel[] = [0, 1, 2, 3, 4, 5];
const offered = (level: InterestLevel): MemorizeLang[] => (level === 0 ? ['en'] : level === 1 ? ['en', 'own'] : ['en', 'own', 'weave']) as MemorizeLang[];
const expected = (own: MemorizeLang, level: InterestLevel): MemorizeLang[] => offered(level).map((l) => (l === ('own' as MemorizeLang) ? own : l));

describe('languagesFor', () => {
  for (const grc of LEVELS) {
    for (const he of LEVELS) {
      it(`Greek ${grc}, Hebrew ${he}: an Old Testament verse by the Hebrew dial, a New Testament one by the Greek`, () => {
        expect(languagesFor({ grc, he }, 'hbo')).toEqual(expected('he', he));
        expect(languagesFor({ grc, he }, 'grc')).toEqual(expected('el', grc));
      });
    }
  }

  it('never offers Greek on an Old Testament verse nor Hebrew on a New Testament one', () => {
    for (const grc of LEVELS) for (const he of LEVELS) {
      expect(languagesFor({ grc, he }, 'hbo')).not.toContain('el');
      expect(languagesFor({ grc, he }, 'grc')).not.toContain('he');
    }
  });

  it('names each language for the screen and knows them', () => {
    expect(MEMORIZE_LANGS.map(langName)).toEqual(['English', 'Greek', 'Hebrew', 'Weave']);
    expect(MEMORIZE_LANGS.every(isMemorizeLang)).toBe(true);
    expect(isMemorizeLang('hbo')).toBe(false);
  });
});
