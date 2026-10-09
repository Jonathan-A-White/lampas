// What the tutor is told on Settings (mw-5r3p30.107): every setting's name, its value now and its help as shown, kept in the `screen` of the
// bible-talk request. The builder reads the stores; the request carries the result.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { NO_CHAPTER } from '../../src/data/chapter';
import { setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ROWS } from '../../src/settings/rows';
import { settingsForTutor } from '../../src/settings/tutorSettings';
import { buildTalkRequest, type TalkScope } from '../../src/services/talk';
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
    expect(new TextEncoder().encode(JSON.stringify({ name: 'Settings', facts: [], settings })).length).toBeLessThan(3200);
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
