#!/usr/bin/env node
// The lxx-morph probe (story mw-u2w5klk.21; the write-up is docs/sources/lxx-morph-probe.md). Not shipped in the app, not in the gate, and it
// changes nothing under scripts/lxx/ or data/lxx/: it READS the derivation's files and its code.
//
// The question: how many of the 178 model batches would OpenScriptorium/lxx-morph (per-word lemma and parsing for Rahlfs 1935, data CC BY 4.0)
// save, and how accurate is it on the words Lampas already has an answer for. lxx-morph tags Rahlfs; Lampas tags Swete. So:
//   1. each Swete verse is matched to a Rahlfs verse by its words (the same chapter and verse first; where fewer than half the words agree, the
//      verse of the book's files that shares the most of its rarer words), which covers every numbering difference, Jeremiah's order and 2 Esdras too;
//   2. each Swete word (numbered by scripts/lxx/swete.ts, sweteTokens) is found in that verse by its look-up key (keyOf), then without marks
//      (bareOf), then with ει read as ι and a final ν dropped; the k-th time a form stands in Swete's verse is the k-th time in Rahlfs's when both
//      have it as often, else the reading is taken only when every occurrence in Rahlfs's verse has the same one;
//   3. both parsings are mapped to one form (case, number, gender, person, tense, voice, mood, and the class verb / nominal / uninflected) and compared.
// lxx-morph is fetched pinned to a commit into data/raw/lxx (git-ignored, as the other sources): nothing of it is committed.
//
//   npx tsx scripts/lxx-morph-probe.mjs            # every table, printed; the word lists written under data/raw/lxx-morph-probe/
//   npx tsx scripts/lxx-morph-probe.mjs --no-check # skip re-deriving the books (no saving table with the agreement check)
//
// Run `sg docker -c 'npm run lxx:derive -- --all'` first: the pending files and the Morpheus cache it writes are what this reads.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAW_DIR, fetchPinned, pinnedPath } from './lxx/sources.ts';
import { bareOf, keyOf } from './lxx/swete.ts';
import { OUT_DIR, deriveBook, loadInput, splitBooks, train } from './lxx/derive.ts';
import { MORPHEUS_DIR, readMorpheusCache } from './lxx/morpheus.ts';
import { NOTE_NAME, agree, checkAgreement, pauseAfter } from './lxx/agreement.ts';
import { parse } from './lxx/parser.ts';
import { cutBatches } from './lxx/batches.ts';
import { OLD_TESTAMENT } from './lxx/report.ts';

// ---------------------------------------------------------------- the source, pinned

/** Swete's book code (lower case) -> lxx-morph's book files. Where Rahlfs prints two texts both are offered; the verse match picks. */
const BOOKS = {
  gen: ['genesis'], exo: ['exodus'], lev: ['leviticus'], num: ['numbers'], deu: ['deuteronomy'],
  jos: ['joshua-vaticanus-b', 'joshua'], jdg: ['judges-vaticanus-b', 'judges'], rut: ['ruth'],
  '1sa': ['1-samuel'], '2sa': ['2-samuel'], '1ki': ['1-kings'], '2ki': ['2-kings'], '1ch': ['1-chronicles'], '2ch': ['2-chronicles'],
  ezr: ['2-esdras'], neh: ['2-esdras'], est: ['esther-greek'], job: ['job-lxx'], psa: ['psalms-lxx'], pro: ['proverbs'],
  ecc: ['ecclesiastes'], sol: ['song-of-solomon'], isa: ['isaiah'], jer: ['jeremiah-lxx'], lam: ['lamentations'], eze: ['ezekiel'],
  dan: ['daniel', 'daniel-theodotion'], hos: ['hosea'], joe: ['joel'], amo: ['amos'], oba: ['obadiah'], jon: ['jonah'], mic: ['micah'],
  nah: ['nahum'], hab: ['habakkuk'], zep: ['zephaniah'], hag: ['haggai'], zec: ['zechariah'], mal: ['malachi'],
};
const SLUGS = [...new Set(Object.values(BOOKS).flat())].sort();
export const LXX_MORPH = {
  repo: 'OpenScriptorium/lxx-morph',
  commit: 'c91f6b1e8fb3ba37df701e6ae31f675ace71a2b2',
  files: [
    'LICENSE', 'LICENSE-DATA', 'README.md',
    'lib/tasks/lxx_morph_catss_overlay.rake', 'lib/tasks/lxx_morph_demote_ambiguous.rake', 'lib/tasks/lxx_morph_neutralize_attribution.rake',
    'lib/tasks/lxx_morph_confidence.rake', 'lib/tasks/lxx_morph_finalize.rake',
    ...SLUGS.map((s) => `db/seeds/lxx_morph/${s}.json`),
  ],
};
const PROBE_DIR = join('data', 'raw', 'lxx-morph-probe');

// ---------------------------------------------------------------- one form of parsing

const LXX_TOKEN = {
  nom: ['case', 'N'], gen: ['case', 'G'], dat: ['case', 'D'], acc: ['case', 'A'], voc: ['case', 'V'],
  sg: ['number', 'S'], pl: ['number', 'P'], du: ['number', 'D'],
  masc: ['gender', 'M'], fem: ['gender', 'F'], neut: ['gender', 'N'],
  '1st': ['person', '1'], '2nd': ['person', '2'], '3rd': ['person', '3'],
  pres: ['tense', 'P'], imperf: ['tense', 'I'], fut: ['tense', 'F'], aor: ['tense', 'A'], perf: ['tense', 'R'], plup: ['tense', 'L'], futperf: ['tense', 'T'],
  ind: ['mood', 'I'], subj: ['mood', 'S'], opt: ['mood', 'O'], imperat: ['mood', 'M'], inf: ['mood', 'N'], ptc: ['mood', 'P'],
  act: ['voice', 'A'], mid: ['voice', 'M'], pass: ['voice', 'P'],
  comp: ['degree', 'C'], superl: ['degree', 'S'],
};
const FEATURES = ['case', 'number', 'gender', 'person', 'tense', 'voice', 'mood'];
const NOMINAL_POS = new Set(['noun', 'proper noun', 'adjective', 'article', 'pronoun', 'numeral']);

/** lxx-morph's reading in the common form: { cls, feats: {feature: Set}, slash, empty }. */
export function lxxFeatures(w) {
  const feats = {};
  let slash = false;
  for (const tok of (w.parsing ?? '').trim().split(/\s+/).filter(Boolean)) {
    const vals = tok.split('/');
    const known = vals.map((v) => LXX_TOKEN[v]).filter(Boolean);
    if (known.length === 0) continue;
    const feat = known[0][0];
    feats[feat] ??= new Set();
    for (const [, v] of known) feats[feat].add(v);
    if (vals.length > 1) slash = true;
  }
  const empty = !(w.parsing ?? '').trim();
  const verb = w.pos === 'verb' || w.pos === 'participle' || feats.tense || feats.mood;
  const cls = verb ? 'verb' : feats.case || NOMINAL_POS.has(w.pos) ? 'nominal' : 'none';
  return { cls, feats, slash, empty, indecl: cls === 'nominal' && !feats.case };
}

// TAGNT's deponent voices (D middle, O passive, N either, 'with an active meaning') are compared as any voice: lxx-morph writes εἰμί's future
// ἔσται as active ('εἰμί has no middle voice', its README), TAGNT as V-FDI, a difference of convention and not of reading.
const VOICE = { A: ['A'], M: ['M'], P: ['P'], E: ['M', 'P'], D: ['A', 'M', 'P'], O: ['A', 'M', 'P'], N: ['A', 'M', 'P'], Q: ['A'] };
const NOMINAL_HEADS = new Set(['N', 'A', 'T', 'P', 'R', 'D', 'I', 'X', 'K', 'C', 'Q', 'F', 'S']);

/** A TAGNT code (N-NSM, V-2AAI-3S, P-1GS, S-1SNSM, A-NSM-C, PREP ...) in the common form. */
export function codeFeatures(code) {
  const parts = code.split(/\s/)[0].split('-');
  const head = parts[0];
  const feats = {};
  const set = (f, v) => (feats[f] = new Set(Array.isArray(v) ? v : [v]));
  if (head === 'V' && parts[1]) {
    const tvm = parts[1].replace(/^\d/, '');
    set('tense', tvm[0]);
    if (VOICE[tvm[1]]) set('voice', VOICE[tvm[1]]);
    const mood = tvm[2] === 'R' ? 'P' : tvm[2];
    set('mood', mood);
    const rest = parts[2] ?? '';
    if (mood === 'P' && /^[NGDAV][SP][MFN]$/.test(rest)) {
      set('case', rest[0]);
      set('number', rest[1]);
      set('gender', rest[2]);
    } else if (/^[123][SP]$/.test(rest)) {
      set('person', rest[0]);
      set('number', rest[1]);
    }
    return { cls: 'verb', feats, indecl: false };
  }
  if (NOMINAL_HEADS.has(head) && parts[1]) {
    let s = parts[1];
    if (/^[123]/.test(s)) {
      set('person', s[0]);
      s = s.slice(1);
      if (head === 'S') s = s.slice(1); // the possessor's number
    }
    if (/^[NGDAV][SP][MFN]$/.test(s)) {
      set('case', s[0]);
      set('number', s[1]);
      set('gender', s[2]);
    } else if (/^[NGDAV][SP]$/.test(s)) {
      set('case', s[0]);
      set('number', s[1]);
    } else return { cls: 'nominal', feats: {}, indecl: true }; // N-PRI, A-NUI, N-OI ...
    return { cls: 'nominal', feats, indecl: false };
  }
  if (head === 'HEB' || head === 'ARAM') return { cls: 'nominal', feats: {}, indecl: true };
  return { cls: 'none', feats: {}, indecl: false };
}

/**
 * Ours (a TAGNT code's features) against theirs (lxx-morph's): 'agree' when every feature we give is one they give alone or within ours,
 * 'contradict' when a feature's values do not meet or the class differs (a verb against a noun, a noun against an uninflected word),
 * 'empty' when their parsing is empty and ours has features, 'open' when one of ours is a slash in theirs or missing. `why` names the features.
 */
export function compareParsing(o, t) {
  const why = [];
  const verbO = o.cls === 'verb';
  const verbT = t.cls === 'verb';
  if (verbO !== verbT) return { status: 'contradict', why: ['class'] };
  if (!o.indecl && !t.indecl && o.cls !== t.cls) return { status: 'contradict', why: ['class'] };
  let open = false;
  for (const f of FEATURES) {
    const ov = o.feats[f];
    if (!ov) continue;
    const tv = t.feats[f];
    if (!tv) {
      if (!t.indecl) open = true;
      continue;
    }
    const meet = [...tv].some((v) => ov.has(v));
    if (!meet) why.push(f);
    else if (![...tv].every((v) => ov.has(v))) open = true;
  }
  if (why.length > 0) return { status: 'contradict', why };
  if (t.empty && Object.keys(o.feats).length > 0) return { status: 'empty', why };
  return { status: open ? 'open' : 'agree', why };
}

const firstLemma = (l) => (l ?? '').split(',')[0].trim().normalize('NFC');
const noDiaeresis = (l) => l.normalize('NFD').replaceAll('̈', '').normalize('NFC');
/**
 * Headwords that name the same word by another dictionary's convention (TAGNT's against LSJ's, which lxx-morph follows): a suppletive verb under
 * another stem, a contracted adjective, a plural-only word. Read off the most frequent differences on the words both answer ('The lemma').
 */
const CONVENTION = {
  ἔπω: ['λέγω'], εἴδω: ['ὁράω', 'οἶδα'], φαγεῖν: ['ἐσθίω'], πλήθω: ['πίμπλημι'], ἐμπίμπλημι: ['ἐμπίπλημι'],
  χρύσεος: ['χρυσοῦς'], χείμαρρος: ['χειμάρρους'], χόος: ['χοῦς'], ἀμφότερος: ['ἀμφότεροι'],
};
/** The same word written by another convention: an active headword for a deponent (πορεύω, πορεύομαι), -ύω for -υμι (δεικνύω, δείκνυμι), οὕτω for οὕτως, or CONVENTION. */
function sameByConvention(a, b) {
  const x = bareOf(a);
  const y = bareOf(b);
  return (
    (CONVENTION[a] ?? []).includes(b) ||
    x.replace(/ω$/, 'ομαι') === y ||
    y.replace(/ω$/, 'ομαι') === x ||
    x.replace(/υω$/, 'υμι') === y ||
    `${x}σ` === y
  );
}
/** 'same' (NFC, up to a diaeresis), 'letters' (the same letters without accents, breathings or case), 'convention' (sameByConvention), or 'differ'. */
export function compareLemma(ours, theirs) {
  const a = firstLemma(ours);
  const b = firstLemma(theirs);
  if (noDiaeresis(a) === noDiaeresis(b)) return 'same';
  if (bareOf(a) === bareOf(b)) return 'letters';
  if (sameByConvention(a, b)) return 'convention';
  return 'differ';
}
const lemmaMeets = (ours, theirs) => compareLemma(ours, theirs) !== 'differ';

/**
 * A reading is settled when its parsing has no slash and is not empty, or the word does not inflect (a preposition, a conjunction: no parsing to give).
 * An empty parsing on a noun or a name (lxx-morph's 'Hebrew indeclinables: lemma = surface, parsing = ""') gives the lemma only: no case.
 */
export const settledReading = (r) => !r.f.slash && (!r.f.empty || r.f.cls === 'none');

// ---------------------------------------------------------------- the verse match

const loosen = (s) => bareOf(s).replaceAll('ει', 'ι').replace(/ν$/, '');
const TIERS = [keyOf, bareOf, loosen];

function counts(keys) {
  const m = new Map();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}
function dice(a, b) {
  let inter = 0;
  for (const [k, n] of a) inter += Math.min(n, b.get(k) ?? 0);
  let na = 0;
  let nb = 0;
  for (const n of a.values()) na += n;
  for (const n of b.values()) nb += n;
  return na + nb === 0 ? 0 : (2 * inter) / (na + nb);
}

/** The Rahlfs verses of one Swete book: every file it maps to, each verse with its words' keys at each tier, and an index of the rarer keys. */
function rahlfsBook(slugs, files) {
  const verses = [];
  for (const slug of slugs) {
    const data = files.get(slug);
    data.forEach((v, i) => {
      const words = v.words.map((w) => ({ ...w, keys: TIERS.map((t) => t(w.surface)), f: lxxFeatures(w) }));
      verses.push({ slug, ref: v.ref, cv: v.ref.split(' ').at(-1), i, words, bag: counts(words.map((w) => w.keys[1])) });
    });
  }
  const byCv = new Map();
  const df = new Map();
  verses.forEach((v, n) => {
    v.n = n;
    if (!byCv.has(v.cv)) byCv.set(v.cv, []);
    byCv.get(v.cv).push(v);
    for (const k of v.bag.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  });
  const index = new Map();
  verses.forEach((v) => {
    for (const k of v.bag.keys()) {
      if ((df.get(k) ?? 0) > 40) continue;
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(v);
    }
  });
  const next = (v, d) => {
    const w = verses[v.n + d];
    return w && w.slug === v.slug ? w : undefined;
  };
  return { verses, byCv, index, next };
}

/** The Rahlfs verse that one Swete verse is: 'same' (its chapter and verse), 'moved' (found by its rarer words) or none. */
function matchVerse(rb, cv, bag) {
  let best;
  let bestScore = 0;
  for (const v of rb.byCv.get(cv) ?? []) {
    const s = dice(bag, v.bag);
    if (s > bestScore) [best, bestScore] = [v, s];
  }
  if (best && bestScore >= 0.5) return { verse: best, how: 'same', score: bestScore };
  const tally = new Map();
  for (const k of bag.keys()) for (const v of rb.index.get(k) ?? []) tally.set(v, (tally.get(v) ?? 0) + 1);
  const top = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 8);
  let moved;
  let movedScore = 0;
  for (const [v] of top) {
    const s = dice(bag, v.bag);
    if (s > movedScore) [moved, movedScore] = [v, s];
  }
  if (moved && movedScore >= 0.5 && movedScore > bestScore) return { verse: moved, how: 'moved', score: movedScore };
  if (best && bestScore >= 0.3) return { verse: best, how: 'same', score: bestScore };
  // A long Swete verse that Rahlfs cuts into several (Esther's additions): the run of verses around the best one that
  // share its rarer words, joined.
  if (top.length > 0) {
    const [t] = top[0];
    // grow from the best verse while the next verse on that side (or the one after it) is mostly inside the Swete verse: 60% of its words in it
    const inside = (v) => {
      let n = 0;
      let all = 0;
      for (const [k, c] of v.bag) {
        all += c;
        n += Math.min(c, bag.get(k) ?? 0);
      }
      return all > 0 && n / all >= 0.6;
    };
    const shares = (n) => rb.verses[n]?.slug === t.slug && inside(rb.verses[n]);
    let from = t.n;
    let to = t.n;
    for (;;) {
      if (shares(from - 1)) from -= 1;
      else if (shares(from - 2)) from -= 2;
      else break;
    }
    for (;;) {
      if (shares(to + 1)) to += 1;
      else if (shares(to + 2)) to += 2;
      else break;
    }
    const run = rb.verses.slice(from, to + 1);
    const joined = { slug: t.slug, ref: `${run[0].ref}-${run.at(-1).cv}`, n: -1, words: run.flatMap((v) => v.words), bag: counts(run.flatMap((v) => v.words.map((w) => w.keys[1]))) };
    const s = dice(bag, joined.bag);
    if (to > from && s >= 0.5) return { verse: joined, how: 'joined', score: s };
  }
  return undefined;
}

const sig = (w) => `${w.lemma}|${w.parsing}`;

/**
 * Each Swete word of one book with lxx-morph's reading: { ref, form, status: 'one' | 'several' | 'no form' | 'no verse', reading, how }.
 */
function readBook(sweteWords, rb) {
  const byVerse = new Map();
  for (const w of sweteWords) {
    if (!byVerse.has(w.verse)) byVerse.set(w.verse, []);
    byVerse.get(w.verse).push(w);
  }
  const out = new Map();
  const verseStats = { verses: 0, same: 0, moved: 0, joined: 0, none: 0 };
  for (const [verse, words] of byVerse) {
    verseStats.verses++;
    const cv = verse.split('.').at(-1);
    const keys = words.map((w) => TIERS.map((t) => t(w.form)));
    const m = matchVerse(rb, cv, counts(keys.map((k) => k[1])));
    if (!m) {
      verseStats.none++;
      for (const w of words) out.set(w.ref, { ref: w.ref, form: w.form, status: 'no verse' });
      continue;
    }
    verseStats[m.how]++;
    const near = m.how === 'joined' ? [] : [rb.next(m.verse, -1), rb.next(m.verse, 1)].filter(Boolean);
    words.forEach((w, i) => {
      let found;
      for (let t = 0; t < TIERS.length && !found; t++) {
        const k = keys[i][t];
        const mine = keys.map((ks) => ks[t]);
        const k_th = mine.slice(0, i).filter((x) => x === k).length;
        const ofMine = mine.filter((x) => x === k).length;
        const theirs = m.verse.words.filter((rw) => rw.keys[t] === k);
        if (theirs.length > 0) {
          if (theirs.length === ofMine) found = { status: 'one', reading: theirs[k_th], how: m.how, tier: t };
          else if (new Set(theirs.map(sig)).size === 1) found = { status: 'one', reading: theirs[0], how: m.how, tier: t };
          else found = { status: 'several' };
          continue;
        }
        const around = near.flatMap((v) => v.words.filter((rw) => rw.keys[t] === k));
        if (around.length > 0 && ofMine === 1 && new Set(around.map(sig)).size === 1) found = { status: 'one', reading: around[0], how: 'next verse', tier: t };
      }
      out.set(w.ref, { ref: w.ref, form: w.form, ...(found ?? { status: 'no form' }) });
    });
  }
  return { readings: out, verseStats };
}

// ---------------------------------------------------------------- the derivation's files

function tsv(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
  const head = lines[0].split('\t');
  return lines.slice(1).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [head[i], v])));
}
const candidatesOfCell = (cell) =>
  (cell ?? '')
    .split(' | ')
    .filter(Boolean)
    .map((c) => {
      const [lemma, morph, support] = c.split('/');
      return { lemma, morph, support };
    });

/** Our candidates that lxx-morph's reading leaves: the lemma meets and no feature contradicts. Deduplicated by lemma and features. */
function compatible(cands, r) {
  const seen = new Set();
  const out = [];
  for (const c of cands) {
    if (!lemmaMeets(c.lemma, r.lemma)) continue;
    const of = codeFeatures(c.morph);
    const cmp = compareParsing(of, r.f);
    if (cmp.status === 'contradict') continue;
    const k = `${bareOf(firstLemma(c.lemma))}|${of.cls}|${FEATURES.map((f) => [...(of.feats[f] ?? [])].sort().join('')).join('.')}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...c, cmp });
  }
  return out;
}

// ---------------------------------------------------------------- the run

const pct = (a, b) => (b === 0 ? '-' : `${((100 * a) / b).toFixed(1)}%`);
const fmt = (n) => n.toLocaleString('en-GB');
const row = (cells) => `| ${cells.join(' | ')} |`;
function table(head, rows) {
  return [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
}

/** A seeded order (FNV-1a of the ref), so the sample of contradictions is the same on every run. */
function hash(s) {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 0x01000193) >>> 0;
  return h;
}

async function main() {
  const argv = process.argv.slice(2);
  const log = (s = '') => console.log(s);
  mkdirSync(PROBE_DIR, { recursive: true });
  await fetchPinned(RAW_DIR, LXX_MORPH, undefined, (l) => console.error(l));
  const files = new Map(SLUGS.map((s) => [s, JSON.parse(readFileSync(pinnedPath(RAW_DIR, LXX_MORPH, `db/seeds/lxx_morph/${s}.json`), 'utf8'))]));
  const input = await loadInput(RAW_DIR, undefined, (l) => console.error(l));
  const books = splitBooks(input);
  const codes = OLD_TESTAMENT.map(([c]) => c.toLowerCase());
  for (const code of codes) if (!existsSync(join(OUT_DIR, 'pending', `${code}.tsv`))) throw new Error(`no data/lxx/pending/${code}.tsv: run npm run lxx:derive -- --all first`);

  log(`lxx-morph at ${LXX_MORPH.repo}@${LXX_MORPH.commit}`);
  // ---- the readings of every Swete word of the 39 books
  const readings = new Map();
  const formOf = new Map();
  const displayOf = new Map();
  const verseRows = [];
  for (const code of codes) {
    const tokens = books.get(code) ?? books.get(code.toUpperCase()) ?? [...books].find(([c]) => c.toLowerCase() === code)?.[1];
    for (const w of tokens.words) {
      formOf.set(w.ref, w.form);
      displayOf.set(w.ref, w.display);
    }
    const rb = rahlfsBook(BOOKS[code], files);
    const { readings: r, verseStats } = readBook(tokens.words, rb);
    for (const [ref, x] of r) readings.set(ref, x);
    verseRows.push([code, verseStats]);
  }
  const reading = (ref) => {
    const x = readings.get(ref);
    if (x?.status !== 'one') return x;
    return { ...x, r: { ...x.reading, f: x.reading.f } };
  };

  // ---- coverage over the pending words
  const covRows = [];
  const total = { pending: 0, one: 0, several: 0, noForm: 0, noVerse: 0, settled: 0, slash: 0, nomvoc: 0, empty: 0, among: 0, amongAny: 0, none: 0, noneAnswered: 0, noneSettled: 0 };
  const pendingOf = new Map();
  for (const code of codes) {
    const rows = tsv(join(OUT_DIR, 'pending', `${code}.tsv`));
    pendingOf.set(code, rows);
    const c = { pending: rows.length, one: 0, several: 0, noForm: 0, noVerse: 0, settled: 0, slash: 0, nomvoc: 0, empty: 0, among: 0, amongAny: 0, none: 0, noneAnswered: 0, noneSettled: 0 };
    for (const p of rows) {
      const cands = candidatesOfCell(p.candidates);
      const x = reading(p.ref);
      if (cands.length === 0) c.none++;
      if (!x || x.status === 'no verse') c.noVerse++;
      else if (x.status === 'no form') c.noForm++;
      else if (x.status === 'several') c.several++;
      if (x?.status !== 'one') continue;
      c.one++;
      const r = x.r;
      if (r.f.slash) {
        c.slash++;
        const cs = r.f.feats.case;
        if (cs && cs.size === 2 && cs.has('N') && cs.has('V') && !Object.entries(r.f.feats).some(([f, s]) => f !== 'case' && s.size > 1)) c.nomvoc++;
      } else if (r.f.empty && r.f.cls !== 'none') c.empty++;
      else c.settled++;
      const comp = compatible(cands, r);
      if (settledReading(r) && comp.some((k) => k.cmp.status === 'agree')) c.among++;
      if (comp.length > 0) c.amongAny++;
      if (cands.length === 0) {
        if (r.lemma) c.noneAnswered++;
        if (r.lemma && settledReading(r)) c.noneSettled++;
      }
    }
    covRows.push([code, c]);
    for (const k of Object.keys(total)) total[k] += c[k];
  }
  log('\n## Coverage of the pending words\n');
  log(
    table(
      ['book', 'pending', 'one reading', 'several readings', 'form not in the verse', 'verse not matched', 'settled', 'left open (slash)', 'of which only nom/voc', 'empty', 'settled and among our candidates', 'leaves at least one candidate', 'no candidate', 'no candidate: answered', 'no candidate: settled answer'],
      [...covRows, ['total', total]].map(([b, c]) => [b, fmt(c.pending), `${fmt(c.one)} (${pct(c.one, c.pending)})`, fmt(c.several), fmt(c.noForm), fmt(c.noVerse), fmt(c.settled), fmt(c.slash), fmt(c.nomvoc), fmt(c.empty), fmt(c.among), fmt(c.amongAny), fmt(c.none), fmt(c.noneAnswered), fmt(c.noneSettled)]),
    ),
  );
  log('\n## The verse match\n');
  const vt = { verses: 0, same: 0, moved: 0, joined: 0, none: 0 };
  for (const [, s] of verseRows) for (const k of Object.keys(vt)) vt[k] += s[k];
  log(table(['book', 'Swete verses', 'same chapter and verse', 'found by its words elsewhere', 'several Rahlfs verses joined', 'not matched'], [...verseRows, ['total', vt]].map(([b, s]) => [b, fmt(s.verses), fmt(s.same), fmt(s.moved), fmt(s.joined), fmt(s.none)])));

  // ---- accuracy: every word layers 1, 2 and 2a settled, and M1's choices
  const acc = new Map();
  const accKey = (set, r) => `${set}\t${r.confidence}\t${r.source}`;
  const contradictions = [];
  const lemmaDiffs = [];
  const bump = (k, field) => {
    if (!acc.has(k)) acc.set(k, { n: 0, lemmaSame: 0, lemmaLetters: 0, lemmaConvention: 0, agree: 0, open: 0, empty: 0, contradict: 0, full: 0, settledN: 0, settledContradict: 0, settledFull: 0 });
    acc.get(k)[field]++;
  };
  const compareWord = (set, ref, lemma, morph, extra = {}) => {
    const x = reading(ref);
    if (x?.status !== 'one') return undefined;
    const r = x.r;
    const lem = compareLemma(lemma, r.lemma);
    const cmp = compareParsing(codeFeatures(morph), r.f);
    for (const k of [accKey(set, r), `${set}\tall\tall`]) {
      bump(k, 'n');
      if (lem === 'same') bump(k, 'lemmaSame');
      if (lem === 'same' || lem === 'letters') bump(k, 'lemmaLetters');
      if (lem !== 'differ') bump(k, 'lemmaConvention');
      bump(k, cmp.status);
      if (lem !== 'differ' && cmp.status === 'agree') bump(k, 'full');
      if (settledReading(r)) {
        bump(k, 'settledN');
        if (lem === 'differ' || cmp.status === 'contradict') bump(k, 'settledContradict');
        if (lem !== 'differ' && cmp.status === 'agree') bump(k, 'settledFull');
      }
    }
    const item = { set, ref, form: formOf.get(ref), ours: `${lemma} ${morph}`, theirs: `${r.lemma} [${r.parsing}] ${r.pos}`, conf: r.confidence, source: r.source, reason: r.reasoning, why: cmp.why.join(','), how: x.how, ...extra };
    if (cmp.status === 'contradict') contradictions.push(item);
    if (lem === 'differ') lemmaDiffs.push(item);
    return { lem, cmp, r };
  };
  for (const code of codes) {
    for (const d of tsv(join(OUT_DIR, 'derived', `${code}.tsv`))) compareWord(`layer ${d.layer}`, d.ref, d.lemma, d.parsing, { confidence: d.confidence });
  }
  const m1 = tsv(join(OUT_DIR, 'choices', 'gen-01.tsv'));
  const genPending = new Map(pendingOf.get('gen').map((p) => [p.ref, candidatesOfCell(p.candidates)]));
  const m1Answers = new Map();
  for (const ch of m1) {
    const lemma = ch.lemma || genPending.get(ch.ref)?.find((c) => c.morph === ch.parsing)?.lemma || '';
    m1Answers.set(ch.ref, { lemma, morph: ch.parsing, mark: ch.mark });
    compareWord('M1 gen-01', ch.ref, lemma, ch.parsing, { mark: ch.mark });
  }
  log('\n## Accuracy where Lampas has an answer\n');
  const accRows = [...acc].sort(([a], [b]) => a.localeCompare(b));
  log(
    table(
      ['set', 'confidence', 'source', 'words', 'same lemma', 'same letters', 'same word by convention', 'parsing agreed', 'left open', 'empty', 'contradicted', 'lemma and parsing agreed', 'settled readings', 'of those, lemma or parsing contradicted'],
      accRows.map(([k, a]) => [...k.split('\t'), fmt(a.n), pct(a.lemmaSame, a.n), pct(a.lemmaLetters, a.n), pct(a.lemmaConvention, a.n), pct(a.agree, a.n), pct(a.open, a.n), pct(a.empty, a.n), `${fmt(a.contradict)} (${pct(a.contradict, a.n)})`, pct(a.full, a.n), fmt(a.settledN), `${fmt(a.settledContradict)} (${pct(a.settledContradict, a.settledN)})`]),
    ),
  );
  const whyCount = new Map();
  for (const c of contradictions) whyCount.set(`${c.set.startsWith('M1') ? 'M1' : 'layers'}: ${c.why}`, (whyCount.get(`${c.set.startsWith('M1') ? 'M1' : 'layers'}: ${c.why}`) ?? 0) + 1);
  log('\nWhat the contradictions are in (the features that do not meet):\n');
  log(table(['set: features', 'words'], [...whyCount].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => [k, fmt(n)])));

  // ---- the sample to read by hand: 15 from M1's choices, 15 from the layers' answers, in a seeded order
  const verseText = (ref) => {
    const v = ref.split('#')[0];
    return [...displayOf].filter(([r]) => r.split('#')[0] === v).map(([, d]) => d).join(' ');
  };
  const pick = (list, n) => [...list].sort((a, b) => hash(a.ref) - hash(b.ref)).slice(0, n);
  const fromM1 = pick(contradictions.filter((c) => c.set.startsWith('M1')), 15);
  const sample = [...fromM1, ...pick(contradictions.filter((c) => !c.set.startsWith('M1')), 30 - fromM1.length)];
  const sampleText = sample.map((c, i) => `${i + 1}. ${c.ref} (${c.set}) ${c.form}\n   ours:   ${c.ours}\n   theirs: ${c.theirs} (${c.conf}, ${c.source}; ${c.reason})\n   differ in: ${c.why}\n   Swete: ${verseText(c.ref)}`).join('\n');
  writeFileSync(join(PROBE_DIR, 'sample.txt'), `${sampleText}\n`);
  writeFileSync(join(PROBE_DIR, 'contradictions.tsv'), ['set\tref\tform\tours\ttheirs\tconfidence\tsource\twhy\treasoning', ...contradictions.map((c) => [c.set, c.ref, c.form, c.ours, c.theirs, c.conf, c.source, c.why, c.reason].join('\t'))].join('\n') + '\n');
  writeFileSync(join(PROBE_DIR, 'lemma-differ.tsv'), ['set\tref\tform\tours\ttheirs\tconfidence\tsource', ...lemmaDiffs.map((c) => [c.set, c.ref, c.form, c.ours, c.theirs, c.conf, c.source].join('\t'))].join('\n') + '\n');
  const pairs = new Map();
  for (const d of lemmaDiffs) {
    const k = `${d.ours.split(' ')[0]} -> ${d.theirs.split(' ')[0]}`;
    pairs.set(k, (pairs.get(k) ?? 0) + 1);
  }
  log('\nThe lemmas that differ most often (ours -> theirs):\n');
  log(table(['ours -> theirs', 'words'], [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => [k, fmt(n)])));
  log(`\n${fmt(contradictions.length)} parsing contradictions and ${fmt(lemmaDiffs.length)} lemma differences written under ${PROBE_DIR}; the sample of 30 is sample.txt.`);

  // ---- the saving: the rules over the pending words, and the batches left
  const RULES = {
    strict: (cands, r) => {
      if (r.confidence !== 'high' || !settledReading(r)) return undefined;
      const agree = compatible(cands, r).filter((k) => k.cmp.status === 'agree');
      return agree.length === 1 ? agree[0] : undefined;
    },
    'strict, medium too': (cands, r) => {
      if (r.confidence === 'low' || !settledReading(r)) return undefined;
      const agree = compatible(cands, r).filter((k) => k.cmp.status === 'agree');
      return agree.length === 1 ? agree[0] : undefined;
    },
    'strict, between lemmas only': (cands, r) => {
      if (r.confidence !== 'high' || !settledReading(r)) return undefined;
      const agree = compatible(cands, r).filter((k) => k.cmp.status === 'agree');
      if (agree.length !== 1) return undefined;
      // no other candidate of the same lemma: lxx-morph chooses the word, never a case, gender or person of it
      const same = cands.filter((c) => bareOf(firstLemma(c.lemma)) === bareOf(firstLemma(agree[0].lemma)));
      return new Set(same.map((c) => c.morph)).size === 1 ? agree[0] : undefined;
    },
    loose: (cands, r) => {
      const comp = compatible(cands, r);
      return comp.length === 1 ? comp[0] : undefined;
    },
  };
  const take = new Map(Object.keys(RULES).map((k) => [k, new Map()]));
  const baselineBatches = codes.reduce((n, code) => n + cutBatches(pendingOf.get(code)).length, 0);
  const saveRows = [];
  for (const [name, rule] of Object.entries(RULES)) {
    let taken = 0;
    let batches = 0;
    let m1n = 0;
    let m1Lemma = 0;
    let m1Full = 0;
    const m1Miss = [];
    for (const code of codes) {
      const left = [];
      for (const p of pendingOf.get(code)) {
        const x = reading(p.ref);
        const cands = candidatesOfCell(p.candidates);
        const t = x?.status === 'one' && cands.length > 0 ? rule(cands, x.r) : undefined;
        if (t) {
          taken++;
          take.get(name).set(p.ref, t);
          const m = m1Answers.get(p.ref);
          if (m) {
            m1n++;
            const lemOk = compareLemma(m.lemma, t.lemma) === 'same';
            const fullOk = lemOk && compareParsing(codeFeatures(m.morph), codeFeatures(t.morph)).status === 'agree';
            if (lemOk) m1Lemma++;
            if (fullOk) m1Full++;
            else m1Miss.push(`${p.ref} ${formOf.get(p.ref)}: M1 ${m.lemma} ${m.morph}; rule ${t.lemma} ${t.morph}; lxx-morph ${x.r.lemma} [${x.r.parsing}] ${x.r.confidence} ${x.r.source}`);
          }
        } else left.push(p);
      }
      batches += cutBatches(left).length;
    }
    writeFileSync(join(PROBE_DIR, `m1-differ-${name.replace(/[^a-z]+/g, '-')}.txt`), `${m1Miss.join('\n')}\n`);
    saveRows.push([name, fmt(taken), pct(taken, total.pending), fmt(total.pending - taken), fmt(batches), fmt(baselineBatches - batches), `${m1Lemma}/${m1n} (${pct(m1Lemma, m1n)})`, `${m1Full}/${m1n} (${pct(m1Full, m1n)})`]);
  }

  // ---- loose and the agreement check: each pending word's candidates narrowed to what lxx-morph leaves, then the check again
  if (!argv.includes('--no-check')) {
    const trained = train(input);
    let taken = 0;
    let batches = 0;
    let idem = 0;
    let filePending = 0;
    let m1n = 0;
    let m1Lemma = 0;
    let m1Full = 0;
    let breaks = 0;
    const m1Miss = [];
    for (const code of codes) {
      const tokens = [...books].find(([c]) => c.toLowerCase() === code)[1];
      const cache = readMorpheusCache(MORPHEUS_DIR, code);
      const result = deriveBook(input, code, undefined, trained, tokens, cache && cache.size > 0 ? cache : undefined);
      filePending += result.pending.length;
      const outOf = new Map([...result.derived, ...result.pending].map((o) => [o.ref, o]));
      const outs = result.words.map((w) => outOf.get(w.ref));
      const ctx = { names: trained.index.names, parse: (form) => parse(form, trained.parser) };
      idem += checkAgreement(result.words, outs, ctx).outs.filter((o) => !('layer' in o)).length;
      const narrowed = outs.map((o) => {
        if ('layer' in o) return o;
        const x = reading(o.ref);
        if (x?.status !== 'one' || o.candidates.length === 0) return o;
        const keep = new Set(compatible(o.candidates, x.r).map((c) => `${c.lemma}|${c.morph}`));
        const cands = o.candidates.filter((c) => keep.has(`${c.lemma}|${c.morph}`));
        const seen = new Set();
        const uniq = cands.filter((c) => {
          const k = `${bareOf(firstLemma(c.lemma))}|${JSON.stringify(codeFeatures(c.morph), (_, v) => (v instanceof Set ? [...v].sort() : v))}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (uniq.length === 1) return { ref: o.ref, lemma: uniq[0].lemma, morph: uniq[0].morph, layer: 'lxx', confidence: 0.8, candidates: o.candidates, notes: ['lxx-morph'] };
        if (cands.length === 0) return o;
        return { ...o, candidates: cands };
      });
      // only the agreement links again (agree): the name and shared-ending rules have run already, and would demote a word lxx-morph settled
      const outcome = agree(result.words.map((w, i) => ({ ref: w.ref, verse: w.verse, out: narrowed[i], pause: pauseAfter(w.display), ...(!('layer' in narrowed[i]) && narrowed[i].notes.includes(NOTE_NAME) ? { held: true } : {}) })));
      breaks += outcome.breaks;
      const checked = outcome.outs;
      const left = checked.filter((o) => !('layer' in o));
      taken += result.pending.length - left.length;
      batches += cutBatches(left).length;
      if (code === 'gen') {
        for (const o of checked) {
          const m = m1Answers.get(o.ref);
          if (!m || !('layer' in o) || !outOf.get(o.ref) || 'layer' in outOf.get(o.ref)) continue;
          m1n++;
          const lemOk = compareLemma(m.lemma, o.lemma) === 'same';
          if (lemOk) m1Lemma++;
          if (lemOk && compareParsing(codeFeatures(m.morph), codeFeatures(o.morph)).status === 'agree') m1Full++;
          else m1Miss.push(`${o.ref} ${formOf.get(o.ref)}: M1 ${m.lemma} ${m.morph}; rule ${o.lemma} ${o.morph} (${o.layer})`);
        }
        writeFileSync(join(PROBE_DIR, 'm1-differ-loose-and-the-agreement-check.txt'), `${m1Miss.join('\n')}\n`);
      }
    }
    log(`\nRe-derived pending: ${fmt(filePending)} (the files: ${fmt(total.pending)}); the agreement check run again on the unchanged words leaves ${fmt(idem)}; the links run again with lxx-morph's readings found ${fmt(breaks)} breaks.`);
    saveRows.push(['loose and the agreement check', fmt(taken), pct(taken, total.pending), fmt(total.pending - taken), fmt(batches), fmt(baselineBatches - batches), `${m1Lemma}/${m1n} (${pct(m1Lemma, m1n)})`, `${m1Full}/${m1n} (${pct(m1Full, m1n)})`]);
  }
  log(`\n## The saving (batches of about 700, cut as scripts/lxx/batches.ts cuts them; ${fmt(baselineBatches)} today)\n`);
  log(table(['rule', 'pending words taken', 'share', 'pending left', 'batches left', 'batches saved', "M1's choice: same lemma", "M1's choice: same lemma and parsing"], saveRows));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
