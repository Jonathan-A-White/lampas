// tests/unit/e2e-library-seeded.test.ts — the guard of mw-qtu3zvz.161. A Logos book is offered only when his import holds it (src/data/owned.ts, mw-qtu3zvz.126), so a Playwright spec that
// opens the Library, a kind page or a Logos row on a phone with no import sees no books. A spec that mentions the library or Logos opens its page through openUnlocked / openUnlicensed
// (tests/e2e/unlocked.ts: they give the phone his import, tests/e2e/his-library.ts, unless `import: false`) or keeps one itself with keepImport (tests/e2e/keep-import.ts); a spec that does
// neither is listed in NO_LIBRARY with the reason it is not about the library.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const E2E = join(__dirname, '..', 'e2e');

/** Specs that say 'library' or 'Logos' without opening a screen that offers a Logos book, each with the reason. */
const NO_LIBRARY: Record<string, string> = {
  'reftagger.spec.ts': 'drives the RefTagger script on a blog page, and only asserts the popup has no "Logos" error text',
};

const SEEDS = /\b(openUnlocked|openUnlicensed|keepImport)\(/;
const MENTIONS = /library|Logos/;

describe('a Playwright spec that mentions the library or Logos seeds an import', () => {
  const specs = readdirSync(E2E).filter((f) => f.endsWith('.spec.ts'));

  it('finds the specs', () => {
    expect(specs.length).toBeGreaterThan(50);
  });

  it('each one opens its page through openUnlocked, openUnlicensed or keepImport, or is listed with a reason', () => {
    const bare = specs.filter((f) => {
      const text = readFileSync(join(E2E, f), 'utf8');
      return MENTIONS.test(text) && !SEEDS.test(text) && !(f in NO_LIBRARY);
    });
    expect(bare, 'these specs mention the library or Logos but keep no import: seed one with openUnlocked or keepImport (tests/e2e/keep-import.ts), or list the spec in NO_LIBRARY with its reason').toEqual([]);
  });

  it('lists no spec that is gone or that seeds an import after all', () => {
    for (const f of Object.keys(NO_LIBRARY)) {
      expect(specs, f).toContain(f);
      expect(SEEDS.test(readFileSync(join(E2E, f), 'utf8')), `${f} seeds an import: take it off NO_LIBRARY`).toBe(false);
    }
  });
});
