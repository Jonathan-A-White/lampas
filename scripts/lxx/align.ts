// scripts/lxx/align.ts — npm run lxx:align [-- --out <dir>] [--no-morpheus] [--build <n>] (story mw-u2w5klk.274.1; docs/lxx-align.md)
// Cuts Brenton's verse (LXX2012, one chunk a verse as the build makes it) into English chunks aligned to the Greek words of Swete's verse, the shape the Hebrew weave reads
// (src/data/chapter.ts EnglishChunk, src/data/weave.ts), deterministically and with no model: the lexicon's gloss of a word's lemma, a proper name's transliteration, and a function word's place.
// Each Greek word is paired with at most one English word and each English word with at most one Greek word. The pairs are the heaviest chain that keeps the two verses' order (the
// LXX is translated word for word, so Brenton's order follows Swete's), found by dynamic programming; the English between pairs stays in a remainder chunk. A chunk is one paired English word:
//   { t, g: [the Greek word], s?, c: its confidence 0 to 1, y: 'align' }       an aligned chunk; the paired word's `e` is the chunk's position
//   { t, g: [], s?, y: 'align?' }                                              a run of English words the aligner could not pair, for the model pass; the Greek words with no `e` are the ones it has to place
// The chunks, joined by a space, are Brenton's whole verse, and no Greek word is dropped: one with no `e` has no English yet. `lxx:ship` aligns every chapter it ships (ship.ts);
// `lxx:align` runs that ship into a directory (default a temporary one) and writes the aligned share of each chapter between the markers of docs/lxx-align.md. PROVISIONAL, Governor to confirm: the shape, `c`, `y`.
// The model pass (align-choose.ts, mw-u2w5klk.274.2) then replaces each remainder by chunks `{ t, g, s?, c, y: 'model' }` where a Builder session has cut it (data/lxx/align); alignChapter applies its rows.
// No network beyond what the ship fetches; no paid API is called.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { applyModel, type ModelRow } from './align-choose';
import type { ShipOptions } from './ship';

export const ALIGN_DOC = join('docs', 'lxx-align.md');
export const ALIGN_START = '<!-- lxx-align:start -->';
export const ALIGN_END = '<!-- lxx-align:end -->';

/** A chunk at or above this confidence is "sure" in the report: a gloss or a name that matched, not a guess by place. */
export const SURE = 0.6;

// ---------------------------------------------------------------- the English

/** The English words that carry no meaning of their own to pair a Greek content word with: the residual pass by place never pairs one of them. */
const FUNCTION_ENGLISH = new Set(
  ('the a an and of in on upon to from by with for into over under before after at that this these those it he she they we you i his her their its my our your thy thou thee thine him them me us ' +
    'was were is are be been am but or nor so then there which who whom whose not no as if out up down all also yea even thus now ye unto shall will may let hath have has had do did does').split(' '),
);

const IRREGULAR: Readonly<Record<string, string>> = {
  made: 'make', saw: 'see', seen: 'see', said: 'say', gave: 'give', given: 'give', took: 'take', taken: 'take', came: 'come', went: 'go', gone: 'go', did: 'do', done: 'do', had: 'have', has: 'have',
  begot: 'beget', begat: 'beget', brought: 'bring', stood: 'stand', sat: 'sit', ate: 'eat', eaten: 'eat', knew: 'know', known: 'know', spoke: 'speak', spoken: 'speak', heard: 'hear', found: 'find',
  told: 'tell', wrote: 'write', written: 'write', fell: 'fall', fallen: 'fall', rose: 'rise', risen: 'rise', ran: 'run', sent: 'send', lay: 'lie', laid: 'lay', bore: 'bear', born: 'bear', borne: 'bear',
  died: 'die', dying: 'die', was: 'be', were: 'be', is: 'be', are: 'be', been: 'be', men: 'man', women: 'woman', children: 'child', feet: 'foot', slew: 'slay', slain: 'slay', drew: 'draw', flew: 'fly',
  led: 'lead', left: 'leave', lost: 'lose', met: 'meet', paid: 'pay', sold: 'sell', set: 'set', shut: 'shut', slept: 'sleep', smote: 'smite', smitten: 'smite', sought: 'seek', swore: 'swear', sworn: 'swear',
  thought: 'think', threw: 'throw', thrown: 'throw', understood: 'understand', woke: 'wake', wept: 'weep', won: 'win', bound: 'bind', built: 'build', bought: 'buy', caught: 'catch', chose: 'choose', chosen: 'choose',
  dwelt: 'dwell', fed: 'feed', fought: 'fight', gat: 'get', got: 'get', grew: 'grow', grown: 'grow', hid: 'hide', hidden: 'hide', kept: 'keep', lent: 'lend', rent: 'rend', rode: 'ride', rang: 'ring', spake: 'speak',
  stole: 'steal', struck: 'strike', taught: 'teach', tore: 'tear', wore: 'wear', woken: 'wake',
};

/** The letters of an English word, lower case, with the apostrophe-s and the marks gone: 'Cain’s,' is 'cain'. */
export function lettersOf(token: string): string {
  return token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z]/g, '');
}

/** A crude stem: the irregular verbs by table, then the endings -ies, -ied, -ing, -ed, -es, -s, -ly and a final -e come off. 'made' and 'make' are 'mak'; 'waters' and 'water' are 'water'. */
export function stemOf(letters: string): string {
  let w = IRREGULAR[letters] ?? letters;
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith('ied')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(ch|sh|ss|x|z)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('ly')) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

/** How well two stems are the same word: 1 for equal, 0.75 when the shorter (4 letters or more) begins the longer, else 0. */
function stemMatch(a: string, b: string): number {
  if (a === b) return 1;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(short) ? 0.75 : 0;
}

/** The English words a lexicon gloss offers for a lemma, as stems: 'to do, make' is do, make; 'a human' is human. */
const GLOSS_NOISE = new Set(['to', 'a', 'an', 'one', 'ones', 'someone', 'something', 'somebody', 'oneself', 'of', 'be', 'in', 'on']);
export function glossStems(gloss: string): string[] {
  const out = new Set<string>();
  for (const alt of gloss.replace(/\([^)]*\)/g, '').split(/[/,;]/)) {
    const words = alt.split(/\s+/).map(lettersOf).filter(Boolean);
    const kept = words.filter((w) => !GLOSS_NOISE.has(w));
    for (const w of kept.length > 0 ? kept : words) out.add(stemOf(w));
  }
  return [...out];
}

/**
 * The English words that Brenton renders a common Greek lemma by, for the ones a lexicon's gloss does not say: a preposition's ('between' for ἀνά, whose gloss is 'each'), a conjunction's, a negative's, a pronoun's,
 * and the verbs and nouns of the commonest lemmas whose forms the gloss cannot match ('saw' for εἴδω, 'perceive'). A function word pairs by it at a low confidence (the same English word stands for several of them), a content word at a likely one.
 */
const CURATED_TABLE: Readonly<Record<string, string>> = {
  'ἐν': 'in among with by', 'εἰς': 'into to unto in for', 'ἐπί': 'upon on over to against', 'ἀπό': 'from of', 'ἐκ': 'of from out', 'διά': 'through by because for', 'κατά': 'according after against by upon down',
  'πρός': 'to unto toward with', 'μετά': 'with after', 'περί': 'about concerning of', 'ὑπό': 'by under', 'ὑπέρ': 'above for over beyond', 'ἀνά': 'between among', 'παρά': 'beside by from with',
  'σύν': 'with', 'ἀντί': 'for instead', 'πρό': 'before', 'ἐπάνω': 'above over upon', 'ἕως': 'until to', 'ὑποκάτω': 'under',
  'δέ': 'and but now then yet', 'ἀλλά': 'but yet', 'γάρ': 'for because', 'ὅτι': 'that because for', 'ἵνα': 'that', 'ἤ': 'or than', 'οὐ': 'not no', 'οὐκ': 'not no', 'οὐχ': 'not no', 'μή': 'not no lest',
  'οὕτω, οὕτως': 'so thus', 'οὗτος': 'this these', 'ἐκεῖνος': 'that those', 'ὅς, ἥ': 'which who whom whose that', 'ὅς': 'which who whom whose that', 'αὐτός': 'he him his she her it its they them their themselves',
  'γίνομαι': 'be was were become became come came', 'ἔρχομαι': 'come came go went', 'λέγω': 'say said speak spake', 'ἔπω, ἐρῶ, εἶπον': 'say said spake speak', 'ποιέω': 'make made do did', 'δίδωμι': 'give gave given',
  'λαμβάνω': 'take took receive received', 'ἔχω': 'have had hold', 'οἶδα': 'know knew', 'γινώσκω': 'know knew', 'ἀκούω': 'hear heard', 'ὁράω': 'see saw seen behold', 'εἴδω': 'see saw seen behold',
  'καλέω': 'call called name named', 'τίθημι': 'put set lay', 'ἀποστέλλω': 'send sent', 'ἐξέρχομαι': 'go went come came forth out', 'εἰσέρχομαι': 'go went enter entered come came', 'ἀναβαίνω': 'go went up',
  'καταβαίνω': 'go went down', 'ἵστημι': 'stand stood set', 'τίκτω': 'bear bore beget begat', 'γεννάω': 'beget begat bear bore', 'ἀποθνήσκω': 'die died', 'ζάω': 'live lived', 'ἐσθίω': 'eat ate', 'πίνω': 'drink drank',
  'ἀπέρχομαι': 'go went depart departed', 'ἐξάγω': 'bring brought lead led forth', 'συνάγω': 'gather gathered', 'διαχωρίζω': 'divide divided separate', 'ἰδού': 'behold lo', 'υἱός': 'son sons', 'πατήρ': 'father fathers',
  'κύριος': 'lord', 'βασιλεύς': 'king', 'λαός': 'people', 'ἄνθρωπος': 'man men human', 'ἡμέρα': 'day days', 'νύξ': 'night', 'μέσος': 'between midst middle', 'ὕδωρ, ὕδατος': 'water waters',
  'ἐγώ': 'i me my', 'σύ': 'thou thee thy you your', 'ἡμεῖς': 'we us our', 'ὑμεῖς': 'ye you your', 'ἑαυτοῦ': 'himself herself themselves their his her',
};
const CURATED = new Map(Object.entries(CURATED_TABLE).map(([lemma, words]) => [lemma.normalize('NFC'), new Set(words.split(' ').map((w) => stemOf(w)))]));

// ---------------------------------------------------------------- names

/**
 * A name's sounds, spelled so that Greek and English can meet: the SBL transliteration's macrons go, c, q and ch are k, ph is f, th is t, j and y are i, w and ou are u, a double letter is one, and every vowel is
 * 'a' (a run of vowels one): 'Iakōb' and 'Jacob' are both 'akab', 'Mōusēs' and 'Moses' both 'masas'.
 */
export function soundsOf(name: string): string {
  return lettersOf(name)
    .replace(/ou/g, 'u')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch/g, 'k')
    .replace(/[cq]/g, 'k')
    .replace(/[jy]/g, 'i')
    .replace(/w/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/[aeiou]+/g, 'a')
    .replace(/^a|a$/g, '');
}

/** The distance between two strings as a share of the longer, 1 for the same and 0 for nothing in common (Levenshtein). */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return 1 - prev[b.length] / longest;
}

/** How like a Greek name's transliteration an English word is (0 to 1); the Greek ending -s, -n is not counted against it. */
export function nameSimilarity(translit: string, english: string): number {
  const a = soundsOf(translit);
  const b = soundsOf(english);
  const trim = (s: string): string => (s.length > 3 ? s.replace(/[sn]$/, '') : s);
  return Math.max(similarity(a, b), similarity(trim(a), trim(b)));
}

// ---------------------------------------------------------------- the pairing

type Kind = 'article' | 'name' | 'content' | 'function';

const isName = (lemma: string): boolean => /^\p{Lu}/u.test(lemma.normalize('NFC'));

function kindOf(word: GreekWord): Kind {
  if (word.p.startsWith('T-')) return 'article';
  if (/^(N|A|V)-/.test(word.p) || word.p === 'ADV') return isName(word.l) && word.p.startsWith('N-') ? 'name' : 'content';
  return 'function';
}

interface Token {
  /** the word as Brenton has it, with its punctuation */
  text: string;
  letters: string;
  stem: string;
  supplied: boolean;
  capital: boolean;
}

interface Pair {
  g: number;
  t: number;
  c: number;
}

/** The two decimals a confidence is written with. */
const round2 = (x: number): number => Math.round(x * 100) / 100;

/** The confidence of pairing Greek word `word` (with the stems of its lemma's gloss) to an English token, 0 when they do not pair. */
function confidence(word: GreekWord, kind: Kind, stems: readonly string[], token: Token): number {
  if (token.letters === '') return 0;
  if (kind === 'article') return token.letters === 'the' ? 0.55 : 0;
  if (kind === 'name') {
    if (!token.capital) return 0;
    const sim = nameSimilarity(word.tr, token.letters);
    return sim >= 0.7 ? round2(0.9 * sim) : 0;
  }
  let best = 0;
  for (const stem of stems) best = Math.max(best, stemMatch(stem, token.stem));
  const curated = CURATED.get(word.l.normalize('NFC'))?.has(token.stem) ?? false;
  // a function word's gloss must be the whole English word ('and', 'in'); a content word may be a form of it ('made' for 'make')
  if (kind === 'function') return best === 1 ? 0.7 : curated ? 0.5 : 0;
  if (best === 1) return 0.85;
  if (curated) return 0.8;
  return best === 0 ? 0 : 0.65;
}

/** The heaviest chain of pairs that keeps the order of both verses; ties go to the earlier Greek word. `weight` is 0 where two words do not pair. */
function heaviestChain(n: number, m: number, weight: (i: number, j: number) => number): Array<[number, number]> {
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const w: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => weight(i, j)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diagonal = w[i - 1][j - 1] > 0 ? best[i - 1][j - 1] + w[i - 1][j - 1] : -1;
      best[i][j] = Math.max(best[i - 1][j], best[i][j - 1], diagonal);
    }
  }
  const chain: Array<[number, number]> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (w[i - 1][j - 1] > 0 && best[i][j] === best[i - 1][j - 1] + w[i - 1][j - 1]) {
      chain.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (best[i][j] === best[i - 1][j]) i--;
    else j--;
  }
  return chain.reverse();
}

/** The confidence of a word the gloss did not pair but whose place did: the one Greek content word and the one English content word between the same two pairs. */
const BY_PLACE = [0, 0.4, 0.35, 0.3];

function tokensOf(text: string, supplied: readonly number[]): Token[] {
  const marked = new Set(supplied);
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, i) => {
      const letters = lettersOf(raw);
      return { text: raw, letters, stem: stemOf(letters), supplied: marked.has(i), capital: /^[“‘"'([]*\p{Lu}/u.test(raw) };
    });
}

export interface VerseShare {
  /** the English words of the verse, and those a chunk of Greek holds */
  tokens: number;
  pairedTokens: number;
  /** the Greek words, those with an English chunk, and those at a confidence of SURE or more */
  words: number;
  paired: number;
  sure: number;
}

/**
 * Aligns one verse: the English of its one chunk is cut into chunks, one for each English word paired to a Greek word, and one for each run of the English left over. A verse that has no
 * English, or that is already cut, is given back as it is.
 */
export function alignVerse(verse: Verse, gloss: (lemma: string) => string): { verse: Verse; share: VerseShare } {
  const words = verse.g.length;
  const single = verse.e.length === 1 && verse.e[0].y === undefined ? verse.e[0] : undefined;
  if (!single) return { verse, share: { tokens: 0, pairedTokens: 0, words, paired: verse.g.filter((w) => w.e !== undefined).length, sure: 0 } };
  const tokens = tokensOf(single.t, Array.isArray(single.s) ? single.s : []);
  const n = verse.g.length;
  const m = tokens.length;
  const kinds = verse.g.map(kindOf);
  const stems = verse.g.map((w, i) => (kinds[i] === 'article' || kinds[i] === 'name' ? [] : glossStems(gloss(w.l))));
  const place = (i: number, j: number): number => Math.abs((n > 1 ? i / (n - 1) : 0) - (m > 1 ? j / (m - 1) : 0));
  // a pair near the same place in both verses is a little heavier: of two 'and's the one in the same part of the verse is the one
  const weight = (i: number, j: number): number => {
    const c = confidence(verse.g[i], kinds[i], stems[i], tokens[j]);
    return c === 0 ? 0 : Math.max(1, Math.round((c - 0.1 * place(i, j)) * 1000));
  };
  const pairs: Pair[] = heaviestChain(n, m, weight).map(([g, t]) => ({ g, t, c: confidence(verse.g[g], kinds[g], stems[g], tokens[t]) }));

  // Brenton puts the English in its own order where the Greek's is not ('And God said' for καὶ εἶπεν ὁ θεός): what the chain left unpaired is paired out of order, the likeliest first, at a lower confidence
  const usedG = new Set(pairs.map((p) => p.g));
  const usedT = new Set(pairs.map((p) => p.t));
  const loose: Pair[] = [];
  const candidates: Array<Pair & { far: number }> = [];
  for (let g = 0; g < n; g++) {
    if (usedG.has(g) || kinds[g] === 'article') continue;
    for (let t = 0; t < m; t++) {
      if (usedT.has(t)) continue;
      const c = confidence(verse.g[g], kinds[g], stems[g], tokens[t]) - (kinds[g] === 'function' ? 0.2 : 0.05);
      if (c > 0.2) candidates.push({ g, t, c, far: place(g, t) });
    }
  }
  candidates.sort((a, b) => b.c - a.c || a.far - b.far || a.g - b.g || a.t - b.t);
  for (const { g, t, c } of candidates) {
    if (usedG.has(g) || usedT.has(t)) continue;
    usedG.add(g);
    usedT.add(t);
    loose.push({ g, t, c });
  }
  // an article goes with the 'the' just before the English of the noun it belongs to: the first paired word within three words after it
  const paired = new Map([...pairs, ...loose].map((p) => [p.g, p]));
  for (let g = 0; g < n; g++) {
    if (usedG.has(g) || kinds[g] !== 'article') continue;
    for (let k = g + 1; k < Math.min(n, g + 4); k++) {
      const noun = paired.get(k);
      if (!noun) continue;
      const before = noun.t - 1;
      if (before >= 0 && !usedT.has(before) && tokens[before].letters === 'the') {
        usedG.add(g);
        usedT.add(before);
        loose.push({ g, t: before, c: 0.5 });
      }
      break;
    }
  }
  // the words between two chained pairs: one Greek content word and one English content word, or the same few of each, pair by their place
  const bounds: Array<[number, number]> = [[-1, -1], ...pairs.map((p): [number, number] => [p.g, p.t]), [n, m]];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const greek: number[] = [];
    for (let i = bounds[k][0] + 1; i < bounds[k + 1][0]; i++) if (!usedG.has(i) && (kinds[i] === 'content' || kinds[i] === 'name')) greek.push(i);
    const english: number[] = [];
    for (let j = bounds[k][1] + 1; j < bounds[k + 1][1]; j++) if (!usedT.has(j) && tokens[j].letters !== '' && !FUNCTION_ENGLISH.has(tokens[j].letters)) english.push(j);
    if (greek.length > 0 && greek.length === english.length && greek.length < BY_PLACE.length) {
      greek.forEach((g, x) => {
        usedG.add(g);
        usedT.add(english[x]);
        loose.push({ g, t: english[x], c: BY_PLACE[greek.length] });
      });
    }
  }
  const all = [...pairs, ...loose].sort((a, b) => a.t - b.t);

  // chunks in English order: a chunk for each paired word, a remainder for each run of the others
  const chunks: EnglishChunk[] = [];
  const at = new Map<number, number>();
  const pairAt = new Map(all.map((p) => [p.t, p]));
  const flush = (run: number[]): void => {
    if (run.length === 0) return;
    const chunk: EnglishChunk = { t: run.map((j) => tokens[j].text).join(' '), g: [] };
    const supplied = run.flatMap((j, x) => (tokens[j].supplied ? [x] : []));
    if (supplied.length > 0) chunk.s = supplied;
    chunk.y = 'align?';
    chunks.push(chunk);
  };
  let run: number[] = [];
  tokens.forEach((token, j) => {
    const pair = pairAt.get(j);
    if (!pair) {
      run.push(j);
      return;
    }
    flush(run);
    run = [];
    const chunk: EnglishChunk = { t: token.text, g: [pair.g] };
    if (token.supplied) chunk.s = [0];
    chunk.c = round2(pair.c);
    chunk.y = 'align';
    at.set(pair.g, chunks.length);
    chunks.push(chunk);
  });
  flush(run);

  const g = verse.g.map((w, i) => {
    const word: GreekWord = { ...w };
    delete word.e;
    if (at.has(i)) word.e = at.get(i);
    return word;
  });
  const sure = all.filter((p) => round2(p.c) >= SURE).length;
  return { verse: { ...verse, g, e: chunks }, share: { tokens: m, pairedTokens: all.length, words, paired: all.length, sure } };
}

// ---------------------------------------------------------------- a chapter, and the report

/** What the report says of one chapter. */
export interface AlignShare {
  /** Swete's code, lower case */
  code: string;
  book: string;
  chapter: number;
  verses: number;
  words: number;
  paired: number;
  sure: number;
  tokens: number;
  pairedTokens: number;
  /** the Greek words whose chunk the model pass cut (y 'model') */
  model: number;
}

/** Where a build puts the share of each chapter it aligned; passing one to buildLxx is what asks it to align. */
export interface AlignSink {
  shares: AlignShare[];
  /** the model pass's rows by `<book>/<chapter>` (align-choose.ts readModelDir); absent: no model pass */
  model?: ReadonlyMap<string, readonly ModelRow[]>;
}

export function alignChapter(chapter: Chapter, gloss: (lemma: string) => string, model: readonly ModelRow[] = []): { chapter: Chapter; share: AlignShare; stale: string[] } {
  const share: AlignShare = { code: chapter.code, book: chapter.book, chapter: chapter.chapter, verses: chapter.verses.length, words: 0, paired: 0, sure: 0, tokens: 0, pairedTokens: 0, model: 0 };
  const verses = chapter.verses.map((verse) => {
    const out = alignVerse(verse, gloss);
    share.words += out.share.words;
    share.paired += out.share.paired;
    share.sure += out.share.sure;
    share.tokens += out.share.tokens;
    share.pairedTokens += out.share.pairedTokens;
    return out.verse;
  });
  const modelled = applyModel({ ...chapter, verses }, model);
  if (model.length > 0) {
    // the share of a chapter the model cut is read from the chapter itself
    share.paired = 0;
    share.sure = 0;
    share.pairedTokens = 0;
    for (const verse of modelled.chapter.verses) {
      for (const chunk of verse.e) {
        if (chunk.g.length === 0) continue;
        share.paired += chunk.g.length;
        if (round2(chunk.c ?? 0) >= SURE) share.sure += chunk.g.length;
        if (chunk.y === 'model') share.model += chunk.g.length;
        share.pairedTokens += chunk.t.split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return { chapter: modelled.chapter, share, stale: modelled.stale };
}

const pct = (part: number, whole: number): string => (whole === 0 ? '—' : `${((100 * part) / whole).toFixed(1)}%`);
const num = (n: number): string => n.toLocaleString('en-US');

/** The report's text between the markers: one row for each chapter shipped, and one for each book. */
export function renderAlignReport(shares: readonly AlignShare[]): string {
  const rows = [...shares].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.chapter - b.chapter));
  const header = ['| Chapter | Verses | Greek words | Aligned | Aligned share | At confidence 0.6 or more | By the model pass |', '| --- | --- | --- | --- | --- | --- | --- |'];
  const line = (name: string, s: { verses: number; words: number; paired: number; sure: number; model: number }): string =>
    `| ${name} | ${num(s.verses)} | ${num(s.words)} | ${num(s.paired)} | ${pct(s.paired, s.words)} | ${pct(s.sure, s.words)} | ${s.model === 0 ? '—' : `${num(s.model)} (${pct(s.model, s.words)})`} |`;
  const out = ['### Each chapter shipped', '', ...header, ...rows.map((s) => line(`${s.book} ${s.chapter}`, s))];
  const books = new Map<string, AlignShare[]>();
  for (const s of rows) books.set(s.code, [...(books.get(s.code) ?? []), s]);
  out.push('', '### Each book', '', ...header.map((h, i) => (i === 0 ? h.replace('Chapter', 'Book') : h)));
  for (const list of books.values()) {
    const sum = list.reduce((a, s) => ({ verses: a.verses + s.verses, words: a.words + s.words, paired: a.paired + s.paired, sure: a.sure + s.sure, model: a.model + s.model }), { verses: 0, words: 0, paired: 0, sure: 0, model: 0 });
    out.push(line(list[0].book, sum));
  }
  const total = rows.reduce((a, s) => ({ verses: a.verses + s.verses, words: a.words + s.words, paired: a.paired + s.paired, sure: a.sure + s.sure, tokens: a.tokens + s.tokens, pairedTokens: a.pairedTokens + s.pairedTokens, model: a.model + s.model }), { verses: 0, words: 0, paired: 0, sure: 0, tokens: 0, pairedTokens: 0, model: 0 });
  out.push('', `${rows.length} chapter${rows.length === 1 ? '' : 's'}: ${num(total.paired)} of ${num(total.words)} Greek words aligned (${pct(total.paired, total.words)}), ${num(total.model)} of them by the model pass (y \`model\`); ${num(total.pairedTokens)} of ${num(total.tokens)} English words are in a chunk of Greek (${pct(total.pairedTokens, total.tokens)}), the rest are in remainder chunks (y \`align?\`, waiting for the model pass) or in English the model found no Greek for.`);
  return out.join('\n');
}

/** Writes the report between the markers of the doc, leaving the rest of the file as it is; false where the file already says it. */
export function writeAlignReport(doc: string, shares: readonly AlignShare[]): boolean {
  const text = readFileSync(doc, 'utf8');
  const start = text.indexOf(ALIGN_START);
  const end = text.indexOf(ALIGN_END);
  if (start < 0 || end < start) throw new Error(`${doc} has no ${ALIGN_START} and ${ALIGN_END} markers`);
  const next = `${text.slice(0, start + ALIGN_START.length)}\n\n${renderAlignReport(shares)}\n\n${text.slice(end)}`;
  if (next === text) return false;
  writeFileSync(doc, next);
  return true;
}

// ---------------------------------------------------------------- the command

const USAGE = 'usage: npm run lxx:align [-- --out <dir>] [--no-morpheus] [--build <n>]';

export interface AlignOptions extends ShipOptions {
  /** the report to write; default docs/lxx-align.md */
  doc?: string;
}

/** Ships into `--out` (a temporary directory by default, removed after) and writes the aligned share of each chapter shipped. */
export async function runAlign(argv: readonly string[], options: AlignOptions = {}): Promise<AlignShare[]> {
  const { doc = ALIGN_DOC, log = () => undefined, scratch = tmpdir(), ...ship } = options;
  const rest: string[] = [];
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      out = argv[++i];
      if (!out || out.startsWith('--')) throw new Error(USAGE);
    } else rest.push(argv[i]);
  }
  const dir = out ?? mkdtempSync(join(scratch, 'lampas-lxx-align-'));
  try {
    // ship.ts reaches this file through the build, so it is loaded when it is needed
    const { runShip } = await import('./ship');
    const shipped = await runShip(['--out', dir, ...rest], { ...ship, scratch, log });
    const changed = writeAlignReport(doc, shipped.aligned);
    log(`lxx:align: ${shipped.aligned.length} chapter${shipped.aligned.length === 1 ? '' : 's'} aligned; ${doc} ${changed ? 'written' : 'is as it was'}`);
    return shipped.aligned;
  } finally {
    if (!out) rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAlign(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
