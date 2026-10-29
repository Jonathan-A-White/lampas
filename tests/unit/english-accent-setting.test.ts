// The reader's English accent as a setting (mw-5r3p30.353, his words: "can you have that as a setting American versus British ... make sure that the tutor
// knows setting ... whether it's American or British" and "the user is more advanced he knows the standard to be an option"): Settings > Greek pronunciation
// holds 'English accent' (American | British | IPA (the standard)), kept on the device; it sets the accent every 'as in' hint is said in, and every tutor
// grist carries it as `english_accent`, with the grinds' instructions saying to give sound examples and respellings for it.
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Verse } from '../../src/data/chapter';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaSound } from '../../src/data/grammar/lessons';
import { settingsForTutor } from '../../src/settings/tutorSettings';
import { buildReadingRequest } from '../../src/services/reading';
import { buildTalkRequest } from '../../src/services/talk';
import { englishAccentSetting } from '../../src/settings/definitions';
import { ROWS } from '../../src/settings/rows';
import { currentSettings, settingOf, writeSetting } from '../../src/settings/registry';
import { getSetting } from '../../src/settings/store';
import { ACCENTS, DEFAULT_ACCENT, accentOf, chooseAccent, chosenAccent, missingHints, soundWords } from '../../src/speech/accents';
import { PRONUNCIATIONS, pronunciationOf, soundRulesOf, tutorGuideOf } from '../../src/speech/pronunciation';
import { SOUND_IDS } from '../../src/speech/sounds';
import { TUTOR_KNOWS } from '../../src/tutor/knows';
import { startSpeechSettingsSync } from '../../src/speech/settingsSync';
import type { Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const modern = pronunciationOf('modern');

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});
afterEach(() => chooseAccent(DEFAULT_ACCENT));
afterAll(() => db.close());

describe('the setting', () => {
  it('is English accent: American by default, then British, then IPA (the standard), in Settings beside the Greek pronunciation', () => {
    const entry = settingOf('englishAccent');
    expect(entry?.label).toBe('English accent');
    expect(entry?.section).toBe('pronunciation');
    expect(entry?.allowed).toEqual({
      kind: 'choice',
      values: [
        { value: 'american', label: 'American' },
        { value: 'british', label: 'British' },
        { value: 'ipa', label: 'IPA (the standard)' },
      ],
    });
    expect(englishAccentSetting.default).toBe('american');
    const keys = ROWS.filter((r) => r.section === 'pronunciation').map((r) => r.key);
    expect(keys).toEqual(['pronunciation', 'pronunciationSeparate', 'greekPronunciation', 'hebrewPronunciation', 'englishAccent', 'ipaLesson']);
  });

  it('is kept on the device: it reads back what was written, and an unknown saved value reads as American', async () => {
    expect(await getSetting(englishAccentSetting)).toBe('american');
    await writeSetting('englishAccent', 'british');
    expect(await getSetting(englishAccentSetting)).toBe('british');
    expect((await db.settings.get('englishAccent'))?.value).toBe('british');
    await db.settings.put({ key: 'englishAccent', value: 'klingon' });
    expect(await getSetting(englishAccentSetting)).toBe('american');
  });

  it('changes the accent every hint is said in, at once, and back', async () => {
    const omicron = ideaOf('letter-omicron');
    expect(ideaSound(omicron, modern)).toBe('o, as in “or”, short');
    await writeSetting('englishAccent', 'british');
    expect(chosenAccent().id).toBe('british');
    expect(ideaSound(omicron, modern)).toBe('o, as in “lot”');
    await writeSetting('englishAccent', 'american');
    expect(ideaSound(omicron, modern)).toBe('o, as in “or”, short');
    await writeSetting('englishAccent', 'ipa');
    expect(ideaSound(omicron, modern)).toBe('o, /o/');
  });

  it('is loaded from the device at start', async () => {
    await db.settings.put({ key: 'englishAccent', value: 'british' });
    const stop = startSpeechSettingsSync();
    try {
      await new Promise<void>((resolve, reject) => {
        const until = performance.now() + 5000;
        const check = () => (chosenAccent().id === 'british' ? resolve() : performance.now() > until ? reject(new Error('never loaded')) : setTimeout(check, 10));
        check();
      });
    } finally {
      stop();
    }
  });
});

describe('IPA (the standard) is one more accent table', () => {
  const ipa = accentOf('ipa');

  it('is listed after American and British, with a hint for every standard sound, made from the inventory', () => {
    expect(ACCENTS.map((a) => a.id)).toEqual(['american', 'british', 'ipa']);
    expect(ipa.label).toBe('IPA (the standard)');
    expect(Object.keys(ipa.hints).sort()).toEqual([...SOUND_IDS].sort());
    for (const id of SOUND_IDS) expect(ipa.hints[id].word, id).toBeUndefined();
    for (const scheme of PRONUNCIATIONS) expect(missingHints(scheme, ipa)).toEqual([]);
  });

  it('shows the standard id where the other accents show a key word, through the same accessor', () => {
    const say = soundWords(modern, ipa);
    expect(say.keyed('o')).toBe('o, /o/');
    expect(say.asIn('o')).toBe('o, /o/');
    expect(say.choice('kh')).toBe('kh, /x/');
    expect(say.keyed('gh')).toBe('gh, /ɣ/');
  });

  it('shows no English key word in any rule or in the tutor guide', () => {
    const lines = [...soundRulesOf(modern, ipa).flatMap((rule) => rule.sides.flatMap((side) => [side.label, side.line])), tutorGuideOf(modern, ipa)].join('\n');
    expect(lines).toContain('/o/');
    expect(lines).not.toMatch(/as in /);
  });
});

describe('the tutor knows the accent', () => {
  const verse = { n: 28, g: [{ t: 'οἴδαμεν' }], e: [{ t: 'We know' }] } as unknown as Verse;
  const chapter = { verses: [] } as never;
  const scope = { title: 'Romans 8', chapter, verse: null };

  /** The grist each tutor grind is sent, built as the app builds it, with `id` chosen in Settings. */
  async function gristsWith(id: string): Promise<Record<string, Record<string, unknown>>> {
    await writeSetting('englishAccent', id);
    const all = await currentSettings();
    return {
      'bible-talk': buildTalkRequest(scope, 'Why?', [], [], all) as unknown as Record<string, unknown>,
      'verse-read': buildReadingRequest('Romans 8:28', verse, 'greek', 'el') as unknown as Record<string, unknown>,
    };
  }
  const at = (request: Record<string, unknown>, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], request);

  it.each(['american', 'british', 'ipa'])('every tutor grist carries the accent %s, where the table of what each grind is told says', async (id) => {
    for (const [kind, request] of Object.entries(await gristsWith(id))) {
      const field = TUTOR_KNOWS[kind as 'bible-talk' | 'verse-read'].settings.englishAccent;
      expect(field, `${kind} is not told the accent`).toBeDefined();
      expect(at(request, field), `${kind} at ${field}`).toBe(id);
    }
  });

  it('says the accent in the pronunciation guide it sends too', async () => {
    const { 'bible-talk': talk } = await gristsWith('british');
    expect(talk.pronunciation_guide).toContain('o as in lot');
    const { 'bible-talk': ipaTalk } = await gristsWith('ipa');
    expect(ipaTalk.pronunciation_guide).toContain('/o/');
  });

  it('is in the Settings screen request the tutor is sent on Settings', async () => {
    const settings = await settingsForTutor();
    expect(settings.find((s) => s.name === 'English accent')).toMatchObject({ value: 'American' });
  });

  it('is a field the grinds accept, and each is told to give sound examples and respellings for it', () => {
    const verseRead = JSON.parse(readFileSync('grinds/verse-read.input.schema.json', 'utf8')) as Schema;
    expect(((verseRead.properties ?? {}).english_accent as { enum?: string[] }).enum).toEqual(['american', 'british', 'ipa']);
    for (const [kind, name] of [['bible-talk', 'settings.englishAccent'], ['verse-read', 'english_accent']]) {
      const instructions = instructionsOf(kind);
      const line = instructions.split('\n').find((l) => l.startsWith(`- \`${name}\`:`));
      expect(line, `${kind} does not describe ${name}`).toBeDefined();
      expect(line).toMatch(/example/i);
      expect(line).toMatch(/respell/i);
      expect(line).toContain('`ipa`');
    }
  });

  it('is in the settings the Bible talk may change, so the tutor can switch it when he asks', () => {
    const answer = readFileSync('grinds/bible-talk.answer.schema.json', 'utf8');
    expect(answer).toContain('englishAccent');
  });
});
