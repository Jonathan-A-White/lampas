// The verse-ask grind is retired (mw-5r3p30.850): every door asks through the Bible talk's sheet (mw-5r3p30.842), so nothing sends a verse-ask,
// and the grind, its examples, its table entry and the client code that built and sent its request are gone. This test holds them gone, and holds that
// every grind still listed has a caller in src.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GRIST_KINDS } from '../../src/services/gristKinds';
import * as tutor from '../../src/services/tutor';
import * as registry from '../../src/tutor/registry';
import { GRINDS, TUTOR_KNOWS } from '../../src/tutor/knows';

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? sources(`${dir}/${entry.name}`) : /\.tsx?$/.test(entry.name) ? [`${dir}/${entry.name}`] : []));

describe('the verse-ask grind is gone', () => {
  it('is no kind of grist and no grind of the table of what the tutor knows', () => {
    expect([...GRIST_KINDS]).not.toContain('verse-ask');
    expect([...GRINDS]).not.toContain('verse-ask');
    expect(Object.keys(TUTOR_KNOWS)).not.toContain('verse-ask');
  });

  it('has no file under grinds/', () => {
    const left = readdirSync('grinds').filter((name) => name.startsWith('verse-ask'));
    expect(left).toEqual([]);
    expect(existsSync('grinds/examples/verse-ask')).toBe(false);
    expect(readFileSync('scripts/grind-build.ts', 'utf8')).not.toContain('verse-ask');
  });

  it('has no client that builds or sends its request', () => {
    for (const name of ['askTutor', 'buildRequest', 'fitAsk', 'isVerseAnswer', 'askByChange', 'TUTOR_KIND']) expect(tutor).not.toHaveProperty(name);
    for (const name of ['askRegistry', 'askClientOf', 'askWithFacts']) expect(registry).not.toHaveProperty(name);
  });
});

describe('every grind still listed has a caller', () => {
  const code = sources('src')
    .filter((file) => !file.endsWith('gristKinds.ts'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  it.each([...GRIST_KINDS])('%s is named in src beyond the list of kinds', (kind) => {
    expect(code).toMatch(new RegExp(`['"\`]${kind}['"\`]`));
  });
});
