// tests/unit/lxx-align-choose-stage.test.ts — `lxx:align-choose` lists and checks a chapter's runs at the stage `lxx:ship` applies the rows at (mw-u2w5klk.349.16): it asks the ship for the chapter
// before the rows and before joinSupplied (ShipOptions.runsOnly), not for the shipped chapter. The ship is faked here (the real one needs the git-ignored sources); the chapter it writes is the one it would write
// for Genesis 20:2 at the stage it was asked for, built by the real alignRuns and alignChapter.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { alignChapter, alignRuns } from '../../scripts/lxx/align';

const word = (t: string, tr: string, l: string, p: string): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 });
const glosses = (lemma: string): string => ({ Σάρρα: 'Sarah', ἀγαπάω: 'love' })[lemma] ?? '';
const plain = (): Chapter =>
  ({
    book: 'Genesis',
    code: 'gen',
    chapter: 20,
    verses: [{ n: 2, g: [word('Σάρρας', 'sarras', 'Σάρρα', 'N-GSF'), word('ἀγαπᾶται', 'agapatai', 'ἀγαπάω', 'V-PPI-3S')], e: [{ t: 'of Sarah, She will love.', g: [] }] }],
  }) as unknown as Chapter;

const asked: Array<{ runsOnly?: boolean; alignDir?: string }> = [];
vi.mock('../../scripts/lxx/ship', () => ({
  runShip: async (argv: readonly string[], options: { runsOnly?: boolean; alignDir?: string }) => {
    asked.push({ runsOnly: options.runsOnly, alignDir: options.alignDir });
    const dir = argv[argv.indexOf('--out') + 1];
    mkdirSync(join(dir, 'gen'), { recursive: true });
    const chapter = options.runsOnly ? alignRuns(plain(), glosses).chapter : alignChapter(plain(), glosses).chapter;
    writeFileSync(join(dir, 'gen', '20.json'), JSON.stringify(chapter));
  },
}));

describe('lxx:align-choose asks the ship for the stage the rows are applied at', () => {
  it('lists She will as run 2, as the ship applies the rows, and checks a file that names it', async () => {
    const { runAlignChoose } = await import('../../scripts/lxx/align-choose');
    const { mkdtempSync, writeFileSync: write, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-stage-'));
    try {
      const listed: string[] = [];
      await runAlignChoose(['--list', '--book', 'gen', '--chapter', '20'], { outDir: dir, print: (t) => listed.push(t) });
      expect(asked).toEqual([{ runsOnly: true, alignDir: '' }]);
      expect(listed.join('\n')).toContain('{#2 She will} love.');
      const file = join(dir, 'session.txt');
      write(file, ['Gen.20:2#1 of @-', 'Gen.20:2#2 She will @-'].join('\n'));
      const done = await runAlignChoose(['--book', 'gen', '--chapter', '20', '--from', file], { outDir: dir });
      expect(done.rows.map((r) => `${r.run}:${r.text}`)).toEqual(['1:of', '2:She will']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
