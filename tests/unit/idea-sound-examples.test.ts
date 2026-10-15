// tests/unit/idea-sound-examples.test.ts — the examples of a letter or a sound make the sound the card teaches (mw-5r3p30.351, his words about the Omicron,
// Upsilon and Phi sheets on 1 John 1:1): an example of omicron is a word whose ο is said alone, never half of οι ("ee") or ου ("oo"); Upsilon
// ("ee") shows no τοῦ or λόγου; and what the sheet shows first is easy to say.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadChapter, loadIndex, type BookIndex, type Chapter } from '../../src/data/chapter';
import { EASY_SCORE, ideaExamples, ideaExamplesFor, ideaPassage, SOUND_EXAMPLES, type IdeaExample } from '../../src/data/grammar/ideaSheet';
import { scoreWords } from '../../src/data/ladderScore';
import { ideaText } from '../../src/data/grammar/lessons';
import { clustersOf, foundationOf, LETTER_IDS } from '../../src/data/grammar/inference';
import { ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { teachOf } from '../../src/data/grammar/teach';
import { teachTiles } from '../../src/data/grammar/teachTiles';
import { lessonsOf, pronunciationOf } from '../../src/speech/pronunciation';
import { DEFAULT_CHAPTER } from '../../src/data/readerChapter';
import { stubChapterFetch } from '../support/chapter-fetch';

let index: BookIndex;
let john: Chapter;

beforeAll(async () => {
  stubChapterFetch();
  index = await loadIndex();
  john = await loadChapter('1jn', 1);
});

const forms = (examples: IdeaExample[]): string[] => examples.map((e) => e.word.t);
const sheet = async (id: string, goal = '1 John 1:1') => ideaExamplesFor(id, await ideaPassage(goal, DEFAULT_CHAPTER, loadChapter, index), loadChapter);

describe('the Omicron sheet over 1 John 1:1 (his screenshot: τοῖς and ὀφθαλμοῖς, where ο is half of οι)', () => {
  it('lists Ὃ and ἀκηκόαμεν as examples of the verse, and not τοῖς, ὀφθαλμοῖς, τοῦ or λόγου', () => {
    const found = forms(ideaExamples('letter-omicron', [john], 1));
    expect(found).toEqual(['Ὃ', 'ἀκηκόαμεν']);
  });

  it('shows no word whose ο is inside a pair, however far the sheet looks', async () => {
    const found = forms((await sheet('letter-omicron')).examples);
    expect(found).toContain('Ὃ');
    for (const word of ['τοῖς', 'ὀφθαλμοῖς', 'τοῦ', 'λόγου']) expect(found).not.toContain(word);
  });
});

describe('the Upsilon sheet over 1 John 1:1 (υ is "ee"; in τοῦ and λόγου it is half of ου)', () => {
  it('shows neither τοῦ nor λόγου', async () => {
    expect(forms(ideaExamples('letter-upsilon', [john], 1))).not.toEqual(expect.arrayContaining(['τοῦ']));
    const found = forms((await sheet('letter-upsilon')).examples);
    for (const word of ['τοῦ', 'λόγου']) expect(found).not.toContain(word);
  });
});

describe('the Phi sheet over 1 John 1:1 (his words: simpler words, even if further from the goal)', () => {
  it('shows a short easy φ word before ὀφθαλμοῖς, and ὀφθαλμοῖς last or not at all', async () => {
    const found = forms((await sheet('letter-phi')).examples);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]).not.toBe('ὀφθαλμοῖς');
    expect(found[0]).not.toBe('ἐψηλάφησαν');
    const at = found.indexOf('ὀφθαλμοῖς');
    if (at >= 0) expect(at).toBe(found.length - 1);
  });
});

// ---- The guard (AC 2, 4, 5): read from the one pronunciation scheme, not from a hand list in the sheet ----

/** Every sheet that teaches a sound: the 24 letters, each vowel pair and consonant pair, their two groups; and the syllables, whose marked stretches are units too. */
const SOUND_SHEETS = [...LADDER.filter((i) => i.glyphs || (i.parent && i.parent !== 'breathings')).map((i) => i.id), 'diphthongs', 'consonant-pairs', 'syllables'];
const scheme = pronunciationOf('modern');

/** What is wrong with a marked stretch of an example, re-derived from the scheme's own reading of the word: each marked stretch must be whole units the scheme
 * reads, a letter only where it is read alone as a sound its lesson teaches, a pair only as the one pair. Empty when it is right. */
function faults(id: string, example: IdeaExample): string[] {
  const form = example.word.t;
  const clusters = clustersOf(form);
  const letterAt = clusters.flatMap((c, k) => (c.letter ? [k] : []));
  const units = scheme.spellings!(form);
  if (letterAt.length !== units.reduce((n, u) => Math.max(n, u.to), 0)) return [`${id}: ${form}: the scheme counts other letters than the form has`];
  const taught = lessonsOf(scheme)[id]?.sounds;
  const out: string[] = [];
  let at = 0;
  for (const part of example.parts) {
    const size = clustersOf(part.text).length;
    const [start, end] = [at, at + size];
    at = end;
    if (!part.marked) continue;
    const inside = units.filter((u) => letterAt[u.from] >= start && letterAt[u.to - 1] < end);
    const covered = inside.reduce((n, u) => n + (letterAt[u.to - 1] - letterAt[u.from] + 1), 0);
    if (covered !== end - start || inside.length === 0) out.push(`${id}: ${form}: “${part.text}” is not whole units of the scheme’s reading`);
    const idea = ideaOf(id);
    if (idea.glyphs) {
      for (const u of inside) {
        if (u.to - u.from !== 1) out.push(`${id}: ${form}: ${idea.glyphs[0]} is inside a pair`);
        else if (taught && !taught.includes(u.sound)) out.push(`${id}: ${form}: ${idea.glyphs[0]} sounds “${u.sound}”, not ${taught.join(' or ')}`);
      }
    } else if (idea.pair && !(inside.length === 1 && inside[0].to - inside[0].from === 2)) out.push(`${id}: ${form}: “${part.text}” is not read as the one pair ${idea.pair}`);
  }
  return out;
}

describe('the scheme says how it reads, and the sheets use it', () => {
  it('Modern Greek reads τοῖς as τ, οι (ee), ς, and a letter taught more than one sound lists them', () => {
    expect(scheme.spellings!('τοῖς')).toEqual([
      { from: 0, to: 1, sound: 't' },
      { from: 1, to: 3, sound: 'ee' },
      { from: 3, to: 4, sound: 's' },
    ]);
    expect(lessonsOf(scheme)['letter-gamma'].sounds).toEqual(['gh', 'y']);
    expect(lessonsOf(scheme)['letter-omicron'].sounds).toEqual(['o']);
  });
});

describe('every example of a letter or a sound makes the sound its card teaches, over 1 John 1 (AC 2)', () => {
  it('has no marked stretch inside a pair or said otherwise, verse by verse, on every sheet', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const id of SOUND_SHEETS) {
      for (const verse of john.verses) {
        for (const example of ideaExamples(id, [john], verse.n)) {
          checked++;
          wrong.push(...faults(id, example));
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(wrong).toEqual([]);
  });

  it('the guard can fail: a word with ο inside οι, handed to it as an example of omicron, is caught', () => {
    const word = john.verses[0].g.find((w) => w.t === 'τοῖς')!;
    const bad: IdeaExample = { word, chapter: john, verse: 1, reference: '1 John 1:1', parts: [{ text: 'τ', marked: false }, { text: 'ο', marked: true }, { text: 'ῖς', marked: false }] };
    expect(faults('letter-omicron', bad)).not.toEqual([]);
  });
});

describe('every letter of the alphabet over 1 John, in Modern mode (AC 5)', () => {
  it('each of the 24 sheets, as the sheet shows it, passes the same check, and a pair line is a real pair of that letter', async () => {
    const letters = LADDER.filter((i) => i.glyphs);
    expect(letters).toHaveLength(24);
    const wrong: string[] = [];
    let shown = 0;
    for (const letter of letters) {
      const found = await sheet(letter.id);
      shown += found.examples.length;
      for (const example of found.examples) wrong.push(...faults(letter.id, example));
      const pair = found.pairCase;
      if (pair) {
        const unit = scheme.spellings!(pair.word.t).find((u) => u.to - u.from === 2 && clustersOf(pair.word.t).filter((c) => c.letter).slice(u.from, u.to).map((c) => c.base).join('') === pair.pair);
        if (!unit || unit.sound !== pair.sound) wrong.push(`${letter.id}: the pair line ${pair.word.t} ${pair.pair} = ${pair.sound} is not what the scheme reads`);
        if (!pair.pair.includes(letter.glyphs![0])) wrong.push(`${letter.id}: the pair ${pair.pair} does not hold the letter`);
      }
    }
    expect(shown).toBeGreaterThan(24 * 3);
    expect(wrong).toEqual([]);
  });
});

describe('every chapter Lampas holds (AC 4)', () => {
  it('has no letter or sound sheet whose underline marks anything but what the scheme reads as that letter or pair alone', async () => {
    const books = index.books.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => [b.code, i + 1] as const));
    const wrong: string[] = [];
    let chapters = 0;
    let marked = 0;
    for (const [code, n] of books) {
      const chapter = await loadChapter(code, n);
      chapters++;
      for (const id of SOUND_SHEETS) {
        for (const example of ideaExamples(id, [chapter])) {
          marked += example.parts.filter((p) => p.marked).length;
          wrong.push(...faults(id, example));
        }
      }
    }
    // the closing comment reports these counts
    console.log(`checked ${chapters} chapters, ${SOUND_SHEETS.length} sheets, ${marked} marked stretches`);
    expect(chapters).toBe(260);
    expect(wrong).toEqual([]);
  }, 120_000);

  it('the scheme counts the same letters as the forms have, for every form of the text', async () => {
    const forms = new Set<string>();
    for (const b of index.books) for (let n = 1; n <= b.chapters; n++) for (const v of (await loadChapter(b.code, n)).verses) for (const w of v.g) forms.add(w.t);
    const odd = [...forms].filter((f) => clustersOf(f).filter((c) => c.letter).length !== scheme.spellings!(f).reduce((n, u) => Math.max(n, u.to), 0));
    expect(odd).toEqual([]);
  }, 120_000);
});

describe('a vowel taken into a pair opens no pair of its own (found by the every-chapter check)', () => {
  it('Δαυίδ is αυ and ί, never αυ and υί; Νινευῖται is ευ and ῖ', () => {
    expect(foundationOf('Δαυίδ')).toContain('diphthong-au');
    expect(foundationOf('Δαυίδ')).not.toContain('diphthong-ui');
    expect(foundationOf('Νινευῖται')).toContain('diphthong-eu');
    expect(foundationOf('Νινευῖται')).not.toContain('diphthong-ui');
  });
});

describe('the search widens until it has four easy examples, and says where they came from (AC 7, 8)', () => {
  const dropOf = (found: { examples: IdeaExample[] }) => found.examples.map((e) => e.verse);

  it('Omicron over 1 John 1:1: the verse has two words, so the pericope gives the rest, and the heading names the pericope', async () => {
    const found = await sheet('letter-omicron');
    expect(found.title).toBe('1 John 1:1-4');
    expect(found.examples).toHaveLength(SOUND_EXAMPLES);
    expect(forms(found.examples)[0]).toBe('Ὃ');
    expect(dropOf(found).every((v) => v <= 4)).toBe(true);
  });

  it('a letter the verse and its pericope lack widens to the chapter, then the book, and the heading is the widest place used', async () => {
    const found = await sheet('letter-xi');
    expect(found.title).toBe('1 John');
    expect(found.examples.length).toBeGreaterThan(0);
  });

  it('a sheet whose verse already has four easy words stays in the verse', async () => {
    const id = LADDER.filter((i) => i.glyphs).find((i) => ideaExamples(i.id, [john], 1).filter((e) => scoreWords([e.word.t]).score <= EASY_SCORE).length >= SOUND_EXAMPLES)?.id;
    expect(id).toBeDefined();
    const found = await sheet(id!);
    expect(found.title).toBe('1 John 1:1');
    expect(found.examples.every((e) => e.verse === 1)).toBe(true);
  });

  it('shows easy words first: every example of Phi is easy, and a hard one only follows the easy ones', async () => {
    const found = await sheet('letter-phi');
    const scores = found.examples.map((e) => scoreWords([e.word.t]).score);
    expect(scores.every((s) => s <= EASY_SCORE)).toBe(true);
    const easy = scores.map((s) => s <= EASY_SCORE);
    expect(easy).toEqual([...easy].sort((a, b) => Number(b) - Number(a)));
  });

  it('puts words made of letters he has met before words with a letter he has not (his words: what you have learned so far)', async () => {
    const passage = await ideaPassage('1 John 1:1', DEFAULT_CHAPTER, loadChapter, index);
    const known = new Set(LETTER_IDS.filter((l) => l !== 'letter-tau' && l !== 'letter-nu'));
    const found = await ideaExamplesFor('letter-omicron', passage, loadChapter, { known }, pronunciationOf('modern'));
    const unmet = found.examples.map((e) => foundationOf(e.word.t).filter((f) => LETTER_IDS.includes(f) && !known.has(f)).length);
    expect(unmet).toEqual([...unmet].sort((a, b) => a - b));
    expect(unmet[0]).toBe(0);
  });

  it('commonest first among equals: a word the text uses more comes before one it uses less', async () => {
    const passage = await ideaPassage('1 John 1:1', DEFAULT_CHAPTER, loadChapter, index);
    const plain = await ideaExamplesFor('letter-omicron', passage, loadChapter, {}, pronunciationOf('modern'));
    const [first, second] = [plain.examples[2], plain.examples[3]];
    // make the later of two same-place words the commoner one
    const frequency = new Map([[second.word.l.normalize('NFC'), 1000], [first.word.l.normalize('NFC'), 1]]);
    const ranked = await ideaExamplesFor('letter-omicron', passage, loadChapter, { frequency }, pronunciationOf('modern'));
    expect(forms(ranked.examples).indexOf(second.word.t)).toBeLessThan(forms(ranked.examples).indexOf(first.word.t));
  });
});

describe('the letter descriptions name Greek letters and the scheme says what αυ, ευ and ηυ sound like (AC 6)', () => {
  it('the Upsilon text never says a, e or η makes a diphthong, and Modern Greek teaches av/af, ev/ef, eev/eef from its own lesson', () => {
    const upsilon = ideaOf('letter-upsilon');
    expect(upsilon.text).not.toMatch(/diphthong|after a, e/);
    expect(upsilon.text).toContain('α, ε, η');
    expect(ideaText(upsilon, scheme)).toContain('In αυ, ευ and ηυ it is v or f (av or af, ev or ef, eev or eef).');
    // another scheme without the lesson says no sound at all, and never Modern Greek's
    expect(ideaText(upsilon, { ...scheme, id: 'bare', lessons: () => ({}) })).not.toContain('av or af');
  });

  it('no letter description writes a Latin letter where a Greek one is meant', () => {
    for (const letter of LADDER.filter((i) => i.glyphs)) expect(letter.text, letter.id).not.toMatch(/\b(after|before) [a-e]\b/);
  });
});

describe('the worked example and the tile words of a sound card make the sound it teaches (found by the sweep for mw-5r3p30.351)', () => {
  /** The idea's word, as the card shows it, handed to the same check as an example with its letter or pair marked wherever the idea's spans stand. */
  const asExample = (id: string, form: string): IdeaExample | undefined => {
    const [example] = ideaExamples(id, [{ ...john, verses: [{ ...john.verses[0], g: [{ ...john.verses[0].g[0], t: form, l: form, p: 'N-NSM' }] }] }], undefined, undefined, scheme);
    return example;
  };

  it("each letter's worked word has the letter said alone, in the sound its card teaches", () => {
    const wrong: string[] = [];
    for (const letter of LADDER.filter((i) => i.glyphs)) {
      for (const { say, word } of teachOf(letter.id).worked) for (const form of [say ?? word]) if (!asExample(letter.id, form)) wrong.push(`${letter.id}: ${form} is not an example of it`);
    }
    expect(wrong).toEqual([]);
  });

  it("each pair's tile word is read as the one pair", () => {
    const wrong: string[] = [];
    for (const item of LADDER.filter((i) => i.parent && i.parent !== 'breathings')) {
      const tile = teachTiles(ideaOf(item.parent!), scheme).find((t) => t.id === item.id);
      if (tile?.example && !asExample(item.id, tile.example.word)) wrong.push(`${item.id}: ${tile.example.word} is not read as ${item.pair}`);
    }
    expect(wrong).toEqual([]);
  });
});
