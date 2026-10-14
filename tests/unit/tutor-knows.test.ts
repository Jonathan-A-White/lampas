// The tutor is told what bears on its answer (mw-5r3p30.242): VISION.md carries his rule, and src/tutor/knows.ts lists, for each grind, the settings
// and the parts of his progress its request carries (or the written reason it does not). A setting that bears on speech, language, level, the quiz
// goal or his study way and is in no grind's request without a reason fails here; so does a builder that does not send what the table says.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from '../../src/data/db';
import type { Verse } from '../../src/data/chapter';
import { learnerGrammarOf } from '../../src/data/grammar/learnerGrammar';
import { setGreekPronunciation } from '../../src/data/repositories';
import { buildReadingRequest } from '../../src/services/reading';
import { buildRequest } from '../../src/services/tutor';
import { currentSettings, SETTINGS } from '../../src/settings/registry';
import { buildTipRequest } from '../../src/tips/tip';
import { BEARS_ON, GRINDS, PROGRESS, TUTOR_KNOWS, settingsSentTo, type GrindKind } from '../../src/tutor/knows';
import type { Schema } from '../support/schema-validate';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const readJson = (rel: string): Schema => JSON.parse(readFileSync(rel, 'utf8')) as Schema;
const inputSchema = (kind: GrindKind): Schema => readJson(`grinds/${kind}.input.schema.json`);

describe('VISION.md', () => {
  const vision = readFileSync('VISION.md', 'utf8');

  it('keeps his words on the tutor, verbatim, dated, with the txid, under a heading for the tutor', () => {
    expect(vision).toMatch(/^## .*\btutor\b/im);
    expect(vision).toContain(
      "so the general rule is is that the tutor always needs to be able to know the up-to-date that could have an impact what he's doing in addition to what he needs to know about you know my progress when I'm at all that you know all the other things we've spoken about before",
    );
    expect(vision).toContain('2026-10-12');
    expect(vision).toContain('direct:8d723b2f');
  });

  it('says the rule in one plain line', () => {
    expect(vision).toContain('The tutor is told, on every ask, each app setting and each part of his progress that could change its answer.');
  });
});

describe('the table of what each grind is told (src/tutor/knows.ts)', () => {
  it('names the four grinds', () => {
    expect([...GRINDS]).toEqual(['bible-talk', 'verse-ask', 'verse-read', 'tips']);
  });

  it('says what every setting of the registry bears on, and nothing else', () => {
    expect(Object.keys(BEARS_ON).sort()).toEqual(SETTINGS.map((s) => s.key).sort());
  });

  describe.each(GRINDS)('%s', (kind) => {
    const knows = TUTOR_KNOWS[kind];
    const bearing = Object.entries(BEARS_ON).filter(([, on]) => on !== 'screen');

    it.each(bearing)('%s (bears on %s) is sent, or has a written reason it is not', (key) => {
      const sent = key in knows.settings;
      const reason = knows.notSent[key];
      expect(sent || (typeof reason === 'string' && reason.trim().length >= 20), `${kind} neither sends ${key} nor says why not`).toBe(true);
      expect(sent && reason !== undefined, `${kind} both sends ${key} and gives a reason it does not`).toBe(false);
    });

    it.each(Object.keys(PROGRESS))('his progress, %s, is sent or has a written reason it is not', (part) => {
      const sent = part in knows.progress;
      const reason = knows.notSent[part];
      expect(sent || (typeof reason === 'string' && reason.trim().length >= 20), `${kind} neither sends ${part} nor says why not`).toBe(true);
      expect(sent && reason !== undefined).toBe(false);
    });

    it('lists no setting or part of progress that does not exist, and no reason for nothing', () => {
      const known = new Set([...Object.keys(BEARS_ON), ...Object.keys(PROGRESS)]);
      for (const key of [...Object.keys(knows.settings), ...Object.keys(knows.progress), ...Object.keys(knows.notSent)]) expect(known.has(key), `${kind} names ${key}`).toBe(true);
    });

    it("every field it sends is in the grind's input schema", () => {
      const properties = inputSchema(kind).properties ?? {};
      for (const field of [...Object.values(knows.settings), ...Object.values(knows.progress)]) {
        expect(Object.keys(properties), `${kind} has no ${field.split('.')[0]}`).toContain(field.split('.')[0]);
      }
    });
  });

  it('every setting bible-talk is told is a setting it is sent', async () => {
    const sent = Object.keys(await currentSettings());
    expect(Object.keys(TUTOR_KNOWS['bible-talk'].settings).sort()).toEqual(sent.sort());
  });
});

describe('the builders send what the table says', () => {
  const verse = { n: 28, g: [{ t: 'οἴδαμεν' }], e: [{ t: 'We know' }] } as unknown as Verse;
  const grammar = learnerGrammarOf({
    goal: 'Read 1 John 1:1',
    words: { solid: 1, frontier: 1, notYet: 1 },
    ideas: [],
    placed: true,
    move: 'none',
    pickerLevel: 'frontier',
    approach: { name: 'BMA Tutor', credit: null, nextLesson: null },
  });
  const profile = { pace: 'steady' as const };
  const memory = { index: 'Likes a picture first.', notes: [{ name: 'book:Romans', text: 'Reads it slowly.' }] };
  const at = (request: Record<string, unknown>, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], request);

  it('verse-ask: every setting and part of progress the table lists is in the request', async () => {
    await setGreekPronunciation('modern');
    const settings = await settingsSentTo('verse-ask');
    const request = buildRequest('Romans 8:28', verse, 'What is this?', ['θεός'], 'solid 1 words', grammar, settings, [{ summary: 's', status: 'building' }] as never, profile, false, 'modern', memory, undefined, [{ kind: 'word', id: 'λόγος', title: 'λόγος', why: 'slipped this week' }]) as unknown as Record<string, unknown>;
    const knows = TUTOR_KNOWS['verse-ask'];
    for (const key of Object.keys(knows.settings)) expect(at(request, knows.settings[key]), `verse-ask request lacks ${key} at ${knows.settings[key]}`).toBeDefined();
    for (const part of Object.keys(knows.progress)) expect(at(request, knows.progress[part]), `verse-ask request lacks ${part} at ${knows.progress[part]}`).toBeDefined();
  });

  it('verse-read: every setting and part of progress the table lists is in the request', () => {
    const request = buildReadingRequest('Romans 8:28', verse, 'greek', 'el', profile, 'solid 1 words', grammar, 'modern', memory) as unknown as Record<string, unknown>;
    const knows = TUTOR_KNOWS['verse-read'];
    for (const key of Object.keys(knows.settings)) expect(at(request, knows.settings[key]), `verse-read request lacks ${key}`).toBeDefined();
    for (const part of Object.keys(knows.progress)) expect(at(request, knows.progress[part]), `verse-read request lacks ${part}`).toBeDefined();
  });

  it('tips: every part of progress the table lists is in the request', () => {
    const summary = { settings_changed: [], settings_never: [] } as never;
    const request = buildTipRequest(summary, [], profile, 'solid 1 words', grammar, memory) as unknown as Record<string, unknown>;
    const knows = TUTOR_KNOWS.tips;
    for (const part of Object.keys(knows.progress)) expect(at(request, knows.progress[part]), `tips request lacks ${part}`).toBeDefined();
    for (const key of Object.keys(knows.settings)) expect(at(request, knows.settings[key]), `tips request lacks ${key}`).toBeDefined();
  });

  it('settingsSentTo gives the value each listed setting holds now, and a Greek pronunciation reaches verse-ask and verse-read', async () => {
    const settings = await settingsSentTo('verse-ask');
    const wanted = Object.values(TUTOR_KNOWS['verse-ask'].settings).filter((f) => f.startsWith('settings.')).map((f) => f.slice('settings.'.length));
    expect(Object.keys(settings).sort()).toEqual(wanted.sort());
    expect(Object.values(TUTOR_KNOWS['verse-ask'].settings)).toContain('pronunciation');
    expect(Object.values(TUTOR_KNOWS['verse-read'].settings)).toContain('pronunciation');
  });
});
