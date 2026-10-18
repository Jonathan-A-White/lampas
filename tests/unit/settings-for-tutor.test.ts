// What the tutor is told on Settings (mw-5r3p30.107): every setting's name, its value now and its help as shown, kept in the `screen` of the
// bible-talk request. The builder reads the stores; the request carries the result.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { NO_CHAPTER } from '../../src/data/chapter';
import { setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ROWS } from '../../src/settings/rows';
import { settingsForTutor } from '../../src/settings/tutorSettings';
import { buildTalkRequest, fitHistory, MAX_REQUEST_BYTES, type TalkRequest, type TalkScope } from '../../src/services/talk';
import { fitScreen, MAX_SETTINGS, SETTING_HELP_MAX, SETTING_NAME_MAX, SETTING_VALUE_MAX, suggestionsFor } from '../../src/tutor/screen';

afterAll(() => db.close());
beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('settingsForTutor', () => {
  it('names every setting and study resource of Settings with its value and its hint, and no link', async () => {
    const got = await settingsForTutor();
    const wanted = ROWS.filter((r) => !r.key.startsWith('link.') && r.key !== 'developer');
    expect(got.map((s) => s.name)).toEqual(wanted.map((r) => r.label));
    for (const row of wanted) expect(got.find((s) => s.name === row.label)?.help, row.key).toBe(row.hint);
    for (const s of got) expect(s.value, s.name).not.toBe('');
  });

  it('says whether a study resource is on, and follows the switch', async () => {
    const accordance = async () => (await settingsForTutor()).find((s) => s.name === 'Accordance');
    expect(await accordance()).toEqual({ name: 'Accordance', value: 'Off', help: expect.stringContaining('Open in Accordance') });
    await setResourceOn('accordance', true);
    expect((await accordance())?.value).toBe('On');
  });

  it('gives a choice its label and a speed its number, as the screen shows them', async () => {
    const got = await settingsForTutor();
    expect(got.find((s) => s.name === 'Theme')?.value).toBe('Phone');
    expect(got.find((s) => s.name === 'Greek speed')?.value).toBe('1x');
    expect(got.find((s) => s.name === 'Goal')?.value).toBe('none');
  });

  it('fits the limits the input schema has', async () => {
    const got = await settingsForTutor();
    expect(got.length).toBeLessThanOrEqual(MAX_SETTINGS);
    for (const s of got) {
      expect(s.name.length).toBeLessThanOrEqual(SETTING_NAME_MAX);
      expect(s.value.length).toBeLessThanOrEqual(SETTING_VALUE_MAX);
      expect(s.help.length).toBeLessThanOrEqual(SETTING_HELP_MAX);
    }
  });
});

describe('the Settings request', () => {
  it('carries each setting in the screen field, after fitting', async () => {
    const settings = await settingsForTutor();
    const scope: TalkScope = { title: 'Settings', chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: 'Settings', facts: [], settings }) };
    const request = buildTalkRequest(scope, 'What would Accordance give me?', [], []);
    expect(request.screen?.name).toBe('Settings');
    expect(request.screen?.settings).toEqual(settings);
    expect(JSON.stringify(request.screen)).toContain('Accordance');
  });

  it('is within the size a request may weigh with a full history left to cut', async () => {
    const settings = await settingsForTutor();
    // raised with each setting the tutor is told (3200, 3500 with the English accent, 3700 with Handwriting drills, 3800 with Reading plan, 3950 with Font): fitHistory cuts the history to make room
    expect(new TextEncoder().encode(JSON.stringify({ name: 'Settings', facts: [], settings })).length).toBeLessThan(3950);
  });
});

describe('the questions Settings suggests', () => {
  it('are about settings, one asks what Accordance would give', () => {
    const questions = suggestionsFor('Settings');
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions.length).toBeLessThanOrEqual(3);
    expect(questions).toContain('What would Accordance give me?');
  });
});

describe('a Settings talk across turns (mw-5r3p30.615)', () => {
  const size = (r: TalkRequest): number => new TextEncoder().encode(JSON.stringify(r)).length;
  const turn1 = { q: 'What are the pros and cons of each of the resources I have in logos to choose from here?', a: 'Here is how each Logos lexicon compares: BDAG is the standard lexicon of the New Testament.' };

  /** the Settings screen with every field a real ask carries: four pictures, setting values, resources, memory notes, requests and solid words */
  async function settingsRequest(turns: { q: string; a: string }[], note = 'n'.repeat(500)): Promise<TalkRequest> {
    const settings = await settingsForTutor();
    const scope: TalkScope = { title: 'Settings', chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: 'Settings', facts: [], settings }) };
    const values = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`setting${i}`, 'value']));
    const resources = Array.from({ length: 6 }, (_, i) => ({ name: `Resource ${i}`, kind: 'lexicon', url: `https://example.org/${i}` })) as never;
    const memory = { index: 'He reads on his phone.', notes: [{ name: 'book:Romans', text: note }, { name: 'topic:goal', text: note }] };
    const requests = Array.from({ length: 4 }, (_, i) => ({ summary: `Idea ${i} ${'s'.repeat(150)}`, status: 'sent' })) as never;
    return buildTalkRequest(scope, 'Here are the others', turns, ['λόγος', 'ἀγάπη', 'πίστις'], values as never, undefined, 'He has 40 solid words.', undefined, [], resources, 4, { kept: '' }, undefined, requests, undefined, 'modern', false, memory);
  }

  it('a Settings talk keeps turn 1', async () => {
    const request = await settingsRequest([turn1]);
    expect(size(request)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(request);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history).toHaveLength(1);
    expect(fitted.history[0].q).toBe(turn1.q);
    expect(fitted.history[0].a).toContain('Here is how each Logos lexicon compares');
  });

  it('drops the oldest turns first and keeps the newest', async () => {
    const turns = [{ q: 'First question', a: 'First answer' }, { q: 'Second question', a: 'Second answer' }, turn1];
    const fitted = fitHistory(await settingsRequest(turns));
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history.at(-1)?.q).toBe(turn1.q);
    expect(fitted.history.some((t) => t.q === 'First question')).toBe(false);
  });

  it('drops his requests and memory notes before the newest turn when even that cannot fit', async () => {
    const request = await settingsRequest([turn1], 'n'.repeat(2500));
    const fitted = fitHistory({ ...request, history: [{ q: 'q'.repeat(300), a: 'a'.repeat(200) }] });
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history).toHaveLength(1);
    expect(fitted.requests ?? []).toEqual([]);
    expect(fitted.memory?.notes ?? []).toEqual([]);
    expect(fitted.memory?.index).toBe('He reads on his phone.');
  });
});
