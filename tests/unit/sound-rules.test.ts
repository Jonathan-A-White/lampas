// The sound rules the reader applies are taught (mw-86e9r1.7): σ is z before a voiced consonant, αυ/ευ/ηυ are v or f by the next sound, and a breathing sits
// on the second vowel of a pair and before a capital; and 'Words that sound alike' (ἡμεῖς/ὑμεῖς, λύομεν/λύωμεν, λύει/λύῃ) says to trust the spelling.
// Each rule is stated with a New Testament example in the lesson of the chosen scheme, and each stated example is held to what the respeller says of it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { ideaText } from '../../src/data/grammar/lessons';
import { breathingOf, buildIdeaQuestion } from '../../src/data/grammar/questions';
import { SOUND_ALIKE } from '../../src/data/grammar/soundAlike';
import { mulberry32 } from '../../src/data/quiz';
import { registerPronunciation, pronunciationOf, type Pronunciation } from '../../src/speech/pronunciation';
import { MODERN, respellModern } from '../../src/speech/schemes/modern';

const modern = pronunciationOf('modern');
const nfc = (s: string): string => s.normalize('NFC');
const wordsIn = (book: string, chapter: number): string[] => (JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as Chapter).verses.flatMap((v) => v.g.map((w) => nfc(w.t)));

/** [lesson idea, the rule's example word, its place in the text, what respellModern says of it, the sound the rule gives]. */
const RESPELLED: [string, string, [string, number], string, string][] = [
  ['consonant-pairs', 'κόσμος', ['1jn', 2], 'KOZ-mos', 'z'],
  ['consonant-pairs', 'Ἰσραήλ', ['act', 2], 'eez-ra-EEL', 'z'],
  ['diphthongs', 'Παῦλος', ['1co', 1], 'PAV-los', 'v'],
  ['diphthongs', 'εὐαγγέλιον', ['1co', 15], 'ev-an-GHE-lee-on', 'v'],
  ['diphthongs', 'αὐτός', ['1jn', 1], 'af-TOS', 'f'],
  ['diphthongs', 'εὐθύς', ['jhn', 21], 'ef-THEES', 'f'],
];

describe('the sound rules the Modern Greek lessons teach, each held to the respeller', () => {
  it.each(RESPELLED)('%s states %s as “%s”, and the respeller agrees', (id, word, [book, chapter], said, sound) => {
    expect(respellModern(word), word).toBe(said);
    expect(wordsIn(book, chapter), `${word} is in ${book} ${chapter}`).toContain(nfc(word));
    const text = ideaText(ideaOf(id), modern);
    expect(text, `${id} names ${word}`).toContain(word);
    expect(text, `${id} spells ${word} as ${said}`).toContain(`“${said}”`);
    expect(said.toLowerCase(), word).toContain(sound);
  });

  it('teaches σ as z before β γ δ ζ λ μ ν ρ and s elsewhere, with a key word, and the respeller does it', () => {
    const text = ideaText(ideaOf('consonant-pairs'), modern);
    expect(text).toMatch(/σ[^.]*before β, γ, δ, ζ, λ, μ, ν or ρ[^.]*z as in zoo/);
    for (const next of 'βγδζλμν' + 'ρ') expect(respellModern(`ασ${next}α`).replace(/-/g, ''), `σ before ${next}`).toContain('z');
    for (const next of 'κπτθφχξψ') expect(respellModern(`ασ${next}α`).replace(/-/g, ''), `σ before ${next}`).not.toContain('z');
    expect(respellModern('σαρξ'), 'σ at the start').toBe('sarks');
  });

  it('teaches αυ, ευ and ηυ as v before a vowel or β γ δ ζ λ μ ν ρ and f before any other letter or at the end, with key words, and the respeller does it', () => {
    const text = ideaText(ideaOf('diphthongs'), modern);
    expect(text).toMatch(/v as in vase[^.]*before a vowel or β, γ, δ, ζ, λ, μ, ν or ρ/);
    expect(text).toMatch(/f as in fan[^.]*before any other letter or at the end/);
    for (const pair of ['αυ', 'ευ', 'ηυ']) {
      for (const next of 'αεηιουωβγδζλμνρ') expect(respellModern(`${pair}${next}`).replace(/-/g, ''), `${pair} before ${next}`).toMatch(/v/);
      for (const next of 'κπτθφχξψσ') expect(respellModern(`${pair}${next}`).replace(/-/g, ''), `${pair} before ${next}`).toMatch(/f/);
      expect(respellModern(pair), `${pair} at the end`).toMatch(/f$/);
    }
  });

  it('does not teach the σ or αυ/ευ sound rules in a scheme that does not hold them', () => {
    const erasmian: Pronunciation = { ...MODERN, id: 'rule-less', label: 'Rule-less', lessons: undefined };
    for (const id of ['consonant-pairs', 'diphthongs']) {
      const text = ideaText(ideaOf(id), erasmian);
      expect(text, id).not.toMatch(/\bz as in|v as in|f as in|κόσμος|Παῦλος|αὐτός/);
    }
  });
});

/** The breathing mark and the NFD letter it sits on (0-based, counting a letter with its marks as one). */
function breathingAt(word: string): { mark: 'Rough' | 'Smooth' | undefined; letter: number } {
  const letters = [...word.normalize('NFD')].reduce<string[]>((all, c) => {
    if (/\p{M}/u.test(c) && all.length > 0) all[all.length - 1] += c;
    else all.push(c);
    return all;
  }, []);
  return { mark: breathingOf(word), letter: letters.findIndex((l) => /[̓̔]/.test(l)) };
}

describe('where a breathing sits', () => {
  // [word, text, the breathing, the letter it sits on, whether the word begins with a capital]
  const PLACES: [string, [string, number], 'Rough' | 'Smooth', number, boolean][] = [
    ['οὗτος', ['act', 10], 'Rough', 1, false],
    ['αὐτός', ['1jn', 1], 'Smooth', 1, false],
    ['Ἰησοῦς', ['1jn', 2], 'Smooth', 0, true],
    ['Οὗτος', ['act', 1], 'Rough', 1, true],
  ];

  it.each(PLACES)('%s has its breathing where the rule says, and the respeller says nothing of it', (word, [book, chapter], mark, letter, capital) => {
    expect(wordsIn(book, chapter), `${word} is in ${book} ${chapter}`).toContain(nfc(word));
    expect(breathingAt(word)).toEqual({ mark, letter });
    expect(/^\p{Lu}/u.test(word)).toBe(capital);
    // the breathing is silent: the word is said as it is without it
    const bare = word.normalize('NFD').replace(/[̓̔]/g, '').normalize('NFC');
    expect(respellModern(word), word).toBe(respellModern(bare));
  });

  it('states both rules, in the Breathing marks lesson of every scheme and with the examples', () => {
    for (const scheme of [modern, { ...MODERN, id: 'bare', label: 'Bare', lessons: undefined } as Pronunciation]) {
      const text = ideaText(ideaOf('breathings'), scheme);
      expect(text, scheme.id).toMatch(/second vowel of a pair/);
      expect(text, scheme.id).toMatch(/before a capital/i);
      for (const word of ['οὗτος', 'αὐτός', 'Ἰησοῦς']) expect(text, `${scheme.id} ${word}`).toContain(word);
    }
  });
});

describe('Words that sound alike', () => {
  const idea = LADDER.find((i) => i.id === 'words-sound-alike');

  it('is on the ladder among the marks, after the iota under a letter and resting on the pairs of vowels', () => {
    expect(idea).toBeDefined();
    expect(idea!.title).toBe('Words that sound alike');
    expect(idea!.tier).toBe('marks');
    expect(idea!.needs).toEqual(expect.arrayContaining(['diphthongs', 'iota-subscript']));
    for (const need of idea!.needs) expect(ideaOf(need).rung).toBeLessThan(idea!.rung);
  });

  it('holds the three pairs', () => {
    expect(SOUND_ALIKE.map((p) => [p.a.word, p.b.word])).toEqual([['ἡμεῖς', 'ὑμεῖς'], ['λύομεν', 'λύωμεν'], ['λύει', 'λύῃ']].map((p) => p.map(nfc)));
  });

  it('is told apart by spelling only: the Modern Greek respeller says each pair alike, and the lesson says trust the spelling', () => {
    const text = ideaText(idea!, modern);
    for (const pair of SOUND_ALIKE) {
      expect(respellModern(pair.a.word), pair.a.word).toBe(respellModern(pair.b.word));
      for (const w of [pair.a, pair.b]) {
        expect(text, w.word).toContain(w.word);
        expect(text, w.gloss).toContain(`“${w.gloss}”`);
      }
      expect(text, pair.a.word).toContain(`“${respellModern(pair.a.word)}”`);
    }
    expect(text).toMatch(/trust the spelling/i);
  });

  it('teaches nothing about how it sounds in a scheme that has no lesson for it, only that the spelling tells them apart', () => {
    const bare: Pronunciation = { ...MODERN, id: 'bare', label: 'Bare', lessons: undefined };
    const text = ideaText(idea!, bare);
    expect(text).not.toMatch(/Modern Greek|“ee-MEES”|“LEE-o-men”/);
    expect(text).toMatch(/spelling/);
  });

  it('gives each pair a New Testament example of its own kind of difference', () => {
    for (const pair of SOUND_ALIKE) {
      for (const w of [pair.a, pair.b]) {
        expect(wordsIn(w.nt.ref.book, w.nt.ref.chapter), `${w.nt.word} in ${w.nt.ref.book} ${w.nt.ref.chapter}`).toContain(nfc(w.nt.word));
      }
    }
  });

  it('asks a hear-and-pick question per pair whose twin is always among the four choices, and says the pair sounds the same', () => {
    const asked = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const q = buildIdeaQuestion(idea!, [], mulberry32(seed), modern.respell, modern);
      expect(q.ideaId).toBe('words-sound-alike');
      expect(q.say, 'the word is spoken').toBe(q.right);
      expect(q.kind, 'said as a word, not spelt as a letter').toBe('letter');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
      const pair = SOUND_ALIKE.find((p) => [p.a.word, p.b.word].includes(nfc(q.right)))!;
      const twin = nfc(q.right) === pair.a.word ? pair.b.word : pair.a.word;
      expect(q.options.map(nfc), `${q.right} among ${q.options.join(' ')}`).toContain(twin);
      // the ear cannot decide between the right word and its twin
      expect(respellModern(q.right)).toBe(respellModern(twin));
      expect(q.prompt).toMatch(/spelt/);
      expect(q.prompt, 'the prompt asks by meaning').toContain('“');
      asked.add(pair.a.word);
    }
    expect(asked.size).toBe(3);
  });

  it('asks it by the same words in a scheme that says the pair differently, and says nothing of sounding alike', () => {
    const apart: Pronunciation = { ...MODERN, id: 'apart', label: 'Apart', respell: (w) => `<${w}>`, lessons: undefined };
    const unregister = registerPronunciation(apart);
    try {
      for (let seed = 1; seed <= 30; seed += 1) {
        const q = buildIdeaQuestion(idea!, [], mulberry32(seed), apart.respell, apart);
        expect(q.prompt).not.toMatch(/same|alike/i);
        expect(q.options).toHaveLength(4);
      }
    } finally {
      unregister();
    }
  });
});
