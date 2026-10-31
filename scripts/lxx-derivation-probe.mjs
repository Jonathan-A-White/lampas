#!/usr/bin/env node
// The Septuagint derivation probe (story mw-cbsbw9q.3; the write-up is docs/sources/lxx-derivation-probe.md).
// Not shipped in the app, not in the gate. It derives a lemma and a parsing (TAGNT's code style) for each word of
// Swete's Greek in three layers and measures the same pipeline on John 1 against TAGNT:
//   layer 1  the form as TAGNT has it anywhere in the New Testament (one analysis, or one with >= 95% of 20+ tokens)
//   layer 2  a parser: ending rules learned from TAGNT's own (form, lemma, parsing) triples, with the augment,
//            reduplication and compound prefixes undone, proposing only lemmas in STEPBible's TBESG lexicon
//   layer 3  a model choosing among the candidates of layers 1 and 2 when they leave more than one (MODEL_CHOICES
//            below: in this probe the model was the Builder's own session, not a paid API call)
// No source is committed: each is fetched at a pinned commit into a cache outside git (LXX_PROBE_CACHE, default
// ~/.cache/lampas-lxx-probe/pinned), and the tables are written there too.
//
//   node scripts/lxx-derivation-probe.mjs --sample        Swete Gen 1 and Greek Ps 22 (English Ps 23): table + counts
//   node scripts/lxx-derivation-probe.mjs --john          John 1 with all of John hidden from layer 1, scored on TAGNT
//   node scripts/lxx-derivation-probe.mjs --pending ...   with --sample or --john: the words still waiting for a model choice
//   node scripts/lxx-derivation-probe.mjs --word <ref>    with --sample or --john: one word's candidates (e.g. Gen.1:2#5)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SWETE = {
  repo: 'eliranwong/LXX-Swete-1930',
  commit: '1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33',
  files: ['00-Swete_versification.csv', '01-Swete_word_with_punctuations.csv', 'LICENSE', 'README.md'],
};
const STEP = {
  repo: 'STEPBible/STEPBible-Data',
  commit: 'be4191f0082aeedddb0eff0c02c966292b2bd641',
  files: [
    'Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    'Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
    'Versification/TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt',
  ],
};

const CACHE = process.env.LXX_PROBE_CACHE || path.join(os.homedir(), '.cache', 'lampas-lxx-probe', 'pinned');

async function pinned(src, file) {
  const local = path.join(CACHE, src.repo.replace('/', '_'), src.commit, file);
  if (!fs.existsSync(local)) {
    const url = `https://raw.githubusercontent.com/${src.repo}/${src.commit}/${file.split('/').map(encodeURIComponent).join('/')}`;
    process.stderr.write(`fetching ${url}\n`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(local, 'utf8').replace(/^\uFEFF/, '');
}

// ---------------------------------------------------------------- Greek normalisation

const GRAVE = '\u0300', ACUTE = '\u0301', CIRC = '\u0342';
const ELISION = /[\u1FBD\u2019\u02BC'\u1FBF\u2018]/g; // koronis, apostrophes: an elided vowel
const PUNCT = /[.,;:!?()[\]{}"\u00B7\u0387\u037E\u201C\u201D\u00AB\u00BB\u2014\u2013\-\u2E00-\u2E7F\u00B6\u00A7*+\u2020\u2021]/g;

/** The look-up key: lower case, grave as acute, an enclitic's second accent dropped, elision as ’. */
export function keyOf(word) {
  let d = word.replace(PUNCT, '').replace(ELISION, '’').normalize('NFD').toLowerCase().replaceAll(GRAVE, ACUTE);
  const accents = [...d].filter((c) => c === ACUTE || c === CIRC).length;
  if (accents >= 2) {
    const i = Math.max(d.lastIndexOf(ACUTE), d.lastIndexOf(CIRC));
    d = d.slice(0, i) + d.slice(i + 1);
  }
  return d.normalize('NFC');
}
/** No marks at all, final sigma as sigma: the parser's alphabet. */
export function bareOf(word) {
  return word.replace(PUNCT, '').replace(ELISION, '').normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase().replaceAll('ς', 'σ');
}
const hasAccent = (word) => /[\u0301\u0300\u0342]/.test(word.normalize('NFD'));
const hasLower = (word) => word !== word.toUpperCase();

// ---------------------------------------------------------------- TAGNT

/** Strips TAGNT's semantic tags from a noun (N-NSM-T -> N-NSM, N-GSF-L -> N-GSF); keeps every grammatical part. */
export function normMorph(m) {
  if (m.startsWith('N-')) return m.split('-').slice(0, 2).join('-');
  return m;
}
const posOf = (m) => m.split('-')[0];
/** A part of speech, and a noun's gender (N:F): what the New Testament shows a lemma as. */
const posKey = (m) => (m.startsWith('N-') && m !== 'N-PRI' ? `N:${m.split('-')[1].slice(-1)}` : posOf(m));

function readTagnt(texts) {
  const rows = [];
  for (const text of texts) {
    for (const line of text.split('\n')) {
      const m = /^([1-3A-Z][A-Za-z]{2})\.(\d+)\.(\d+)#(\d+)=(\S+)\t/.exec(line);
      if (!m) continue;
      const c = line.split('\t');
      const form = c[1].split(' (')[0].trim();
      const g = c[3].split('=');
      const lemma = c[4].split('=')[0].trim();
      if (!form || !g[1] || !lemma) continue;
      rows.push({
        book: m[1], ch: +m[2], vs: +m[3], n: +m[4], type: m[5], form, lemma: lemma.normalize('NFC'),
        morph: normMorph(g[1].trim()), rawMorph: g[1].trim(), editions: c[5] || '',
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------- the lexicon of lemmas (TBESG)

function readTbesg(text) {
  /** bare lemma -> [{lemma, pos}] */
  const byBare = new Map();
  for (const line of text.split('\n')) {
    if (!/^G\d{4,5}[A-Za-z]?\t/.test(line)) continue;
    const c = line.split('\t');
    const lemma = (c[3] || '').trim().normalize('NFC');
    if (!lemma || /\s/.test(lemma)) continue;
    const pos = (c[5] || '').trim();
    const b = bareOf(lemma);
    if (!byBare.has(b)) byBare.set(b, []);
    byBare.get(b).push({ lemma, pos });
  }
  return byBare;
}

/** Whether a parsing fits what the lexicon says of the lemma (part of speech, a noun's gender). */
function fits(morph, entries, ntPos) {
  const p = posOf(morph);
  if (ntPos && ntPos.has(posKey(morph))) return true;
  if (!entries || entries.length === 0 || entries.every((e) => !e.pos)) return !ntPos || [...ntPos].some((k) => k.split(':')[0] === p);
  return entries.some(({ pos }) => {
    if (!pos) return true;
    const t = pos.replace(/^[GN]:/, '').split(' / ');
    return t.some((one) => {
      const [lp, lg] = one.split('-');
      if (lp === 'N' && p === 'N') {
        if (!lg || morph === 'N-PRI') return true;
        const g = morph.split('-')[1]?.slice(-1);
        return lg.split('/').includes(g);
      }
      if (lp === 'A') return p === 'A' || p === 'ADV';
      return lp === p;
    });
  });
}

// ---------------------------------------------------------------- layer 2: the parser

const PREPS = ['αμφι', 'ανα', 'αντι', 'απο', 'δια', 'εισ', 'εκ', 'εν', 'επι', 'κατα', 'μετα', 'παρα', 'περι', 'προ', 'προσ', 'συν', 'υπερ', 'υπο'];
const ASPIRATE = { π: 'φ', τ: 'θ', κ: 'χ' };
const TEMPORAL = [['ηυ', ['ευ', 'αυ']], ['ει', ['ε']], ['η', ['α', 'ε', 'αι']], ['ω', ['ο']]];
const VOWELS = 'αεηιουω';

/** The prefix as written before a vowel (elided, maybe aspirated) or before the augment. */
function elidedForms(p) {
  if (p === 'εκ') return ['εξ'];
  if (p === 'περι' || p === 'προ' || !VOWELS.includes(p.at(-1))) return [p];
  const e = p.slice(0, -1);
  const out = [e];
  if (ASPIRATE[e.at(-1)]) out.push(e.slice(0, -1) + ASPIRATE[e.at(-1)]);
  return out;
}
function assimilated(p, next) {
  if (p === 'συν') {
    if ('βπφμψ'.includes(next)) return 'συμ';
    if ('γκχξ'.includes(next)) return 'συγ';
    if (next === 'λ') return 'συλ';
    if (next === 'σ') return 'συσ';
  }
  if (p === 'εν') {
    if ('βπφμψ'.includes(next)) return 'εμ';
    if ('γκχξ'.includes(next)) return 'εγ';
    if (next === 'λ') return 'ελ';
  }
  return p;
}

/** Ways to undo an augment or reduplication: [{g, type}], 'none' first. */
export function unaugment(f) {
  const out = [{ g: f, type: 'none' }];
  if (f.startsWith('ερρ')) out.push({ g: f.slice(2), type: 'aug' });
  if (f[0] === 'ε' && f[1] && !VOWELS.includes(f[1])) out.push({ g: f.slice(1), type: 'aug' });
  for (const [t, froms] of TEMPORAL) if (f.startsWith(t)) for (const fr of froms) out.push({ g: fr + f.slice(t.length), type: 'aug' });
  if (f[1] === 'ε' && f[0] && !VOWELS.includes(f[0]) && (f[2] === f[0] || ASPIRATE[f[0]] === f[2])) out.push({ g: f.slice(2), type: 'redup' });
  for (const p of PREPS) {
    for (const e of elidedForms(p)) {
      const plain = p === 'εκ' ? 'εκ' : e;
      if (f.startsWith(e + 'ε') && f.length > e.length + 2 && !VOWELS.includes(f[e.length + 1])) {
        const rest = f.slice(e.length + 1);
        out.push({ g: assimilated(p, rest[0]) + rest, type: 'aug' });
        if (plain !== p) out.push({ g: p + rest, type: 'aug' });
      }
      for (const [t, froms] of TEMPORAL) {
        if (f.startsWith(e + t) && f.length > e.length + t.length + 1) {
          for (const fr of froms) out.push({ g: e + fr + f.slice(e.length + t.length), type: 'aug' });
        }
      }
    }
  }
  return out;
}

const commonPrefix = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

function trainParser(triples) {
  /** type|gs -> Map(ls|morph -> Set(lemma)) */
  const rules = new Map();
  for (const { form, lemma, morph } of triples) {
    const f = bareOf(form), l = bareOf(lemma);
    let best = null;
    for (const v of unaugment(f)) {
      const cp = commonPrefix(v.g, l);
      if (!best || cp > best.cp) best = { ...v, cp };
    }
    if (best.cp < 2) continue;
    const k = `${best.type}|${best.g.slice(best.cp)}`;
    if (!rules.has(k)) rules.set(k, new Map());
    const r = rules.get(k);
    const rk = `${l.slice(best.cp)}|${morph}`;
    if (!r.has(rk)) r.set(rk, new Set());
    r.get(rk).add(lemma);
  }
  return rules;
}

/** Candidates [{lemma, morph, support}] for a form, best first; only lemmas the lexicon has. */
function parse(form, rules, lexicon, ntPosByLemma) {
  const f = bareOf(form);
  const found = new Map();
  for (const v of unaugment(f)) {
    for (let s = 0; s <= Math.min(v.g.length - 2, 12); s++) {
      const gs = v.g.slice(v.g.length - s);
      const r = rules.get(`${v.type}|${gs}`);
      if (!r) continue;
      const stem = v.g.slice(0, v.g.length - s);
      for (const [rk, lemmas] of r) {
        const [ls, morph] = rk.split('|');
        const entries = lexicon.get(stem + ls);
        if (!entries) continue;
        for (const { lemma } of entries) {
          if (!fits(morph, entries.filter((e) => e.lemma === lemma), ntPosByLemma.get(lemma))) continue;
          const k = `${lemma}|${morph}`;
          found.set(k, (found.get(k) || 0) + lemmas.size);
        }
      }
    }
  }
  return [...found].map(([k, support]) => {
    const [lemma, morph] = k.split('|');
    return { lemma, morph, support };
  }).sort((a, b) => b.support - a.support || a.lemma.localeCompare(b.lemma) || a.morph.localeCompare(b.morph));
}

/**
 * The parser's second method, by analogy: a form whose stem the New Testament has with another ending (Γενηθήτωσαν
 * beside γενηθήτω) takes that form's lemma, and its parsing from the ending pair as other lemmas show it
 * (-ω V-APM-3S beside -ωσαν V-APM-3P). Used only when the ending rules find nothing.
 */
function trainAnalogy(triples) {
  const byLemma = new Map();
  for (const t of triples) {
    if (!byLemma.has(t.lemma)) byLemma.set(t.lemma, []);
    byLemma.get(t.lemma).push({ f: bareOf(t.form), morph: t.morph });
  }
  /** endA|morphA|endB -> Map(morphB -> count) */
  const pairs = new Map();
  /** bare prefix of 4 letters -> [{f, lemma, morph}] */
  const byPrefix = new Map();
  for (const [lemma, forms] of byLemma) {
    const uniq = [...new Map(forms.map((x) => [`${x.f}|${x.morph}`, x])).values()];
    for (const a of uniq) {
      const p4 = a.f.slice(0, 4);
      if (!byPrefix.has(p4)) byPrefix.set(p4, []);
      byPrefix.get(p4).push({ f: a.f, lemma, morph: a.morph });
      for (const b of uniq) {
        if (a === b) continue;
        const cp = commonPrefix(a.f, b.f);
        if (cp < 3 || a.f.length - cp > 6 || b.f.length - cp > 6) continue;
        const k = `${a.f.slice(cp)}|${a.morph}|${b.f.slice(cp)}`;
        if (!pairs.has(k)) pairs.set(k, new Map());
        pairs.get(k).set(b.morph, (pairs.get(k).get(b.morph) || 0) + 1);
      }
    }
  }
  return { pairs, byPrefix };
}

function byAnalogy(form, analogy) {
  const f = bareOf(form);
  const near = analogy.byPrefix.get(f.slice(0, 4)) || [];
  for (let k = f.length - 1; k >= 4; k--) {
    const found = new Map();
    for (const n of near) {
      if (commonPrefix(n.f, f) < k) continue;
      const m = analogy.pairs.get(`${n.f.slice(k)}|${n.morph}|${f.slice(k)}`);
      if (!m) continue;
      for (const [morph, c] of m) {
        const key = `${n.lemma}|${morph}`;
        found.set(key, (found.get(key) || 0) + c);
      }
    }
    if (found.size) {
      return [...found].map(([key, support]) => {
        const [lemma, morph] = key.split('|');
        return { lemma, morph, support };
      }).sort((a, b) => b.support - a.support || a.morph.localeCompare(b.morph));
    }
  }
  return [];
}

// ---------------------------------------------------------------- the pipeline

const DOMINANT = 0.95, DOMINANT_MIN = 20, PARSER_DOMINANT = 0.9;

function buildLayer1(rows) {
  /** key -> Map(lemma|morph -> count) */
  const byKey = new Map(), byBare = new Map();
  for (const r of rows) {
    const k = keyOf(r.form), a = `${r.lemma}|${r.morph}`;
    for (const [map, kk] of [[byKey, k], [byBare, bareOf(r.form)]]) {
      if (!map.has(kk)) map.set(kk, new Map());
      map.get(kk).set(a, (map.get(kk).get(a) || 0) + 1);
    }
  }
  return { byKey, byBare };
}

function analysesOf(map) {
  const total = [...map.values()].reduce((s, n) => s + n, 0);
  return [...map].map(([k, n]) => {
    const [lemma, morph] = k.split('|');
    return { lemma, morph, support: n, share: n / total };
  }).sort((a, b) => b.support - a.support);
}

/** Each word: its candidates and, when one stands, the layer that gave it. */
function derive(words, ctx) {
  const { layer1, rules, analogy, lexicon, ntPos, choices } = ctx;
  return words.map((w) => {
    const out = { ...w, notes: [] };
    const k = keyOf(w.form);
    let l1 = layer1.byKey.get(k);
    if (!l1 && !hasAccent(w.form)) {
      l1 = layer1.byBare.get(bareOf(w.form));
      if (l1) out.notes.push('unaccented: matched without accents');
    }
    if (!hasLower(w.form) && w.form.length > 1) out.notes.push('capitals');
    let cands, source;
    if (l1) {
      cands = analysesOf(l1);
      source = 1;
    } else {
      let p = parse(w.form, rules, lexicon, ntPos);
      // Swete's spellings: itacism (Δαυείδ for Δαυίδ, ἴδεν for εἶδεν) and the movable ν (πᾶσι for πᾶσιν), tried in turn
      for (const [why, alt] of p.length ? [] : spellings(w.form)) {
        const a1 = layer1.byBare.get(bareOf(alt));
        if (a1) {
          cands = analysesOf(a1);
          source = 1;
          out.notes.push(`spelling: ${why}`);
          break;
        }
        p = parse(alt, rules, lexicon, ntPos);
        if (p.length) {
          out.notes.push(`spelling: ${why}`);
          break;
        }
      }
      if (!cands && p.length === 0) {
        p = byAnalogy(w.form, analogy);
        if (p.length) out.notes.push('analogy: a sibling form in the New Testament');
      }
      if (!cands) {
        const total = p.reduce((s, c) => s + c.support, 0);
        cands = p.map((c) => ({ ...c, share: c.support / total }));
        source = 2;
      }
    }
    out.candidates = cands;
    // the second method on the same word: the parser, whatever layer 1 said
    out.parserTop = source === 1 ? parse(w.form, rules, lexicon, ntPos)[0] || null : cands[0] || null;
    const top = cands[0];
    const unique = new Set(cands.map((c) => `${c.lemma}|${c.morph}`)).size === 1;
    const total = cands.reduce((s, c) => s + c.support, 0);
    const guess = choices.get(w.ref);
    if (!top && guess && guess.lemma) {
      // nothing to choose from: the model's own lemma and parsing stand as a guess, marked
      out.notes.push('guess: the model answered with no candidates');
      Object.assign(out, { lemma: guess.lemma, morph: guess.morph, layer: 3, confidence: 0.4 });
    } else if (!top) {
      Object.assign(out, { lemma: '', morph: '', layer: 0, confidence: 0 });
    } else if (source === 1 && (unique || (top.share >= DOMINANT && total >= DOMINANT_MIN))) {
      Object.assign(out, { lemma: top.lemma, morph: top.morph, layer: 1, confidence: round(unique ? (total >= 3 ? 0.97 : 0.9) : top.share * 0.97) });
    } else if (source === 2 && (unique || top.share >= PARSER_DOMINANT)) {
      Object.assign(out, { lemma: top.lemma, morph: top.morph, layer: 2, confidence: round(0.75 * top.share) });
    } else {
      const pick = choices.get(w.ref);
      const hit = pick && cands.find((c) => c.morph === pick.morph && (!pick.lemma || c.lemma === pick.lemma));
      if (hit) Object.assign(out, { lemma: hit.lemma, morph: hit.morph, layer: 3, confidence: pick.unsure ? 0.5 : 0.8 });
      else if (pick) {
        // the model may say none of the candidates is right; its own answer stands as a guess, marked
        out.notes.push('guess: the model chose outside the candidates');
        Object.assign(out, { lemma: pick.lemma || top.lemma, morph: pick.morph, layer: 3, confidence: 0.4 });
      } else Object.assign(out, { lemma: top.lemma, morph: top.morph, layer: 3, confidence: 0, pending: true });
    }
    return out;
  });
}
const round = (x) => Math.round(x * 100) / 100;

/** Other spellings of a form Swete may write differently from the New Testament: [why, form]. */
export function spellings(form) {
  const d = form.normalize('NFD');
  const out = [];
  if (/ε[\u0301\u0342]?ι/.test(d)) out.push(['ει read as ι', d.replace(/ε([\u0301\u0342]?)ι/g, 'ι$1').normalize('NFC')]);
  if (/ι/.test(d) && !/ει/.test(d)) out.push(['ι read as ει', d.replace(/(^|[^ε])ι/, '$1ει').normalize('NFC')]);
  if (/[ιε][\u0300-\u036f]*$/.test(d)) out.push(['movable ν added', form + 'ν']);
  if (/[ιε][\u0300-\u036f]*ν$/.test(d)) out.push(['movable ν dropped', form.slice(0, -1)]);
  return out;
}

/** 'ref parsing [lemma] [?]': the lemma may be left out when the candidates have one lemma for that parsing. */
function parseChoices(text) {
  const m = new Map();
  for (const line of text.split('\n')) {
    const t = line.trim().split(/\s+/);
    if (!t[0] || t[0].startsWith('#')) continue;
    const unsure = t.at(-1) === '?';
    const lemma = t.slice(2, unsure ? -1 : undefined).join(' ').normalize('NFC');
    m.set(t[0], { morph: t[1], lemma, unsure });
  }
  return m;
}

// ---------------------------------------------------------------- the texts

/** English Ps 23 is Greek Ps 22: read from TVTMS's OneToOne rows rather than assumed. */
function greekOfEnglish(tvtms, engChapter) {
  let cols = null;
  const hits = [];
  for (const line of tvtms.split('\n')) {
    const c = line.split('\t').map((s) => s.trim());
    if (c[0] === 'BIBLES') cols = c;
    else if (c[0] === 'OneToOne' && cols && c[1].startsWith(engChapter + ':')) {
      hits.push({ english: c[1], greek: c[cols.indexOf('Greek')] });
    }
  }
  const g = hits.map((h) => /^(\w+\.\d+):/.exec(h.greek)?.[1]).filter(Boolean);
  return { chapter: g[0], rows: hits };
}

/** Tokens of Swete's file that are only an editor's sign (⸆, ⸂⸆⸃): not words, counted apart. */
export const signs = [];
function sweteWords(vers, text, chapters) {
  const starts = vers.split('\n').filter(Boolean).map((l) => {
    const [n, ref] = l.split('\t');
    return { n: +n, ref: ref.trim() };
  });
  const lines = text.split('\n');
  const words = [];
  starts.forEach((s, i) => {
    const chapter = s.ref.split(':')[0];
    if (chapters && !chapters.includes(chapter)) return;
    const end = i + 1 < starts.length ? starts[i + 1].n : lines.length + 1;
    let j = 0;
    for (let n = s.n; n < end; n++) {
      const raw = (lines[n - 1] || '').split('\t')[1]?.trim();
      if (!raw) continue;
      if (!raw.replace(PUNCT, '')) {
        signs.push(`${s.ref} ${raw}`);
        continue;
      }
      j++;
      words.push({ ref: `${s.ref}#${j}`, verse: s.ref, display: raw, form: raw.replace(PUNCT, '') });
    }
  });
  return words;
}

// ---------------------------------------------------------------- reports

function layerCounts(out) {
  const c = { 1: 0, 2: 0, 3: 0, 0: 0 };
  for (const w of out) c[w.layer]++;
  return c;
}
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');

function writeTable(file, out) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const head = 'ref\tform\tlemma\tparsing\tlayer\tconfidence\tcandidates\tnotes';
  const body = out.map((w) => [w.ref, w.display, w.lemma, w.morph, w.layer, w.confidence, w.candidates.length, w.notes.join('; ')].join('\t'));
  fs.writeFileSync(file, [head, ...body].join('\n') + '\n');
}

function summary(out) {
  const n = out.length;
  const c = layerCounts(out);
  const ambiguous = out.filter((w) => new Set(w.candidates.map((x) => `${x.lemma}|${x.morph}`)).size > 1).length;
  const both = out.filter((w) => w.layer === 1 && w.parserTop);
  const disLemma = both.filter((w) => w.parserTop.lemma !== w.lemma).length;
  const disFull = both.filter((w) => w.parserTop.lemma !== w.lemma || w.parserTop.morph !== w.morph).length;
  const lines = [
    `words: ${n}`,
    `layer 1 (TAGNT form): ${c[1]} (${pct(c[1], n)})`,
    `layer 2 (parser): ${c[2]} (${pct(c[2], n)})`,
    `layer 3 (model choice): ${c[3]} (${pct(c[3], n)})`,
    `none (no candidate): ${c[0]} (${pct(c[0], n)})`,
    `ambiguous (more than one candidate): ${ambiguous} (${pct(ambiguous, n)})`,
    `two methods: of ${both.length} layer-1 words the parser also analysed, it disagreed on the lemma for ${disLemma} (${pct(disLemma, both.length)}) and on lemma or parsing for ${disFull} (${pct(disFull, both.length)})`,
    `parser could not analyse ${out.filter((w) => w.layer === 1 && !w.parserTop).length} of the layer-1 words`,
    `of layer 3, the model's guesses (no candidate, or none it accepted): ${out.filter((w) => w.notes.some((t) => t.startsWith('guess'))).length}`,
    `pending model choices: ${out.filter((w) => w.pending).length}`,
  ];
  const notes = new Map();
  for (const w of out) for (const t of w.notes) notes.set(t.split(':')[0], (notes.get(t.split(':')[0]) || 0) + 1);
  for (const [t, k] of notes) lines.push(`note '${t}': ${k}`);
  return lines;
}

function printPending(out) {
  const byVerse = new Map();
  for (const w of out) {
    if (!byVerse.has(w.verse)) byVerse.set(w.verse, []);
    byVerse.get(w.verse).push(w);
  }
  for (const [verse, ws] of byVerse) {
    if (!ws.some((w) => w.pending)) continue;
    console.log(`\n${verse} ${ws.map((w) => w.display).join(' ')}`);
    for (const w of ws.filter((x) => x.pending)) {
      console.log(`${w.ref} ${w.form}: ${w.candidates.slice(0, 8).map((c) => `${c.lemma} ${c.morph} (${c.support})`).join(' | ')}`);
    }
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--john') ? 'john' : args.includes('--sample') ? 'sample' : args.includes('--coverage') ? 'coverage' : null;
  if (!mode) {
    console.error('usage: node scripts/lxx-derivation-probe.mjs --sample | --john [--pending] [--word <ref>] | --coverage');
    process.exit(2);
  }
  const [tagntA, tagntB, tbesg, tvtms] = await Promise.all(STEP.files.map((f) => pinned(STEP, f)));
  const all = readTagnt([tagntA, tagntB]);
  const lexicon = readTbesg(tbesg);
  // the model's choices for this mode
  const choices = process.env.LXX_PROBE_NO_CHOICES ? new Map() : parseChoices(mode === 'john' ? MODEL_CHOICES_JOHN : MODEL_CHOICES_LXX);

  let train = all, words, gold = null;
  if (mode === 'john') {
    train = all.filter((r) => r.book !== 'Jhn');
    const target = all.filter((r) => r.book === 'Jhn' && r.ch === 1 && r.editions.includes('NA28'));
    gold = new Map();
    const perVerse = new Map();
    words = target.map((r) => {
      const verse = `Jhn.1:${r.vs}`;
      const j = (perVerse.get(verse) || 0) + 1;
      perVerse.set(verse, j);
      const ref = `${verse}#${j}`;
      gold.set(ref, r);
      return { ref, verse, display: r.form, form: r.form.replace(PUNCT, '') };
    });
  } else {
    const [vers, text] = await Promise.all(SWETE.files.slice(0, 2).map((f) => pinned(SWETE, f)));
    await Promise.all(SWETE.files.slice(2).map((f) => pinned(SWETE, f)));
    const ps = greekOfEnglish(tvtms, 'Psa.23');
    console.log(`TVTMS: English Psa.23 is Greek ${ps.chapter} (${ps.rows.map((r) => `${r.english} = ${r.greek}`).join('; ')})`);
    words = sweteWords(vers, text, mode === 'coverage' ? null : ['Gen.1', ps.chapter]);
    console.log(`Swete tokens that are only an editor's sign, left out: ${signs.length} (${signs.join(', ')})`);
  }

  const ntPos = new Map();
  for (const r of train) {
    if (!ntPos.has(r.lemma)) ntPos.set(r.lemma, new Set());
    ntPos.get(r.lemma).add(posKey(r.morph));
  }
  const triples = new Map();
  for (const r of train) triples.set(`${keyOf(r.form)}|${r.lemma}|${r.morph}`, r);
  const rules = trainParser([...triples.values()]);
  const analogy = trainAnalogy([...triples.values()]);
  console.log(`trained on ${train.length} TAGNT words: ${triples.size} distinct (form, lemma, parsing) triples, ${rules.size} ending rules; ${[...lexicon.values()].flat().length} TBESG lemmas`);
  if (mode === 'coverage') return coverage(words, { layer1: buildLayer1(train), rules, analogy, lexicon, ntPos, choices: new Map() });
  const out = derive(words, { layer1: buildLayer1(train), rules, analogy, lexicon, ntPos, choices });

  const wordAt = args.indexOf('--word');
  if (wordAt >= 0) {
    const w = out.find((x) => x.ref === args[wordAt + 1]);
    console.log(JSON.stringify(w, null, 1));
    return;
  }
  if (args.includes('--pending')) {
    printPending(out);
    return;
  }
  const file = path.join(path.dirname(CACHE), 'out', mode === 'john' ? 'john-1.tsv' : 'lxx-sample.tsv');
  writeTable(file, out);
  console.log(`table: ${file}`);
  for (const line of summary(out)) console.log(line);
  if (mode === 'sample') {
    for (const ch of [...new Set(out.map((w) => w.verse.split(':')[0]))]) {
      const ws = out.filter((w) => w.verse.startsWith(ch + ':'));
      const c = layerCounts(ws);
      console.log(`${ch}: ${ws.length} words; layer 1 ${c[1]}, layer 2 ${c[2]}, layer 3 ${c[3]}, none ${c[0]}`);
    }
  }
  if (gold) score(out, gold);
}

/**
 * The whole of Swete's file, every book (the Old Testament and the books of the Apocrypha it has): how many words layer 1
 * settles, and what the layers would do with a fixed sample of the distinct forms the New Testament does not have.
 * Sizes the full run; no model choices are made here.
 */
function coverage(words, ctx) {
  const books = new Map();
  const forms = new Map();
  for (const w of words) {
    const b = w.verse.split('.')[0];
    books.set(b, (books.get(b) || 0) + 1);
    const k = keyOf(w.form);
    if (!forms.has(k)) forms.set(k, { form: w.form, n: 0 });
    forms.get(k).n++;
  }
  let tok1 = 0, tokAmb = 0, tokOut = 0;
  const outside = [];
  for (const [k, f] of forms) {
    const l1 = ctx.layer1.byKey.get(k) || (!hasAccent(f.form) ? ctx.layer1.byBare.get(bareOf(f.form)) : null);
    if (!l1) {
      tokOut += f.n;
      outside.push(f);
      continue;
    }
    const a = analysesOf(l1);
    const total = a.reduce((s, x) => s + x.support, 0);
    if (a.length === 1 || (a[0].share >= DOMINANT && total >= DOMINANT_MIN)) tok1 += f.n;
    else tokAmb += f.n;
  }
  const n = words.length;
  console.log(`Swete, all books: ${n} words, ${books.size} books, ${forms.size} distinct forms`);
  console.log(`form in the New Testament with one analysis (layer 1): ${tok1} words (${pct(tok1, n)})`);
  console.log(`form in the New Testament with several analyses (to the model): ${tokAmb} words (${pct(tokAmb, n)})`);
  console.log(`form not in the New Testament (to the parser): ${tokOut} words (${pct(tokOut, n)}), ${outside.length} distinct forms`);
  // a fixed sample of those forms, every 25th by first appearance, through the parser
  const sample = outside.filter((_, i) => i % 25 === 0);
  const res = derive(sample.map((f, i) => ({ ref: `cov#${i}`, verse: 'cov', display: f.form, form: f.form })), ctx);
  const c = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 0: [0, 0] };
  res.forEach((r, i) => {
    c[r.layer][0]++;
    c[r.layer][1] += sample[i].n;
  });
  const tt = sample.reduce((s, f) => s + f.n, 0);
  console.log(`every 25th of those forms (${sample.length} forms, ${tt} words): an NT form under another spelling (layer 1) ${c[1][0]} forms / ${pct(c[1][1], tt)} of their words; the parser's one answer (layer 2) ${c[2][0]} / ${pct(c[2][1], tt)}; several candidates (to the model) ${c[3][0]} / ${pct(c[3][1], tt)}; no candidate ${c[0][0]} / ${pct(c[0][1], tt)}`);
  const est = (layer) => Math.round((tokOut * c[layer][1]) / tt);
  const e1 = tok1 + est(1), e3 = tokAmb + est(3);
  console.log(`estimate for the full run: layer 1 ${e1} (${pct(e1, n)}), layer 2 ${est(2)} (${pct(est(2), n)}), model choice ${e3} (${pct(e3, n)}), no candidate (a model guess) ${est(0)} (${pct(est(0), n)})`);
  console.log('words per book: ' + [...books].map(([b, c]) => `${b} ${c}`).join(', '));
}

function score(out, gold) {
  console.log('\nJohn 1 scored against TAGNT (NA28 words; parsing compared with noun tags such as -T and -P stripped):');
  const lemmaMatch = (w, g) => w.lemma === g.lemma;
  const loose = (s) => bareOf(s);
  for (const layer of [1, 2, 3, 0, 'all']) {
    const ws = out.filter((w) => layer === 'all' || w.layer === layer);
    const g = (w) => gold.get(w.ref);
    const lem = ws.filter((w) => lemmaMatch(w, g(w))).length;
    const lemLoose = ws.filter((w) => loose(w.lemma) === loose(g(w).lemma)).length;
    const full = ws.filter((w) => lemmaMatch(w, g(w)) && w.morph === g(w).morph).length;
    const name = layer === 'all' ? 'all words' : layer === 0 ? 'none' : `layer ${layer}`;
    console.log(`${name}: ${ws.length} words; lemma ${lem} (${pct(lem, ws.length)}), lemma without accents ${lemLoose} (${pct(lemLoose, ws.length)}), lemma and full parsing ${full} (${pct(full, ws.length)})`);
  }
  const parsed = out.filter((w) => w.parserTop);
  const pLem = parsed.filter((w) => w.parserTop.lemma === gold.get(w.ref).lemma).length;
  const pFull = parsed.filter((w) => w.parserTop.lemma === gold.get(w.ref).lemma && w.parserTop.morph === gold.get(w.ref).morph).length;
  console.log(`the parser alone (its first candidate, no context), on the ${parsed.length} words it analysed: lemma ${pLem} (${pct(pLem, parsed.length)}), lemma and full parsing ${pFull} (${pct(pFull, parsed.length)})`);
  const wrong = out.filter((w) => w.layer && (w.lemma !== gold.get(w.ref).lemma || w.morph !== gold.get(w.ref).morph));
  console.log(`\nwrong (${wrong.length}):`);
  for (const w of wrong) {
    const g = gold.get(w.ref);
    console.log(`${w.ref} ${w.form}: layer ${w.layer} said ${w.lemma} ${w.morph}; TAGNT ${g.lemma} ${g.morph}${w.candidates.some((c) => c.lemma === g.lemma && c.morph === g.morph) ? ' (among the candidates)' : ' (not a candidate)'}`);
  }
}

// ---------------------------------------------------------------- the model's choices (layer 3)
// One line per word that layers 1 and 2 left with more than one candidate: ref, parsing, the lemma when the
// candidates have more than one for that parsing, and '?' when unsure.
// Made by the Builder's session reading each verse with the candidates printed by --pending; for John, without
// seeing TAGNT's answer for John (the gold rows are read only by score()).

const MODEL_CHOICES_LXX = `
# Gen 1 (Swete prints Codex Alexandrinus here; [ ] are letters he supplied where A is damaged)
Gen.1:1#2 N-DSF
Gen.1:2#5 A-NSF
Gen.1:2#7 A-NSF
Gen.1:2#9 N-NSN
Gen.1:2#14 N-NSN
Gen.1:2#16 V-IPI-3S ?
Gen.1:2#18 T-GSN
Gen.1:3#6 N-NSN
Gen.1:3#9 N-NSN
Gen.1:4#5 T-ASN
Gen.1:4#6 N-ASN
Gen.1:4#8 A-NSN
Gen.1:4#15 T-GSN
Gen.1:4#20 T-GSN
Gen.1:5#5 T-ASN
Gen.1:5#6 N-ASN
Gen.1:5#9 T-ASN
Gen.1:5#10 N-ASN
Gen.1:5#18 ADV
Gen.1:6#9 T-GSN
Gen.1:6#13 V-PAP-NSN
Gen.1:7#5 T-ASN
Gen.1:7#13 T-GSN
Gen.1:7#15 R-NSN
Gen.1:7#18 T-GSN
Gen.1:7#23 T-GSN
Gen.1:7#25 T-GSN
Gen.1:7#27 T-GSN
Gen.1:8#5 T-ASN
Gen.1:8#13 A-NSN
Gen.1:8#19 ADV
Gen.1:9#6 T-NSN
Gen.1:9#7 N-NSN
Gen.1:9#8 T-NSN
Gen.1:9#10 T-GSM
Gen.1:9#24 T-NSN
Gen.1:9#25 N-NSN
Gen.1:9#26 T-NSN
Gen.1:9#28 T-GSM
Gen.1:9#33 P-GPN ?
Gen.1:9#35 V-API-3S
Gen.1:10#9 T-APN
Gen.1:10#10 N-APN
Gen.1:10#11 T-GPN
Gen.1:10#14 N-APF
Gen.1:10#20 A-NSN
Gen.1:11#10 V-PAP-ASN
Gen.1:11#11 N-ASN
Gen.1:11#13 N-ASN
Gen.1:11#18 N-ASN
Gen.1:11#19 A-ASN
Gen.1:11#22 R-GSN ὅς, ἥ
Gen.1:11#23 T-NSN
Gen.1:11#24 N-NSN
Gen.1:11#29 N-ASN
Gen.1:12#7 V-PAP-ASN
Gen.1:12#8 N-ASN
Gen.1:12#10 N-ASN
Gen.1:12#15 N-ASN
Gen.1:12#16 A-ASN
Gen.1:12#19 R-GSN ὅς, ἥ
Gen.1:12#20 T-NSN
Gen.1:12#21 N-NSN
Gen.1:12#26 N-ASN
Gen.1:12#35 A-NSN
Gen.1:13#6 ADV
Gen.1:14#5 V-AOM-3P γίνομαι
Gen.1:14#8 T-DSN
Gen.1:14#10 T-GSM
Gen.1:14#19 N-GSF
Gen.1:14#28 N-GSF
Gen.1:14#37 N-APN
Gen.1:14#43 N-APF
Gen.1:15#6 T-DSN
Gen.1:15#8 T-GSM
Gen.1:16#17 N-GSF
Gen.1:17#7 T-DSN
Gen.1:17#9 T-GSM
Gen.1:18#4 N-GSF
Gen.1:18#12 T-GSN
Gen.1:18#17 T-GSN
Gen.1:18#24 A-NSN
Gen.1:19#6 ADV
Gen.1:19#8 A-NSF
Gen.1:20#6 T-NPN
Gen.1:20#7 N-NPN
Gen.1:20#8 N-APN
Gen.1:20#10 V-PAP-GPF ζάω
Gen.1:20#12 N-APN
Gen.1:20#13 V-PNP-APN
Gen.1:20#18 T-ASN
Gen.1:20#20 T-GSM
Gen.1:21#5 T-APN
Gen.1:21#6 N-APN
Gen.1:21#7 T-APN
Gen.1:21#8 A-APN
Gen.1:21#14 R-APN
Gen.1:21#16 T-NPN
Gen.1:21#17 N-NPN
Gen.1:21#19 N-APN
Gen.1:21#20 P-GPN
Gen.1:21#22 A-ASN
Gen.1:21#23 N-ASN
Gen.1:21#24 A-ASN
Gen.1:21#26 N-ASN
Gen.1:21#32 A-NPN
Gen.1:22#7 V-PPM-2P ?
Gen.1:22#9 V-PPM-2P ?
Gen.1:22#12 T-APN
Gen.1:22#13 N-APN
Gen.1:22#18 T-NPN
Gen.1:22#19 N-NPN
Gen.1:22#20 V-PPM-3P πληθύνω ?
Gen.1:23#6 ADV
Gen.1:23#8 A-NSF
Gen.1:24#11 N-ASN
Gen.1:24#12 A-APN
Gen.1:24#14 N-APN
Gen.1:24#16 N-APN
Gen.1:24#20 N-ASN
Gen.1:25#5 T-APN
Gen.1:25#6 N-APN
Gen.1:25#10 N-ASN
Gen.1:25#12 T-APN
Gen.1:25#15 N-ASN
Gen.1:25#17 A-APN
Gen.1:25#18 T-APN
Gen.1:25#19 N-APN
Gen.1:25#23 N-ASN
Gen.1:25#24 P-GPN
Gen.1:25#30 A-NPN
Gen.1:26#15 T-GPM
Gen.1:26#20 T-GPN
Gen.1:26#22 T-GSM
Gen.1:26#25 T-GPN
Gen.1:26#32 A-GPN
Gen.1:26#33 T-GPN
Gen.1:26#35 T-GPN
Gen.1:26#36 V-PAP-GPN
Gen.1:27#12 A-ASN
Gen.1:27#14 A-ASN
Gen.1:28#7 V-PPM-2P ?
Gen.1:28#9 V-PPM-2P ?
Gen.1:28#15 V-AAM-2P
Gen.1:28#18 V-PAM-2P
Gen.1:28#19 T-GPM
Gen.1:28#24 T-GPN
Gen.1:28#26 T-GSM
Gen.1:28#29 A-GPN
Gen.1:28#30 T-GPN
Gen.1:28#37 A-GPN
Gen.1:28#38 T-GPN
Gen.1:28#40 T-GPN
Gen.1:28#41 V-PAP-GPN
Gen.1:29#8 A-ASN
Gen.1:29#10 A-ASM
Gen.1:29#11 V-PAP-ASN
Gen.1:29#12 N-ASN
Gen.1:29#13 R-NSN
Gen.1:29#20 A-ASN
Gen.1:29#21 N-ASN
Gen.1:29#22 R-NSN
Gen.1:29#28 A-GSN
Gen.1:30#2 A-DPN
Gen.1:30#3 T-DPN
Gen.1:30#8 A-DPN
Gen.1:30#9 T-DPN
Gen.1:30#10 N-DPN
Gen.1:30#11 T-GSM
Gen.1:30#14 A-DSN
Gen.1:30#15 N-DSN
Gen.1:30#16 T-DSN
Gen.1:30#21 R-NSN
Gen.1:30#28 A-ASM
Gen.1:31#5 T-APN
Gen.1:31#6 A-APN
Gen.1:31#7 K-APN
Gen.1:31#11 A-NPN
Gen.1:31#18 ADV
# Greek Ps 22 (English Ps 23)
Psa.22:1#1 N-NSM
Psa.22:1#2 T-DSM
Psa.22:1#3 N-DSM
Psa.22:1#8 A-NSN
Psa.22:1#10 V-FAI-3S
Psa.22:2#3 N-GSF χλόη
Psa.22:2#10 V-AAI-3S ἐκτρέφω
Psa.22:3#11 T-GSN
Psa.22:4#7 N-GSF
Psa.22:4#11 A-APN
Psa.22:4#22 N-NSF
Psa.22:4#24 P-NPF αὐτός
Psa.22:5#7 T-GPM
Psa.22:5#8 V-PAP-GPM
Psa.22:5#10 V-AAI-2S λιπαίνω
Psa.22:5#17 T-NSN
Psa.22:5#18 N-NSN
Psa.22:5#20 V-PAP-NSN
Psa.22:5#22 A-NSN ?
Psa.22:6#2 T-NSN
Psa.22:6#3 N-NSN
Psa.22:6#5 V-FMI-3S καταδιώκω ?
Psa.22:6#9 N-APF
Psa.22:6#14 T-NSN ?
Psa.22:6#21 N-ASF μακρότης
`;

const MODEL_CHOICES_JOHN = `
# no candidate: the model's own answer, a guess
Jhn.1:15#6 V-2RAI-3S κράζω
Jhn.1:22#8 V-2AAS-1P δίδωμι
Jhn.1:32#6 V-RNI-1S θεάομαι
Jhn.1:50#16 A-APN-C μέγας
Jhn.1:51#11 V-2RAP-ASM ἀνοίγω
# more than one candidate
Jhn.1:3#1 A-NPN
Jhn.1:3#10 A-NSN
Jhn.1:3#11 R-NSN
Jhn.1:4#9 T-NSN
Jhn.1:4#10 N-NSN
Jhn.1:4#11 T-GPM
Jhn.1:5#2 T-NSN
Jhn.1:5#3 N-NSN
Jhn.1:5#10 N-NSF σκοτία
Jhn.1:5#11 P-ASN
Jhn.1:6#6 N-NSN
Jhn.1:7#8 T-GSN
Jhn.1:8#4 T-NSN
Jhn.1:8#5 N-NSN
Jhn.1:8#10 T-GSN
Jhn.1:9#2 T-NSN
Jhn.1:9#3 N-NSN
Jhn.1:9#4 T-NSN
Jhn.1:9#5 A-NSN
Jhn.1:9#6 R-NSN
Jhn.1:9#8 A-ASM
Jhn.1:9#10 V-PNP-ASM ?
Jhn.1:10#2 T-DSM
Jhn.1:11#2 T-APN
Jhn.1:11#7 A-NPM
Jhn.1:11#10 V-2AAI-3P
Jhn.1:12#3 V-2AAI-3P
Jhn.1:12#8 N-APN ?
Jhn.1:12#11 T-DPM
Jhn.1:12#12 V-PAP-DPM
Jhn.1:12#14 T-ASN
Jhn.1:12#15 N-ASN
Jhn.1:13#1 R-NPM
Jhn.1:14#17 A-GSM
Jhn.1:14#20 A-NSM ?
Jhn.1:15#11 V-2AAI-1S
Jhn.1:15#13 PREP
Jhn.1:16#3 T-GSN
Jhn.1:16#10 N-ASF
Jhn.1:17#13 N-GSM
Jhn.1:18#5 A-NSM
Jhn.1:18#8 V-PAP-NSM
Jhn.1:18#12 T-GSM
Jhn.1:19#6 T-GSM
Jhn.1:19#8 CONJ
Jhn.1:19#13 N-NPM
Jhn.1:19#16 N-APM
Jhn.1:19#23 I-NSM
Jhn.1:21#4 I-NSN ?
Jhn.1:22#4 I-NSM
Jhn.1:22#7 N-ASF
Jhn.1:22#9 T-DPM
Jhn.1:22#12 I-ASN
Jhn.1:23#7 A-DSF
Jhn.1:24#5 T-GPM
Jhn.1:25#7 I-ASN
Jhn.1:26#16 V-RAI-2P
Jhn.1:27#2 PREP
Jhn.1:27#5 R-GSM
Jhn.1:27#11 V-AAS-1S
Jhn.1:27#15 T-GSN
Jhn.1:28#1 D-NPN
Jhn.1:28#6 T-GSM
Jhn.1:28#8 CONJ ?
Jhn.1:29#6 V-PNP-ASM
Jhn.1:29#14 T-GSM
Jhn.1:29#20 T-GSM
Jhn.1:30#4 R-GSM
Jhn.1:30#6 V-2AAI-1S
Jhn.1:30#7 PREP
Jhn.1:31#8 T-DSM
Jhn.1:31#9 N-DSM
Jhn.1:31#11 D-ASN
Jhn.1:31#12 V-2AAI-1S
Jhn.1:32#7 T-ASN
Jhn.1:32#8 N-ASN
Jhn.1:32#9 V-PAP-ASN
Jhn.1:33#19 T-ASN
Jhn.1:33#20 N-ASN
Jhn.1:33#21 V-PAP-ASN
Jhn.1:33#32 A-DSN
Jhn.1:34#10 T-GSM
Jhn.1:35#9 T-GPM
Jhn.1:36#3 T-DSM
Jhn.1:36#4 N-DSM
Jhn.1:36#10 T-GSM
Jhn.1:37#10 T-DSM
Jhn.1:37#11 N-DSM
Jhn.1:38#11 I-ASN
Jhn.1:38#12 V-PAI-2P
Jhn.1:38#17 N-VSM
Jhn.1:38#18 R-NSN
Jhn.1:39#22 A-NSF δέκατος
Jhn.1:40#9 T-GPM
Jhn.1:40#11 T-GPM
Jhn.1:41#3 A-ASN ?
Jhn.1:41#7 A-ASM
Jhn.1:41#12 V-RAI-1P
Jhn.1:41#14 N-ASM
Jhn.1:41#15 R-NSN
Jhn.1:42#13 N-NSM
Jhn.1:42#20 R-NSN
Jhn.1:42#21 V-PPI-3S
Jhn.1:44#6 N-GSF
Jhn.1:45#4 N-ASM
Jhn.1:45#12 T-DSM
Jhn.1:45#16 N-NPM
Jhn.1:45#17 V-RAI-1P
Jhn.1:45#20 T-GSM
Jhn.1:45#21 N-GSM
Jhn.1:45#24 N-GSF
Jhn.1:46#4 N-NSM
Jhn.1:46#6 N-GSF
Jhn.1:46#8 X-NSN
Jhn.1:46#9 A-NSN
Jhn.1:47#5 N-ASM
Jhn.1:47#6 V-PNP-ASM
Jhn.1:47#17 R-DSM
Jhn.1:48#3 N-NSM
Jhn.1:48#4 ADV-I
Jhn.1:48#13 T-GSN
Jhn.1:48#17 V-PAP-ASM
Jhn.1:48#21 V-2AAI-1S
Jhn.1:49#3 N-NSM
Jhn.1:49#4 N-VSM
Jhn.1:49#9 T-GSM
Jhn.1:49#14 T-GSM
Jhn.1:49#15 N-GSM
Jhn.1:50#7 V-2AAI-1S
Jhn.1:50#10 V-2AAI-1S
Jhn.1:50#17 D-GPN
Jhn.1:51#15 T-GSM
Jhn.1:51#23 T-GSM
`;

await main();
