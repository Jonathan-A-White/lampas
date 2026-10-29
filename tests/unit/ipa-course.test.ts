// The optional course 'Learn the IPA sounds' (mw-5r3p30.356, src/ipa/): every standard sound the Greek scheme uses has a lesson (symbol, the accent's key word,
// the Greek letters, a Greek word the voice says), is drilled both ways with its confusable partner, and a miss comes back until it is right twice; the pass
// check asks every sound both ways with no hints; nothing outside the Optional entry on the Goal screen ever points to the course.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkResult, courseSounds, courseAccent, PASS_FRACTION, passCheckQuestions } from '../../src/ipa/course';
import { answerDrill, buildQuestion, currentQuestion, drawRound, isRoundOver, startRound, type DrillItem } from '../../src/ipa/drill';
import { learnedOf, noteAnswer, markLearned, solidOf, START_PROGRESS, parseProgress } from '../../src/ipa/progress';
import { LADDER, ALWAYS_NEEDED } from '../../src/data/grammar/ladder';
import { approachOf, DEFAULT_APPROACH, orderOf } from '../../src/approaches';
import { mulberry32 } from '../../src/data/random';
import { ACCENTS, accentOf, AMERICAN_ID } from '../../src/speech/accents';
import { pronunciationOf, type Pronunciation } from '../../src/speech/pronunciation';
import { CONFUSABLE, SOUND_IDS, type SoundId } from '../../src/speech/sounds';
import '../support/grinds-in-graph';

const modern = pronunciationOf('modern');
const american = accentOf('american');
const used = (scheme: Pronunciation): SoundId[] => [...new Set(Object.values(scheme.sounds))];

describe('the course covers every standard sound the Greek scheme uses', () => {
  it('has one lesson for each, with the symbol, the key word, the Greek letters and a word the voice says', () => {
    const sounds = courseSounds(modern, american);
    expect(sounds.map((s) => s.id).sort()).toEqual(used(modern).sort());
    for (const s of sounds) {
      expect(s.id, 'the symbol is the sound\'s standard id').toMatch(/^\/.+\/$/);
      expect(s.keyWord, s.id).not.toBe('');
      expect(s.choice, s.id).not.toBe('');
      expect(s.letters.length, s.id).toBeGreaterThan(0);
      expect(s.word, s.id).toMatch(/\p{Script=Greek}/u);
    }
  });

  it('fails when the scheme writes a sound the course has no lesson for', () => {
    const extra: Pronunciation = { ...modern, id: 'extra', sounds: { ...modern.sounds, zz: '/ɡ/' }, soundGuide: { ...modern.soundGuide, '/ɡ/': undefined } };
    expect(() => courseSounds(extra, american)).toThrow(/\/ɡ\//);
  });

  it("holds each lesson's word to the scheme: the word starts with, or has, the sound it teaches, and none of the sound's confusable partners", () => {
    for (const s of courseSounds(modern, american)) {
      const heard = modern.spellings!(s.word).map((u) => modern.sounds[u.sound]);
      expect(heard, `${s.id} ${s.word}`).toContain(s.id);
      if (s.at === 'start') expect(heard[0], `${s.id} ${s.word}`).toBe(s.id);
      for (const partner of CONFUSABLE[s.id] ?? []) expect(heard, `${s.id} ${s.word} has ${partner}`).not.toContain(partner);
    }
  });

  it('keeps every sound\'s key word apart from every other\'s, in each accent, so a choice is one sound', () => {
    for (const accent of ACCENTS.filter((a) => a.id !== 'ipa')) {
      const choices = courseSounds(modern, accent).map((s) => s.choice);
      expect(new Set(choices).size, accent.id).toBe(choices.length);
    }
  });

  it('shows the key words of American English when IPA is the chosen accent, since IPA has none', () => {
    expect(courseAccent(accentOf('ipa')).id).toBe(AMERICAN_ID);
    expect(courseAccent(accentOf('british')).id).toBe('british');
  });

  it('names a confusable partner both ways, only for sounds the inventory has', () => {
    for (const [id, partners] of Object.entries(CONFUSABLE)) {
      expect(SOUND_IDS).toContain(id);
      for (const p of partners ?? []) {
        expect(SOUND_IDS).toContain(p);
        expect(CONFUSABLE[p as SoundId], `${p} should name ${id}`).toContain(id);
      }
    }
    for (const [a, b] of [['/x/', '/ç/'], ['/ɣ/', '/ʝ/'], ['/θ/', '/ð/']] as const) expect(CONFUSABLE[a]).toContain(b);
  });
});

describe('a question', () => {
  const sounds = courseSounds(modern, american);
  const all = sounds.map((s) => s.id);

  it('hear: the voice says the lesson\'s word and the choices are symbols; see: the symbol is shown and the choices are key words', () => {
    const hear = buildQuestion('/x/', 'hear', all, mulberry32(1), sounds, modern);
    expect(hear.say).toBe(sounds.find((s) => s.id === '/x/')!.word);
    expect(hear.options.map((o) => o.label)).toEqual(hear.options.map((o) => o.id));
    expect(hear.right).toBe('/x/');
    const see = buildQuestion('/x/', 'see', all, mulberry32(1), sounds, modern);
    expect(see.symbol).toBe('/x/');
    expect(see.say).toBeUndefined();
    const key = sounds.find((s) => s.id === '/x/')!.choice;
    expect(see.options.find((o) => o.id === '/x/')!.label).toBe(key);
  });

  it('puts the confusable partner among the choices when it is in the pool', () => {
    for (const [a, b] of [['/x/', '/ç/'], ['/ɣ/', '/ʝ/'], ['/θ/', '/ð/']] as const) {
      for (const direction of ['hear', 'see'] as const) {
        for (let seed = 1; seed <= 5; seed++) {
          expect(buildQuestion(a, direction, all, mulberry32(seed), sounds, modern).options.map((o) => o.id), `${a} ${direction} ${seed}`).toContain(b);
        }
      }
    }
  });

  it('has the right choice once, four choices when the pool allows, and never a sound the heard word also has', () => {
    for (const id of all) {
      const q = buildQuestion(id, 'hear', all, mulberry32(7), sounds, modern);
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.id === id)).toHaveLength(1);
      const inWord = new Set(modern.spellings!(q.say!).map((u) => modern.sounds[u.sound]));
      for (const o of q.options) if (o.id !== id) expect(inWord.has(o.id), `${id}: ${o.id} is in ${q.say}`).toBe(false);
    }
    expect(buildQuestion('/a/', 'see', ['/a/', '/e/'], mulberry32(1), sounds, modern).options).toHaveLength(2);
  });
});

describe('a drill round', () => {
  const sounds = courseSounds(modern, american);
  const pool: SoundId[] = ['/x/', '/ç/', '/a/', '/e/', '/ɣ/'];

  it('asks each sound both ways and keeps a confusable pair together', () => {
    const round = drawRound(pool, () => 0, mulberry32(3));
    expect(round).toHaveLength(pool.length * 2);
    for (const id of pool) for (const direction of ['hear', 'see'] as const) expect(round.some((i) => i.sound === id && i.direction === direction)).toBe(true);
    const at = (id: SoundId, direction: string) => round.findIndex((i) => i.sound === id && i.direction === direction);
    expect(Math.abs(at('/x/', 'hear') - at('/ç/', 'hear'))).toBe(1);
    expect(Math.abs(at('/x/', 'see') - at('/ç/', 'see'))).toBe(1);
  });

  it('takes the weakest sounds first when the pool is bigger than a round, and their partners with them', () => {
    const weak = new Set<SoundId>(['/a/', '/m/']);
    const round = drawRound(sounds.map((s) => s.id), (id) => (weak.has(id) ? 0 : 5), mulberry32(3), 2);
    expect(new Set(round.map((i) => i.sound))).toEqual(new Set(['/a/', '/m/', '/n/']));
    expect(round).toHaveLength(6);
  });

  const finish = (start: readonly DrillItem[], rightAt: (n: number, item: DrillItem) => boolean) => {
    let state = startRound(start);
    const asked: { item: DrillItem; right: boolean }[] = [];
    for (let n = 0; !isRoundOver(state) && n < 200; n++) {
      const item = currentQuestion(state)!;
      const right = rightAt(n, item);
      asked.push({ item, right });
      state = answerDrill(state, right);
    }
    return { state, asked };
  };

  it('ends once each item is right when none is missed', () => {
    const items = drawRound(pool, () => 0, mulberry32(3));
    const { state, asked } = finish(items, () => true);
    expect(isRoundOver(state)).toBe(true);
    expect(asked).toHaveLength(items.length);
    expect(state.missed).toEqual([]);
  });

  it('brings a wrong answer back until it is right twice running', () => {
    const items = drawRound(pool, () => 0, mulberry32(3));
    const first = items[0];
    // the first question is missed the first time it is asked, then answered right
    const { asked, state } = finish(items, (n) => n !== 0);
    const again = asked.filter((a) => a.item.sound === first.sound && a.item.direction === first.direction);
    expect(again.map((a) => a.right)).toEqual([false, true, true]);
    expect(state.missed).toEqual([`${first.sound}:${first.direction}`]);
    expect(asked).toHaveLength(items.length + 2);
  });

  it('starts the count again when a missed item is missed again', () => {
    const items = drawRound(pool, () => 0, mulberry32(3));
    const first = items[0];
    let times = 0;
    const { asked } = finish(items, (_, item) => {
      if (item.sound !== first.sound || item.direction !== first.direction) return true;
      times += 1;
      return times >= 3;
    });
    expect(asked.filter((a) => a.item.sound === first.sound && a.item.direction === first.direction).map((a) => a.right)).toEqual([false, false, true, true]);
  });

  it('brings the missed item back soon, not at the very end', () => {
    const items = drawRound(pool, () => 0, mulberry32(3));
    const first = items[0];
    let state = startRound(items);
    state = answerDrill(state, false);
    const soon = state.queue.slice(0, 4).some((i) => i.sound === first.sound && i.direction === first.direction);
    expect(soon).toBe(true);
  });
});

describe('the pass check', () => {
  const sounds = courseSounds(modern, american);

  it('asks every sound both ways, once each, shuffled, with no hints', () => {
    const questions = passCheckQuestions(sounds, mulberry32(11), modern);
    expect(questions).toHaveLength(sounds.length * 2);
    for (const s of sounds) for (const d of ['hear', 'see'] as const) expect(questions.filter((q) => q.sound === s.id && q.direction === d)).toHaveLength(1);
    for (const q of questions) expect(q).not.toHaveProperty('hint');
    expect(questions.map((q) => q.sound)).not.toEqual(questions.map((q) => q.sound).sort());
  });

  it('passes at PASS_FRACTION and names the symbols that were missed, either way', () => {
    const questions = passCheckQuestions(sounds, mulberry32(11), modern);
    const allRight = checkResult(questions.map((q) => ({ sound: q.sound, direction: q.direction, right: true })));
    expect(allRight).toMatchObject({ passed: true, rights: questions.length, total: questions.length, toPractise: [] });
    const missTwo = checkResult(questions.map((q, i) => ({ sound: q.sound, direction: q.direction, right: i > 1 })));
    expect(missTwo.passed).toBe(true);
    expect(missTwo.toPractise).toHaveLength(2);
    const many = Math.ceil(questions.length * (1 - PASS_FRACTION)) + 3;
    const fail = checkResult(questions.map((q, i) => ({ sound: q.sound, direction: q.direction, right: i >= many })));
    expect(fail.passed).toBe(false);
    expect(fail.toPractise.length).toBeGreaterThan(0);
    for (const id of fail.toPractise) expect(SOUND_IDS).toContain(id);
  });
});

describe('progress kept on the device', () => {
  it('starts empty, learns a sound once, and counts a sound solid once it is right twice running both ways', () => {
    expect(learnedOf(START_PROGRESS)).toEqual([]);
    let p = markLearned(markLearned(START_PROGRESS, '/a/'), '/a/');
    expect(learnedOf(p)).toEqual(['/a/']);
    expect(solidOf(p)).toEqual([]);
    p = noteAnswer(noteAnswer(p, '/a/', 'hear', true), '/a/', 'hear', true);
    expect(solidOf(p)).toEqual([]);
    p = noteAnswer(noteAnswer(p, '/a/', 'see', true), '/a/', 'see', true);
    expect(solidOf(p)).toEqual(['/a/']);
    p = noteAnswer(p, '/a/', 'see', false);
    expect(solidOf(p)).toEqual([]);
  });

  it('is read back from its saved text, and a damaged text reads as a fresh start', () => {
    const p = noteAnswer(markLearned(START_PROGRESS, '/x/'), '/x/', 'hear', true);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
    expect(parseProgress('not json')).toEqual(START_PROGRESS);
    expect(parseProgress(JSON.stringify({ learned: ['/nope/', '/x/'], streak: { '/x/:hear': 'many' } }))).toEqual(markLearned(START_PROGRESS, '/x/'));
  });
});

describe('the main path never requires or counts the course', () => {
  it('has no idea, need or lesson of the ladder or its approach for it', () => {
    expect(LADDER.filter((i) => /^ipa(-|$)|\bIPA\b/.test(`${i.id} ${i.title}`))).toEqual([]);
    expect([...ALWAYS_NEEDED].filter((id) => /^ipa(-|$)/.test(id))).toEqual([]);
    expect(orderOf(approachOf(DEFAULT_APPROACH)!).filter((id) => /^ipa(-|$)/.test(id))).toEqual([]);
  });
});

describe('nothing but the Optional entry points to the course', () => {
  // the files that may name the course: its own folder, the route, the entry on the Goal screen and what the app tells the tutor of a screen
  const ALLOWED = [/^src\/ipa\//, /^src\/GoalScreen\.tsx$/, /^src\/App\.tsx$/, /^src\/nav\/(route|lastRoute)\.ts$/, /^src\/tutor\/screen\.ts$/, /^src\/data\/repositories\/(ipaCourse|index)\.ts$/, /^src\/speech\//, /^src\/data\/grammar\/lessons\.ts$/, /^src\/settings\//];
  const files = execSync('git ls-files src grinds', { encoding: 'utf8' }).split('\n').filter((f) => /\.(ts|tsx|md|json)$/.test(f) && !f.startsWith('grinds/examples/'));

  it('names the course, or opens its address, in no other file of src/ or grinds/ (no nudge, badge, tip or tutor push)', () => {
    const naming = files.filter((f) => /Learn the IPA sounds|#\/ipa|openIpa|IpaCourse|ipaCourse/.test(readFileSync(f, 'utf8')));
    expect(naming.filter((f) => !ALLOWED.some((a) => a.test(f)))).toEqual([]);
  });

  it('draws the entry only in the Goal screen, under the Optional heading, after the main path', () => {
    const source = readFileSync('src/GoalScreen.tsx', 'utf8');
    expect(source.match(/<OptionalEntry\b/g)).toHaveLength(2);
    const body = source.slice(source.indexOf('function GoalBody'));
    expect(body.indexOf('<OptionalEntry')).toBeGreaterThan(body.indexOf('<WholePathButton'));
    expect(body.indexOf('<OptionalEntry')).toBeGreaterThan(body.indexOf('Read it'));
  });

  it('is not a Tips screen, and the tips grind is not told of it', () => {
    const summary = readFileSync('src/tips/summary.ts', 'utf8');
    expect(summary).not.toMatch(/ipa/i);
    for (const f of files.filter((x) => x.startsWith('src/tips/') || x.startsWith('grinds/tips'))) expect(readFileSync(f, 'utf8'), f).not.toMatch(/IPA sounds|#\/ipa/);
  });
});
