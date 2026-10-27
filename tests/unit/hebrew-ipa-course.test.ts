// The optional course 'Learn the IPA sounds' for Hebrew (mw-gdcyf98.24, src/ipa/): the Israeli scheme gets a `soundGuide` (the Hebrew letters that make each sound and a Hebrew word the voice
// says), the sounds Greek has no use for join the standard (src/speech/sounds.ts), and the course, the drill, the pass check and the progress take a language. The Greek course is unchanged.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/random';
import { getIpaProgress, learnIpaSound, noteIpaAnswer, passIpaCheck, startIpaCourse } from '../../src/data/repositories';
import { courseScheme, courseSounds, passCheckQuestions } from '../../src/ipa/course';
import { buildQuestion } from '../../src/ipa/drill';
import { progressKeyOf } from '../../src/ipa/progress';
import { ACCENTS, accentOf } from '../../src/speech/accents';
import { missingHints } from '../../src/speech/accents';
import { pronunciationOf, hebrewPronunciationOf, type Pronunciation } from '../../src/speech/pronunciation';
import { CONFUSABLE, SOUND_IDS, type SoundId } from '../../src/speech/sounds';

const israeli = hebrewPronunciationOf();
const modern = pronunciationOf('modern');
const american = accentOf('american');
const used = (scheme: Pronunciation): SoundId[] => [...new Set(Object.values(scheme.sounds))];

describe('the Hebrew sounds in the standard', () => {
  it('adds the sounds Greek lacks (h, r, sh, ts, y) once, each hinted in every accent', () => {
    for (const id of ['/h/', '/ʁ/', '/ʃ/', '/ts/', '/j/'] as const) expect(SOUND_IDS, id).toContain(id);
    for (const accent of ACCENTS) expect(missingHints(israeli, accent), accent.id).toEqual([]);
    for (const accent of ACCENTS) for (const id of SOUND_IDS) expect(accent.hints[id], `${accent.id} ${id}`).toBeDefined();
  });

  it('maps the Israeli respelling symbols h, r, sh, ts and y to them', () => {
    expect(israeli.sounds).toMatchObject({ h: '/h/', r: '/ʁ/', sh: '/ʃ/', ts: '/ts/', y: '/j/', kh: '/x/' });
  });

  it('keeps the Greek scheme as it was: it writes none of them', () => {
    for (const id of ['/h/', '/ʁ/', '/ʃ/', '/ts/', '/j/'] as const) expect(used(modern)).not.toContain(id);
  });
});

describe('the Hebrew course lists every sound the Israeli scheme writes', () => {
  it('has one lesson for each: the symbol, the key word, Hebrew letters and a Hebrew word', () => {
    const sounds = courseSounds(israeli, american);
    expect(sounds.map((s) => s.id).sort()).toEqual(used(israeli).sort());
    for (const s of sounds) {
      expect(s.id).toMatch(/^\/.+\/$/);
      expect(s.keyWord, s.id).not.toBe('');
      expect(s.choice, s.id).not.toBe('');
      expect(s.letters.length, s.id).toBeGreaterThan(0);
      for (const letter of s.letters) expect(letter, s.id).toMatch(/[א-ת]/u);
      expect(s.word, s.id).toMatch(/[א-ת]/u);
    }
  });

  it("keeps every sound's key word apart from every other's, in each accent", () => {
    for (const accent of ACCENTS.filter((a) => a.id !== 'ipa')) {
      const choices = courseSounds(israeli, accent).map((s) => s.choice);
      expect(new Set(choices).size, accent.id).toBe(choices.length);
    }
  });

  it("holds each lesson's word to the scheme: it has the sound, at its start when it says so, and none of the sound's confusable partners", () => {
    for (const s of courseSounds(israeli, american)) {
      const heard = israeli.soundsIn!(s.word);
      expect(heard, `${s.id} ${s.word}`).toContain(s.id);
      if (s.at === 'start') expect(heard[0], `${s.id} ${s.word}`).toBe(s.id);
      for (const partner of CONFUSABLE[s.id] ?? []) expect(heard, `${s.id} ${s.word} has ${partner}`).not.toContain(partner);
    }
  });

  it('writes each letters entry as Hebrew letters (or a letter with a vowel point), then a plain note in English', () => {
    for (const s of courseSounds(israeli, american)) {
      for (const letter of s.letters) {
        const [hebrew, ...note] = letter.split(' ');
        expect(hebrew, `${s.id} ${letter}`).toMatch(/^[\u05B0-\u05C7\u05D0-\u05EA]*[\u05D0-\u05EA][\u05B0-\u05C7\u05D0-\u05EA]*$/u);
        expect(note.join(' '), `${s.id} ${letter}`).not.toMatch(/[\u0590-\u05FF]/u);
      }
    }
  });

  it('throws, naming the sound, when the scheme writes one the course has no lesson for', () => {
    const extra: Pronunciation = { ...israeli, id: 'extra', sounds: { ...israeli.sounds }, soundGuide: { ...israeli.soundGuide, '/ʃ/': undefined } };
    expect(() => courseSounds(extra, american)).toThrow(/\/ʃ\//);
  });

  it('picks the scheme of the language: Greek the chosen Greek one, Hebrew the chosen Hebrew one', () => {
    expect(courseScheme('grc').language ?? 'grc').toBe('grc');
    expect(courseScheme('he').id).toBe('israeli');
    expect(courseScheme().id).toBe(courseScheme('grc').id);
  });
});

describe('the Hebrew drill and pass check', () => {
  const sounds = courseSounds(israeli, american);
  const all = sounds.map((s) => s.id);

  it('asks every sound both ways in the pass check, once each', () => {
    const questions = passCheckQuestions(sounds, mulberry32(3), israeli);
    expect(questions).toHaveLength(sounds.length * 2);
    for (const s of sounds) for (const d of ['hear', 'see'] as const) expect(questions.filter((q) => q.sound === s.id && q.direction === d)).toHaveLength(1);
  });

  it('never offers, as a wrong choice of a hear question, a sound the heard word also has', () => {
    for (const id of all) {
      for (const seed of [1, 7, 20]) {
        const q = buildQuestion(id, 'hear', all, mulberry32(seed), sounds, israeli);
        const inWord = new Set(israeli.soundsIn!(q.say!));
        for (const o of q.options) if (o.id !== id) expect(inWord.has(o.id), `${id}: ${o.id} is in ${q.say}`).toBe(false);
        expect(q.options.filter((o) => o.id === id)).toHaveLength(1);
      }
    }
  });

  it('puts the confusable partner among the choices when it is in the pool', () => {
    for (const [a, b] of [['/s/', '/ʃ/'], ['/h/', '/x/'], ['/v/', '/f/']] as const) {
      for (const direction of ['hear', 'see'] as const) {
        expect(buildQuestion(a, direction, all, mulberry32(2), sounds, israeli).options.map((o) => o.id), `${a} ${direction}`).toContain(b);
      }
    }
  });
});

describe('the Greek course is as it was', () => {
  it('lists the same 31 sounds the Greek scheme writes, in the inventory\'s order, with Greek letters and words', () => {
    const sounds = courseSounds(modern, american);
    expect(sounds.map((s) => s.id)).toEqual(SOUND_IDS.filter((id) => used(modern).includes(id)));
    expect(sounds).toHaveLength(31);
    for (const s of sounds) expect(s.word).toMatch(/\p{Script=Greek}/u);
  });
});

describe("the progress is kept apart per language", () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  it('keeps Greek under its old key and Hebrew under its own', () => {
    expect(progressKeyOf()).toBe('ipaCourse');
    expect(progressKeyOf('grc')).toBe('ipaCourse');
    expect(progressKeyOf('he')).not.toBe('ipaCourse');
  });

  it("does not let a Hebrew start, card, answer or pass touch Greek's, nor Greek's Hebrew's", async () => {
    await startIpaCourse('he');
    await learnIpaSound('/ʃ/', 'he');
    await noteIpaAnswer('/ʃ/', 'hear', true, 'he');
    await passIpaCheck(5, 'he');
    expect(await getIpaProgress('grc')).toEqual({ started: false, learned: [], streak: {} });
    expect(await getIpaProgress('he')).toEqual({ started: true, learned: ['/ʃ/'], streak: { '/ʃ/:hear': 1 }, passedAt: 5 });
    await startIpaCourse();
    await learnIpaSound('/x/');
    expect((await getIpaProgress()).learned).toEqual(['/x/']);
    expect((await getIpaProgress('he')).learned).toEqual(['/ʃ/']);
    expect(await db.settings.get('ipaCourse')).toBeDefined();
    expect(await db.settings.get(progressKeyOf('he'))).toBeDefined();
  });
});
