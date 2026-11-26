// What the tutor is told on Settings (mw-5r3p30.107): every setting's name, its value now and its help as shown, kept in the `screen` of the
// bible-talk request. The builder reads the stores; the request carries the result.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { NO_CHAPTER } from '../../src/data/chapter';
import { setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { isSermonSourceRow, isTalkable, ROWS, type SettingsRow } from '../support/settings';
import { settingsForTutor } from '../../src/settings/tutorSettings';
import { buildTalkRequest, fitHistory, MAX_REQUEST_BYTES, type TalkRequest, type TalkScope } from '../../src/services/talk';
import { fitScreen, MAX_SETTINGS, SETTING_HELP_MAX, SETTING_NAME_MAX, SETTING_VALUE_MAX, suggestionsFor } from '../../src/tutor/screen';

const SOURCES_LINE = 'Sermon sources';

afterAll(() => db.close());
beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('settingsForTutor', () => {
  it('names every setting and study resource of Settings with its value and its hint, and no link', async () => {
    const got = await settingsForTutor();
    const wanted = ROWS.filter((r) => isTalkable(r.key));
    // the sermon sources are one summary line, not a row each (mw-qtu3zvz.236)
    expect(got.map((s) => s.name).filter((n) => n !== SOURCES_LINE)).toEqual(wanted.map((r) => r.label));
    for (const row of wanted) expect(got.find((s) => s.name === row.label)?.help, row.key).toBe(row.hint);
    for (const s of got) expect(s.value, s.name).not.toBe('');
  });

  it('says whether a study resource is on, and follows the switch', async () => {
    const logos = async () => (await settingsForTutor()).find((s) => s.name === 'Logos');
    expect(await logos()).toEqual({ name: 'Logos', value: 'Off', help: expect.stringContaining('Open in Logos') });
    await setResourceOn('logos', true);
    expect((await logos())?.value).toBe('On');
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
    const request = buildTalkRequest(scope, 'What would Logos give me?', [], []);
    expect(request.screen?.name).toBe('Settings');
    expect(request.screen?.settings).toEqual(settings);
    expect(JSON.stringify(request.screen)).toContain('Logos');
  });

  it('is within the size a request may weigh with a full history left to cut', async () => {
    const settings = await settingsForTutor();
    // the room the screen's settings may take of a request: the number is raised only by a story that spends the room (the settings are read from ROWS, none is named here); fitHistory cuts the history to make room
    expect(new TextEncoder().encode(JSON.stringify({ name: 'Settings', facts: [], settings })).length).toBeLessThan(9700);
  });
});

describe('the questions Settings suggests', () => {
  it('are about settings, one asks what Logos would give', () => {
    const questions = suggestionsFor('Settings');
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions.length).toBeLessThanOrEqual(3);
    expect(questions).toContain('What would Logos give me?');
  });
});

describe('a Settings talk across turns (mw-5r3p30.615)', () => {
  const size = (r: TalkRequest): number => new TextEncoder().encode(JSON.stringify(r)).length;
  const turn1 = { q: 'What are the pros and cons of each of the resources I have in logos to choose from here?', a: 'Here is how each Logos lexicon compares: BDAG is the standard lexicon of the New Testament.' };

  /** the Settings screen with every field a real ask carries: four pictures, setting values, resources, memory notes, requests and solid words */
  async function settingsRequest(turns: { q: string; a: string }[], note = 'n'.repeat(500)): Promise<TalkRequest> {
    const settings = await settingsForTutor();
    const scope: TalkScope = { title: 'Settings', chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: 'Settings', facts: [], settings }) };
    // ten app-setting values, as a real ask carries (mw-r9xo1pj.18): the sermon sources being one summary line (mw-qtu3zvz.236) and the cap at 10360 left this fixture about 495 bytes under MAX_REQUEST_BYTES with turn 1 kept; a story that adds a setting and trips it trims the settings' help or raises the cap, it does not cut this back
    const values = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`setting${i}`, 'value']));
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
    // the last three turns outlast every lesser field (mw-5r3p30.825), so the turns that go first are those before them
    const turns = [{ q: 'First question', a: 'First answer' }, { q: 'Second question', a: 'Second answer' }, { q: 'Third question', a: 'Third answer' }, { q: 'Fourth question', a: 'Fourth answer' }, turn1];
    const fitted = fitHistory(await settingsRequest(turns, 'n'.repeat(1400)));
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history.at(-1)?.q).toBe(turn1.q);
    expect(fitted.history.some((t) => t.q === 'First question')).toBe(false);
    expect(fitted.history.some((t) => t.q === 'Second question')).toBe(false);
    expect(fitted.history.map((t) => t.q)).toEqual(['Third question', 'Fourth question', turn1.q]);
  });

  it('drops his requests and memory notes before the newest turn when even that cannot fit', async () => {
    const request = await settingsRequest([turn1], 'n'.repeat(2500));
    const fitted = fitHistory({ ...request, history: [{ q: 'q'.repeat(150), a: 'a'.repeat(100) }] });
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history).toHaveLength(1);
    expect(fitted.requests ?? []).toEqual([]);
    expect(fitted.memory?.notes ?? []).toEqual([]);
    expect(fitted.memory?.index).toBe('He reads on his phone.');
  });
});

describe('the sermon sources (mw-qtu3zvz.236): one summary line, however many there are', () => {
  const SYNTHETIC = 40;
  const synthetic: SettingsRow[] = Array.from({ length: SYNTHETIC }, (_, i) => ({ key: `sermons.x${i}-logos`, label: `Sermons of preacher ${String(i).padStart(2, '0')} xx`, hint: 'The sermon list, if on: titles, passages, links into your Logos', section: 'sermons' }));
  const size = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;
  const sourceRows = (): readonly SettingsRow[] => ROWS.filter((r) => isSermonSourceRow(r));

  it('names how many are on and where they are set, and carries no sermons.<id> row', async () => {
    await db.settings.put({ key: 'sermons.spurgeon-ccel', value: 'on' });
    await db.settings.put({ key: 'sermons.henry-sermons', value: 'off' });
    await db.settings.put({ key: 'sermons.clarkson-works', value: 'off' }); // On to start (mw-qtu3zvz.280.16)
    const got = await settingsForTutor();
    const line = got.filter((s) => s.name === SOURCES_LINE);
    expect(line).toHaveLength(1);
    const total = sourceRows().length;
    expect(total).toBeGreaterThan(0);
    expect(line[0].value).toBe(`1 of ${total} on`);
    expect(line[0].help).toContain('Settings > Study resources > Sermons > Sermon sources');
    for (const row of sourceRows()) expect(got.some((s) => s.name === row.label), row.key).toBe(false);
  });

  it('weighs the same with 40 more Off sources: the Settings screen, and turn 1 of a Settings talk, inside MAX_REQUEST_BYTES', async () => {
    const screenOf = async () => fitScreen({ name: 'Settings', facts: [], settings: await settingsForTutor() });
    const talk = async () => {
      const scope: TalkScope = { title: 'Settings', chapter: NO_CHAPTER, verse: null, screen: await screenOf() };
      return fitHistory(buildTalkRequest(scope, 'Here are the others', [{ q: 'What does each give me?', a: 'Here is how each one compares.' }], ['λόγος'], {}, undefined, 'He has 40 solid words.'));
    };
    const before = { screen: size(await screenOf()), turn: size(await talk()) };
    const rows = ROWS as SettingsRow[];
    const at = rows.findIndex((r) => r.section === 'sermons');
    rows.splice(at, 0, ...synthetic);
    try {
      const after = { screen: size(await screenOf()), turn: size(await talk()) };
      // the count's digits ('1 of 15 on' becomes '1 of 55 on') are all that may differ
      expect(after.screen - before.screen).toBeLessThanOrEqual(2);
      expect(after.turn - before.turn).toBeLessThanOrEqual(2);
      expect(after.turn).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    } finally {
      for (const row of synthetic) rows.splice(rows.indexOf(row), 1);
    }
  });
});
