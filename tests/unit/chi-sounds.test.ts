// χ has two sounds, by what follows it (mw-5r3p30.648, his words about ἀρχῇ: 'the speakers sound makes a CH instead of an h e e'). The respelling's
// sound for every χ, the sound of the Greek the voice is handed for it, and what the χ sheet says must be one and the same: kh before α, ο, ω, ου or a
// consonant, hy before ε, η, ι, υ, αι, ει, οι (and ευ, ηυ, υι). The voice side is read here from the letters the voice is handed, by Greek's own rule and
// not by the scheme's, so a form that took the front vowel away from a χ (or put one before it) would fail.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { ideaOf } from '../../src/data/grammar/ladder';
import { soundLesson } from '../../src/data/grammar/lessons';
import { pronunciationOf, soundRuleOf } from '../../src/speech/pronunciation';
import { respellModern } from '../../src/speech/schemes/modern';

const modern = pronunciationOf('modern');
const bare = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** A word as its letters, each a base letter with its marks: 'οϊ' is two, the second with a diaeresis. */
const lettersOf = (text: string): { ch: string; marks: string }[] =>
  [...text.normalize('NFD').toLowerCase().replace(/ς/gu, 'σ')].reduce<{ ch: string; marks: string }[]>((out, c) => {
    if (/\p{M}/u.test(c) && out.length > 0) out[out.length - 1].marks += c;
    else out.push({ ch: c, marks: '' });
    return out;
  }, []);

/** Whether the letters at `at` are a front vowel as Greek says it: ε η ι υ, or the pair αι or οι (never split by a diaeresis, never with the first letter stressed). */
function frontAt(letters: { ch: string; marks: string }[], at: number): boolean {
  const a = letters[at];
  const b = letters[at + 1];
  if (!a) return false;
  if ('εηιυ'.includes(a.ch)) return true;
  return 'αο'.includes(a.ch) && b?.ch === 'ι' && !/[\u0300\u0301\u0342]/u.test(a.marks) && !b.marks.includes('\u0308');
}

/** The sounds of each χ in `text` as Greek says it: 'hy' before a front vowel, else 'kh'. A γχ is left out (its own rule, below). */
function chiSounds(text: string): string[] {
  const letters = lettersOf(text);
  return letters.flatMap((l, i) => (l.ch === 'χ' && letters[i - 1]?.ch !== 'γ' ? [frontAt(letters, i + 1) ? 'hy' : 'kh'] : []));
}

/** The sounds the respelling writes for the χ of `word` that has no γ before it. */
const respelled = (word: string): string[] => {
  const rule = soundRuleOf(modern, 'letter-chi')!;
  const side = rule.sideOf(word);
  return side === null ? [] : [side === 'soft' ? 'hy' : 'kh'];
};

/** What the voice is handed for a word said alone (Tap to hear, a speaker). */
const handed = (word: string): string => modern.wordForm!(word.toLowerCase());

const ROOT = 'public/data';
const FORMS = [
  ...new Set(
    readdirSync(ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'ladder')
      .flatMap((d) => readdirSync(`${ROOT}/${d.name}`).map((f) => JSON.parse(readFileSync(`${ROOT}/${d.name}/${f}`, 'utf8')) as Chapter))
      .flatMap((c) => c.verses.flatMap((v) => v.g.flatMap((g) => [g.t.normalize('NFC'), g.l.normalize('NFC')]))),
  ),
].filter((w) => w.includes('χ') || w.includes('Χ'));

describe('χ before a front vowel', () => {
  it('ἀρχῇ: the respelling and what the voice is handed both name the soft sound', () => {
    expect(respellModern('ἀρχῇ')).toBe('ar-HYEE');
    expect(respelled('ἀρχῇ')).toEqual(['hy']);
    // the voice is handed the word with its χ still before the η (the iota under it is dropped, the η and its tonos are kept)
    expect(handed('ἀρχῇ')).toBe('αρχή!');
    expect(chiSounds(handed('ἀρχῇ'))).toEqual(['hy']);
  });

  it('every word of the text with a χ: the respelling, the form handed to the voice and the word itself name the same sound', () => {
    let checked = 0;
    const mixed: string[] = [];
    for (const word of FORMS) {
      const wanted = chiSounds(word);
      expect(chiSounds(handed(word)), `${word} handed to the voice as ${handed(word)}`).toEqual(wanted);
      if (wanted.length === 0) continue;
      if (new Set(wanted).size === 2) {
        mixed.push(word);
        continue;
      }
      // every χ of the word has one sound: the scheme's rule names that side for the word
      expect(respelled(word), `${word} respelt as ${respellModern(word)}`).toEqual([wanted[0]]);
      checked += wanted.length;
    }
    expect(checked).toBeGreaterThan(1000);
    // a word with both sounds has no one side: the respelling must write one of each, in order
    for (const word of mixed) {
      const written = [...respellModern(word).matchAll(/kh|hy/gu)].map((m) => m[0]);
      expect(written, word).toEqual(chiSounds(word));
    }
  });

  it('γχ: the pair rule agrees with the voice form, word by word', () => {
    const rule = soundRuleOf(modern, 'pair-gch')!;
    const words = FORMS.filter((w) => bare(w).includes('γχ'));
    expect(words.length).toBeGreaterThan(0);
    for (const word of words) {
      const letters = lettersOf(word);
      const sides = letters.flatMap((l, i) => (l.ch === 'χ' && letters[i - 1]?.ch === 'γ' ? [frontAt(letters, i + 1) ? 'soft' : 'hard'] : []));
      const hands = bare(handed(word));
      expect([...hands.matchAll(/γχ/gu)].length, `${word} handed as ${handed(word)}`).toBe(sides.length);
      if (new Set(sides).size === 1) expect(rule.sideOf(word), word).toBe(sides[0]);
    }
  });
});

describe('the χ letter sheet', () => {
  const text = soundLesson(ideaOf('letter-chi'), modern)!;

  it('says in one sentence that χ has two sounds by what follows, with a word of each and its Say it', () => {
    const sentence = text.split(/(?<=[.!?])\s+(?=[A-ZΑ-Ωα-ω])/u).find((s) => /two sounds/.test(s));
    expect(sentence, text).toBeDefined();
    const rule = soundRuleOf(modern, 'letter-chi')!;
    for (const side of rule.sides) {
      const word = side.examples[0];
      expect(sentence).toContain(word);
      expect(sentence).toContain(respellModern(word));
    }
  });
});
