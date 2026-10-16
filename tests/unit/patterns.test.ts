// The pattern ideas a word uses (mw-svw421.1, src/data/grammar/patterns.ts): read off the lemma and the RP code, pure.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { ideasOf, ideasOfWord } from '../../src/data/grammar/ladder';
import { PATTERN_IDEAS, patternsOf } from '../../src/data/grammar/patterns';

const bareOf = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const chapter = (book: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const john1 = chapter('1jn', 1);
const wordsOf = (c: Chapter, verse?: number): GreekWord[] => c.verses.filter((v) => verse === undefined || v.n === verse).flatMap((v) => v.g);
const find = (form: string, verse?: number): GreekWord => {
  const word = wordsOf(john1, verse).find((w) => w.t.normalize('NFC') === form.normalize('NFC'));
  if (!word) throw new Error(`${form} is not in 1 John 1`);
  return word;
};

describe('patternsOf on the words of 1 John 1', () => {
  it('gives ἦν (εἰμί) eimi and the augment', () => {
    const word = find('ἦν');
    expect(word.p).toBe('V-IAI-3S');
    expect(patternsOf(word)).toEqual(expect.arrayContaining(['eimi', 'augment']));
  });

  it('gives ἐθεασάμεθα the augment and the tense signs', () => {
    expect(patternsOf(find('ἐθεασάμεθα'))).toEqual(expect.arrayContaining(['augment', 'tense-signs']));
  });

  it('gives ἑωράκαμεν reduplication', () => {
    expect(patternsOf(find('ἑωράκαμεν'))).toContain('reduplication');
  });

  it('gives ἀρχῆς the first declension and χεῖρες the third', () => {
    expect(patternsOf(find('ἀρχῆς'))).toContain('declension-1');
    expect(patternsOf(find('χεῖρες'))).toContain('declension-3');
  });

  it('gives οὐδεμία, a feminine of οὐδείς in -α, the first declension and not the third', () => {
    const word = find('οὐδεμία', 5);
    expect(word.l).toBe('οὐδείς');
    expect(word.p).toBe('A-NSF-N');
    expect(patternsOf(word)).toContain('declension-1');
    expect(patternsOf(word)).not.toContain('declension-3');
  });

  it('gives every form of πατήρ in the chapter the third declension', () => {
    const forms = wordsOf(john1).filter((w) => w.l === 'πατήρ');
    expect(forms.length).toBeGreaterThan(0);
    for (const w of forms) expect(patternsOf(w), w.t).toContain('declension-3');
  });

  it('gives a form of ποιέω in verse 6 contract-verbs', () => {
    const word = wordsOf(john1, 6).find((w) => w.l === 'ποιέω');
    expect(word).toBeDefined();
    expect(patternsOf(word!)).toContain('contract-verbs');
  });

  it('gives ὅ and καί nothing', () => {
    expect(patternsOf(find('ὃ'))).toEqual([]);
    expect(patternsOf(find('καὶ'))).toEqual([]);
    expect(patternsOf({ l: 'ὅς', p: 'R-NSN' })).toEqual([]);
  });

  it('gives a preposition, the article and an indeclinable name nothing', () => {
    expect(patternsOf({ l: 'ἀπό', p: 'PREP' })).toEqual([]);
    expect(patternsOf({ l: 'ὁ', p: 'T-NSM' })).toEqual([]);
    expect(patternsOf({ l: 'Ἀβραάμ', p: 'N-PRI' })).toEqual([]);
  });
});

describe('patternsOf from a lemma and a code', () => {
  const of = (l: string, p: string) => patternsOf({ l, p });

  it('reads the declension of a noun from its lemma and gender', () => {
    expect(of('ἡμέρα', 'N-NSF')).toContain('declension-1');
    expect(of('προφήτης', 'N-NSM')).toContain('declension-1');
    expect(of('λόγος', 'N-NSM')).toContain('declension-2');
    expect(of('τέκνον', 'N-NSN')).toContain('declension-2');
    expect(of('σάρξ', 'N-NSF')).toContain('declension-3');
    expect(of('πνεῦμα', 'N-NSN')).toContain('declension-3');
    expect(of('πίστις', 'N-NSF')).toContain('declension-3');
    expect(of('βασιλεύς', 'N-NSM')).toContain('declension-3');
    expect(of('ἔθνος', 'N-NSN')).toContain('declension-3');
  });

  it('reads an adjective by the declension of its gender', () => {
    expect(of('ἀγαθός', 'A-NSM')).toContain('declension-2');
    expect(of('ἀγαθός', 'A-NSF')).toContain('declension-1');
    expect(patternsOf({ l: 'αἰώνιος', p: 'A-ASF', t: 'αἰώνιον' })).toContain('declension-2');
    expect(of('ἀληθής', 'A-NSM')).toContain('declension-3');
  });

  it('reads the feminine of a three-ending adjective in -ς as the first declension, and a two-ending one as the third', () => {
    for (const [l, p] of [['οὐδείς', 'A-NSF-N'], ['πᾶς', 'A-NSF'], ['πᾶς', 'A-GSF'], ['μέγας', 'A-DSF'], ['πολύς', 'A-APF'], ['εἷς', 'A-GSF'], ['εὐθύς', 'A-NSF']]) {
      expect(of(l, p), `${l} ${p}`).toContain('declension-1');
      expect(of(l, p), `${l} ${p}`).not.toContain('declension-3');
    }
    for (const [l, p] of [['ἀληθής', 'A-ASF'], ['ἀσθενής', 'A-NSF'], ['εὐσχήμων', 'A-APF'], ['τέσσαρες', 'A-APF']]) expect(of(l, p), `${l} ${p}`).toContain('declension-3');
    // the comparative in -ων is third whatever the positive was
    expect(of('μέγας', 'A-ASF-C')).toContain('declension-3');
    expect(of('πολύς', 'A-APF-C')).toContain('declension-3');
    expect(of('πᾶς', 'A-NSM')).toContain('declension-3');
  });

  it('reads an adjective whose lemma is itself feminine, and a plural-only noun, as the first declension', () => {
    expect(of('δεκάτη', 'A-APF')).toContain('declension-1');
    expect(of('ὀψία', 'A-GSF')).toContain('declension-1');
    expect(of('Συράκουσαι', 'N-APF')).toContain('declension-1');
    expect(of('Ἰωάννα, Ἰωανάν', 'N-NSF')).toContain('declension-1');
    expect(of('διπλοῦς', 'A-NSM')).toContain('declension-2');
    expect(of('διπλοῦς', 'A-GSF')).toContain('declension-1');
  });

  it('keeps a third-declension noun third in its accusative in -α and -ας', () => {
    for (const [l, p] of [['σάρξ', 'N-ASF'], ['χείρ', 'N-APF'], ['ἐλπίς', 'N-ASF'], ['μήτηρ', 'N-ASF']]) expect(of(l, p), `${l} ${p}`).toContain('declension-3');
  });

  it('gives every noun, adjective and verb a stem and an ending, and nothing else without one', () => {
    for (const [l, p] of [['λόγος', 'N-NSM'], ['ἀγαθός', 'A-NSM'], ['λύω', 'V-PAI-1S'], ['λύω', 'V-PAN']]) expect(of(l, p), p).toContain('stem-and-ending');
    for (const [l, p] of [['καί', 'CONJ'], ['ἀπό', 'PREP'], ['ὁ', 'T-NSM'], ['αὐτός', 'P-NSM']]) expect(of(l, p), p).not.toContain('stem-and-ending');
  });

  it('puts the augment on the imperfect, the aorist and the pluperfect indicative only', () => {
    for (const p of ['V-IAI-3S', 'V-AAI-3S', 'V-2AAI-3S', 'V-LAI-3S', 'V-API-3S']) expect(of('λύω', p), p).toContain('augment');
    for (const p of ['V-PAI-3S', 'V-FAI-3S', 'V-RAI-3S', 'V-AAS-3S', 'V-AAN', 'V-AAP-NSM']) expect(of('λύω', p), p).not.toContain('augment');
  });

  it('puts the tense signs on the future, the first aorist, the aorist passive and the first perfect', () => {
    for (const p of ['V-FAI-1S', 'V-AAI-1S', 'V-AAN', 'V-API-1S', 'V-RAI-1S', 'V-FPI-1S']) expect(of('λύω', p), p).toContain('tense-signs');
    for (const p of ['V-PAI-1S', 'V-IAI-1S', 'V-2AAI-1S', 'V-2API-1S', 'V-RPI-1S', 'V-2RAI-1S']) expect(of('λύω', p), p).not.toContain('tense-signs');
  });

  it('puts reduplication on the perfect and the pluperfect', () => {
    for (const p of ['V-RAI-1S', 'V-RPI-1S', 'V-RAP-NSM', 'V-LAI-1S']) expect(of('λύω', p), p).toContain('reduplication');
    for (const p of ['V-PAI-1S', 'V-AAI-1S', 'V-FAI-1S']) expect(of('λύω', p), p).not.toContain('reduplication');
  });

  it('reads contract verbs from -άω, -έω and -όω', () => {
    for (const l of ['ἀγαπάω', 'ποιέω', 'πληρόω']) expect(of(l, 'V-PAI-3S'), l).toContain('contract-verbs');
    for (const l of ['λύω', 'λέγω', 'ἀκούω']) expect(of(l, 'V-PAI-3S'), l).not.toContain('contract-verbs');
  });

  it('reads -μι verbs from the lemma, and εἰμί as its own', () => {
    for (const l of ['δίδωμι', 'τίθημι', 'ἵστημι', 'ἀφίημι']) expect(of(l, 'V-PAI-3S'), l).toContain('mi-verbs');
    expect(of('εἰμί', 'V-PAI-3S')).toEqual(expect.arrayContaining(['eimi', 'stem-and-ending']));
    expect(of('εἰμί', 'V-PAI-3S')).not.toContain('mi-verbs');
    expect(of('λύω', 'V-PAI-3S')).not.toContain('mi-verbs');
  });

  it('reads οἶδα from its perfect and its past, and not from the aorist εἶδον of the same dictionary entry', () => {
    expect(of('εἴδω', 'V-RAI-1P')).toContain('oida');
    expect(of('οἶδα', 'V-RAI-1S')).toContain('oida');
    expect(of('εἴδω', 'V-2LAI-3S')).toContain('oida');
    expect(of('εἴδω', 'V-RAI-1P')).not.toContain('reduplication');
    expect(of('εἴδω', 'V-2AAI-1S')).not.toContain('oida');
  });

  it('never names dictionary-entry or principal-parts, which are not read off a form', () => {
    expect(PATTERN_IDEAS).not.toContain('dictionary-entry');
    expect(PATTERN_IDEAS).not.toContain('principal-parts');
  });

  it('is in the ladder order, and the same twice', () => {
    const word = { l: 'ἀγαπάω', p: 'V-AAI-1S' };
    const found = patternsOf(word);
    expect(found).toEqual(PATTERN_IDEAS.filter((id) => found.includes(id)));
    expect(patternsOf(word)).toEqual(found);
  });
});

describe('ideasOfWord', () => {
  it('is ideasOf(code) and the patterns of the word', () => {
    const word = { l: 'ποιέω', p: 'V-PAI-1P' };
    const ids = ideasOfWord(word);
    for (const id of [...ideasOf(word.p), ...patternsOf(word)]) expect(ids).toContain(id);
    expect(ids.map((id) => id).length).toBe(new Set(ids).size);
  });

  it('keeps a preposition its own idea beside the patterns', () => {
    expect(ideasOfWord({ l: 'ἐν', p: 'PREP' })).toContain('preposition-en');
  });
});

describe('a walk of every token of the 260 chapter files', () => {
  it('gives no feminine adjective in a first-declension ending the third declension unless its lemma is a two-ending one', () => {
    const wrong = new Map<string, number>();
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        const c = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const w of c.verses.flatMap((v) => v.g)) {
          // a feminine form ending in -α, -η, -ᾶς or -ης (accents and case aside) of a three-ending adjective or a feminine-lemma adjective or noun
          if (!/^[NA]-[NGDAV][SP]F/.test(w.p) || !/(α|η|ας|ης)$/.test(bareOf(w.t))) continue;
          if (!patternsOf(w).includes('declension-3')) continue;
          const lemma = bareOf(w.l.split(',')[0]);
          const comparative = /-C$/.test(w.p);
          // genuinely third: any noun whose lemma is not a first-declension one (σάρξ, χείρ, ἐλπίς, μήτηρ, -της), the two-ending adjectives and the comparatives
          const genuine = w.p.startsWith('N-') ? !/(η|α|αι)$/.test(lemma) : comparative || /(ης|ων|ες|ον)$/.test(lemma);
          if (!genuine) wrong.set(`${w.l} ${w.p} ${w.t}`, (wrong.get(`${w.l} ${w.p} ${w.t}`) ?? 0) + 1);
        }
      }
    }
    expect([...wrong.keys()]).toEqual([]);
  });

  it('names only ideas the ladder has, and throws nothing', () => {
    const seen = new Map<string, number>();
    let files = 0;
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        files += 1;
        const c = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const w of c.verses.flatMap((v) => v.g)) {
          for (const id of patternsOf(w)) seen.set(id, (seen.get(id) ?? 0) + 1);
          ideasOfWord(w);
        }
      }
    }
    expect(files).toBe(260);
    for (const id of PATTERN_IDEAS) expect(seen.get(id), id).toBeGreaterThan(0);
    expect([...seen.keys()].sort()).toEqual([...PATTERN_IDEAS].sort());
  });
});
