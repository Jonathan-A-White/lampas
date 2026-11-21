// scripts/lxx/complete.ts — the readings a word still waiting is offered beyond the layers' candidates (docs/lxx-derivation.md, 'Readings added to a word still waiting';
// story mw-u2w5klk.287). The Psalms batches (mw-u2w5klk.57, .58) guessed on words that had a right reading nobody offered; each is a reading a rule can add, never one a
// choice depends on: they are added to the pending words only, after the agreement check, marked `beside` as analogy's and Morpheus's readings beside a thin lone candidate
// are (parser.ts Candidate), so no word is settled or unsettled by them and the agreement check and the address rule never read them.
//   1. Morpheus's mapped readings (morpheus.ts), on a word the New Testament does not show, or shows only as a name: the rules' candidates for such a form are a guess at
//      a stem (ταλαίπωρος has no feminine, ἐγκαταλίπῃς no second aorist, διαιρέσεις no accusative), where Morpheus's are a lexicon's analysis of the form itself;
//   2. the vocative of a nominative plural or neuter: it is the same form (ἡμέραι, ἄστρα, σκεῦος), and TAGNT tags an address vocative whatever its ending, so a list of
//      addresses (Ps 148:3 to 148:12) has no nominative to answer with;
//   3. the feminine of a noun the lexicon gives masculine and the Septuagint writes feminine (σχοῖνος, a line).
//   4. and, going the other way, the junk the ending rules' candidates carry (`tidy`): a contraction TBESG lists as a headword (ᾠδός, 'a singer, contracted for ἀοιδός') beside the lemma that is one's own (ᾠδή); a part of speech the shape of a lemma with none cannot be (κατώτατος as a noun); and an adverb, indeclinable, comparative or superlative
//      parsing no ending of the form allows (αἰνετός came with 20 parsings for the 2 it can be). Only the listing: the layers settle on the candidates they had (the shares of the rules'
//      candidates are what PARSER_DOMINANT was measured on), so no word's answer changes.
//   5. the paradigm readings of a verb form the layers' stem guess misses (story mw-u2w5klk.379; `paradigmReadings`): the perfect passive of a verb in -αίρω (ἐξῆρται) and of ἀπωθέω (ἀπῶσμαι), the aorist of a verb in -αίω
//      (ἔκλαυσαν), the indicative beside the imperative (ἀνταποδίδοτε), the future middle of a present passive (ἀποδώσομαι, ἐπιβλέψομαι), the first person beside the third plural (ἀνέσχον), the feminine genitive
//      plural of an adjective (πονηρῶν), the third plural beside a dative plural participle (κατοικοῦσιν) and the infinitive of a verb in -άω (ζῆν), each only for a verb TBESG has and only beside the candidates.
// Not here: ἐμοῦ as the personal pronoun (P-1GS): TAGNT writes ἐμοῦ S-1SGSN in all its 114 words (mw-u2w5klk.284 holds the recheck), so the candidates are TAGNT's.
import { cngOf, withCng } from './agreement';
import { NOTE_NO_CANDIDATE, NOTE_NOT_IN_NT, type DerivedWord, type PendingWord, type WordCandidate } from './derive';
import { morpheusKey, type MorpheusCache } from './morpheus';
import type { Parser } from './parser';
import { bareOf } from './swete';
import { posOf, type LexEntry, type Lexicon } from './tbesg';

export const NOTE_COMPLETED = 'readings added beside the candidates (Morpheus, the vocative, the feminine, the paradigm), junk left out: for the model';
const VIA_MORPHEUS = 'Morpheus: the second method, a build tool';
export const VIA_VOCATIVE = 'the vocative beside the nominative: the same form in the plural and in the neuter';
export const VIA_FEMININE = 'the feminine beside the masculine: the Septuagint writes this noun feminine';
export const VIA_PARADIGM = 'the paradigm of the verb: the same form, or the form of a stem the ending rules do not offer';

/** Nouns the lexicon (TBESG, the New Testament) gives masculine that the Septuagint writes feminine: σχοῖνος is ἡ σχοῖνος, a line (Ps 138:3). By bare letters. */
export const SEPTUAGINT_FEMININE: ReadonlySet<string> = new Set(['σχοῖνος'].map(bareOf));

type Out = DerivedWord | PendingWord;
const isPending = (w: Out): w is PendingWord => !('layer' in w);

/** A word the New Testament does not show, or shows only as a name (the candidates are all capitalised lemmas: βόες beside Βοόζ): the layers' candidates are a guess at it. */
export function unattested(word: PendingWord): boolean {
  if (word.notes.includes(NOTE_NOT_IN_NT)) return true;
  return word.candidates.length > 0 && word.candidates.every((c) => c.lemma !== c.lemma.toLowerCase() && c.lemma[0] === c.lemma[0].toUpperCase() && c.lemma[0] !== c.lemma[0].toLowerCase());
}

/**
 * Whether a part of speech fits a lemma TBESG gives none and the New Testament does not have, by the lemma's shape: a verb in -ω, -μι or -μαι is a verb; a comparative or superlative (-τερος,
 * -τατος, -ιστος) an adjective; any other a noun or an adjective. `letters` is bareOf(lemma).
 */
function shapeFits(letters: string, p: string): boolean {
  if (/(ω|μι|μαι)$/.test(letters)) return p === 'V';
  if (/(τατοσ|τεροσ|ιστοσ)$/.test(letters)) return p === 'A';
  return p === 'N' || p === 'A';
}

/** The endings of a comparative or superlative (σοφώτερος, κρείσσων, μέγιστος, πλείονες): a comparative's or superlative's parsing (-C, -S) needs one on the form. In bare letters (final sigma σ). */
const DEGREE_ENDING = /(τερ|τατ|ιστ|ιον|ιων|ιζων|σσον|σσων|ττον|ττων|ονα|ονεσ|ονοσ|ονι|ονων|ονασ)/;
/** The endings an adverb made from an adjective has (σοφῶς, σοφόν, σοφά, ταχύ), in bare letters. */
const ADVERB_ENDING = /(ωσ|ον|α|υ)$/;

/**
 * Whether the ending rules' parsing is one the form itself can be. A rule learned from a form of another lemma gives its parsing to any form with the same ending, so αἰνετός (Ps 47:2) came
 * with an adverb, an indeclinable adjective and every comparative and superlative: 20 parsings for the 2 it can be. An adverb of an adjective in -ος ends in -ως (or is its neuter), a
 * comparative or superlative parsing of it needs a comparative's or superlative's ending, and an indeclinable adjective or an interrogative or negative adverb is a word the New Testament has
 * shown the lemma as, never the rule's guess. A lemma that is an adverb or a comparative itself (περικύκλῳ, ἡσυχῇ, ὑπεράνωθεν, κρείττων) is not limited: the Septuagint's choices on them stand.
 * `form` is in bare letters.
 */
function plausible(form: string, lemma: string, morph: string, nt: ReadonlySet<string> | undefined): boolean {
  const [head, ...tail] = morph.split('-');
  const suffix = tail.at(-1) ?? '';
  if (head === 'A' && suffix === 'NUI') return nt?.has('A') === true;
  if (head === 'ADV' && (suffix === 'I' || suffix === 'N')) return nt?.has('ADV') === true;
  if (!/(οσ|ησ|υσ)$/.test(bareOf(lemma))) return true;
  if (head === 'ADV' && !nt?.has('ADV') && !ADVERB_ENDING.test(form)) return false;
  if ((head === 'A' || head === 'ADV') && (suffix === 'C' || suffix === 'S') && !DEGREE_ENDING.test(form)) return false;
  return true;
}

/**
 * The ending rules' candidates of a word without the junk (see 4 above); the candidates of layer 1, analogy and Morpheus are as they were, and a word is never left with none. What goes: a
 * contraction of another headword (ᾠδός) when the word has another candidate; a part of speech a lemma with none in TBESG and the New Testament cannot have by its shape (κατώτατος as a noun);
 * and a parsing the form cannot be (plausible). A lemma TBESG gives no part of speech is otherwise kept: κυρία, βλαστός, νομός, φαρμακία, σάρδιος, ἄρσην are Septuagint words the choices took.
 */
function tidy(candidates: readonly WordCandidate[], form: string, parser: Pick<Parser, 'lexicon' | 'ntPos'>): WordCandidate[] {
  const byRule = (c: WordCandidate): boolean => c.via?.[0]?.startsWith('rule:') === true;
  const entriesOf = (c: WordCandidate): LexEntry[] => (parser.lexicon.get(bareOf(c.lemma)) ?? []).filter((e) => e.lemma === c.lemma);
  const contraction = (c: WordCandidate): boolean => byRule(c) && !parser.ntPos.has(c.lemma) && entriesOf(c).some((e) => e.contracted);
  const another = candidates.some((c) => !contraction(c));
  const letters = bareOf(form);
  const kept = candidates.filter((c) => {
    if (!byRule(c)) return true;
    if (contraction(c)) return !another;
    const nt = parser.ntPos.get(c.lemma);
    const entries = entriesOf(c);
    if (!nt && entries.length > 0 && entries.every((e) => !e.pos) && !shapeFits(bareOf(c.lemma), posOf(c.morph))) return false;
    return plausible(letters, c.lemma, c.morph, nt);
  });
  return kept.length ? kept : [...candidates];
}

/** The perfect middle/passive endings of a verb in -αίρω and -ωθέω, in bare letters: ἦρμαι, ἦρσαι, ἦρται, ἤρμεθα, ἦρνται. */
const PERFECT_ENDINGS: ReadonlyArray<readonly [string, string]> = [['μαι', '1S'], ['σαι', '2S'], ['ται', '3S'], ['μεθα', '1P'], ['νται', '3P']];
/** The endings of the aorist active indicative that follow -υσ- (ἔκλαυσα, ἔκλαυσας, ἔκλαυσεν, ἐκλαύσαμεν, ἐκλαύσατε, ἔκλαυσαν), bare. */
const AORIST_ENDINGS: ReadonlyArray<readonly [string, string]> = [['α', '1S'], ['ασ', '2S'], ['ε', '3S'], ['εν', '3S'], ['αμεν', '1P'], ['ατε', '2P'], ['αν', '3P']];
/** The endings of the future middle indicative, bare (the second person singular ῃ or ει). */
const FUTURE_ENDINGS: ReadonlyArray<readonly [string, string]> = [['ομαι', '1S'], ['η', '2S'], ['ει', '2S'], ['εται', '3S'], ['ομεθα', '1P'], ['εσθε', '2P'], ['ονται', '3P']];

/** What the form's tense stem is when the present stem `stem` (bare, without -ω) takes -σ-: a labial gives ψ, a guttural ξ, a dental σ; a vowel stem σ, lengthened or not. */
function futureStems(stem: string): string[] {
  const last = stem.slice(-1);
  const head = stem.slice(0, -1);
  if ('πβφ'.includes(last)) return [`${head}ψ`];
  if ('κγχ'.includes(last)) return [`${head}ξ`];
  if ('τδθζ'.includes(last)) return [`${head}σ`];
  const longer: Record<string, string> = { ε: 'η', α: 'η', ο: 'ω' };
  if (longer[last]) return [`${stem}σ`, `${head}${longer[last]}σ`];
  return [];
}

/** The nth reading of a verb TBESG has with these bare letters, as its NFC lemma; undefined when TBESG has no such verb. */
const verbOf = (lexicon: Lexicon, bare: string): string | undefined => lexicon.get(bare)?.find((e) => e.pos.includes('V'))?.lemma;

/**
 * The readings of a form that a rule on the form itself gives and the layers' stem guess misses (story mw-u2w5klk.379: the Joel, Amos and Jonah batches had to guess ἐξῆρται, ἔκλαυσαν,
 * ἀνταποδίδοτε, ἀποδώσομαι, ἐπιβλέψομαι, ἀνέσχον, πονηρῶν, κατοικοῦσιν, ζῇν and ἀπῶσμαι). Each is a reading the form really has, never one a choice depends on; `paradigmReadings`' result is
 * added beside the candidates (see completeReadings). A verb is offered only when `lexicon` (TBESG) has it. `form` is in any spelling, `candidates` the word's, `drop` the junk the infinitive replaces.
 */
export function paradigmReadings(form: string, candidates: readonly WordCandidate[], lexicon: Lexicon): { add: Array<{ lemma: string; morph: string }>; drop: WordCandidate[] } {
  const bare = bareOf(form);
  const add: Array<{ lemma: string; morph: string }> = [];
  const offer = (lemma: string | undefined, morph: string): void => {
    if (lemma && !add.some((a) => a.lemma === lemma && a.morph === morph)) add.push({ lemma, morph });
  };
  const drop: WordCandidate[] = [];
  // 1. the perfect middle/passive of a verb in -αίρω: the stem is ἠρ-, the compound's prefix gives up its vowel (ἐξῆρται, ἀπῆρται, ἦρμαι)
  for (const [ending, person] of PERFECT_ENDINGS) {
    if (!bare.endsWith(`ηρ${ending}`)) continue;
    const lemma = verbOf(lexicon, `${bare.slice(0, -(2 + ending.length))}αιρω`);
    offer(lemma, `V-RPI-${person}`);
    offer(lemma, `V-RMI-${person}`);
  }
  // 2. the perfect middle/passive of a verb in -ωθέω, which takes ὠσ- (ἀπῶσμαι, ἐξῶσται, ἔωσμαι)
  for (const [ending, person] of PERFECT_ENDINGS) {
    if (!bare.endsWith(`ωσ${ending}`)) continue;
    const prefix = bare.slice(0, -(2 + ending.length));
    for (const lemma of new Set([verbOf(lexicon, `${prefix}ωθεω`), prefix === 'ε' ? verbOf(lexicon, 'ωθεω') : undefined])) {
      offer(lemma, `V-RPI-${person}`);
      offer(lemma, `V-RMI-${person}`);
    }
  }
  // 3. the aorist active of a verb in -αίω (κλαίω, καίω and their compounds): ἔκλαυσαν, ἔκαυσα, κατέκαυσαν; the stem has no iota in it
  for (const [ending, person] of AORIST_ENDINGS) {
    const m = new RegExp(`^(.*?)(κλ|κ)αυσ${ending}$`).exec(bare);
    if (!m || !m[1].endsWith('ε')) continue;
    const before = m[1].slice(0, -1);
    const prefixes = new Set([before, ...['α', 'ο', 'ε', 'ι'].map((v) => `${before}${v}`), before.endsWith('εξ') ? `${before.slice(0, -2)}εκ` : before]);
    for (const prefix of prefixes) offer(verbOf(lexicon, `${prefix}${m[2]}αιω`), `V-AAI-${person}`);
  }
  // 4. the infinitive of a verb in -άω (ζῆν, πεινῆν, διψῆν, τιμᾶν): the rules read -ῆν as a noun of a stem without it
  if (/(ην|αν)$/.test(bare)) {
    const lemma = verbOf(lexicon, `${bare.slice(0, -2)}αω`);
    if (lemma) {
      offer(lemma, 'V-PAN');
      drop.push(...candidates.filter((c) => c.via?.[0]?.startsWith('rule:') === true && bareOf(c.lemma) === bare.slice(0, -1) && /^[NA]-/.test(c.morph)));
    }
  }
  const verbs = [...new Set(candidates.filter((c) => c.morph.startsWith('V-')).map((c) => c.lemma))];
  for (const c of candidates) {
    const [, tail] = /^V-(.*)$/.exec(c.morph) ?? [];
    // 5. the indicative and the imperative of the present active second plural are one form (ἀνταποδίδοτε, λύετε)
    if (tail === 'PAI-2P' && bare.endsWith('τε')) offer(c.lemma, 'V-PAM-2P');
    if (tail === 'PAM-2P' && bare.endsWith('τε')) offer(c.lemma, 'V-PAI-2P');
    // 6. the first person singular and the third plural of a second aorist and an imperfect are one form (ἀνέσχον, ἔλυον)
    if ((tail === '2AAI-3P' || tail === 'IAI-3P') && /(ον|ουν|ων)$/.test(bare)) offer(c.lemma, `V-${tail.replace('3P', '1S')}`);
    if ((tail === '2AAI-1S' || tail === 'IAI-1S') && /(ον|ουν|ων)$/.test(bare)) offer(c.lemma, `V-${tail.replace('1S', '3P')}`);
    // 7. a dative plural participle of the present and the third plural of the present are one form (κατοικοῦσιν)
    if (/^PAP-DP[MN]$/.test(tail ?? '') && /(ουσιν|ουσι|ωσιν|ωσι|ασιν|ασι)$/.test(bare)) offer(c.lemma, 'V-PAI-3P');
    // 8. an adjective's genitive plural is one form in all three genders (πονηρῶν)
    const gp = /^A-GP([MFN])$/.exec(c.morph);
    if (gp) for (const gender of 'MFN') if (gender !== gp[1]) offer(c.lemma, `A-GP${gender}`);
  }
  // 9. the future middle of a verb the candidates read as a present: ἀποδώσομαι (-δίδωμι), ἐπιβλέψομαι (the stem takes -σ-, ψ, ξ)
  for (const lemma of verbs) {
    const letters = bareOf(lemma);
    const stems = letters.endsWith('διδωμι') ? [`${letters.slice(0, -6)}δωσ`] : letters.endsWith('ω') ? futureStems(letters.slice(0, -1)) : [];
    for (const stem of stems) for (const [ending, person] of FUTURE_ENDINGS) if (bare === `${stem}${ending}`) offer(lemma, `V-FMI-${person}`);
  }
  return { add, drop };
}

const beside = (lemma: string, morph: string, via: string, source?: 'morpheus'): WordCandidate => ({ lemma, morph, support: 0, share: 0, via: [via], beside: true, ...(source ? { source } : {}) });

/** The words after the pending ones have been offered what a rule can add (`formOf` is the Greek form of a word's reference; `morpheus` the book's cache, when there is one). */
export function completeReadings(outs: readonly Out[], formOf: (ref: string) => string, morpheus?: MorpheusCache, parser?: Pick<Parser, 'lexicon' | 'ntPos'>): Out[] {
  return outs.map((word) => {
    if (!isPending(word)) return word;
    if (word.candidates.length === 0) return parser ? withParadigm(word, [], formOf(word.ref), parser) : word;
    const candidates = parser ? tidy(word.candidates, formOf(word.ref), parser) : [...word.candidates];
    const has = (morph: string): boolean => candidates.some((c) => c.morph === morph);
    const known = morpheus?.get(morpheusKey(formOf(word.ref)));
    if (known && known.analyses.length && !word.candidates.some((c) => c.source === 'morpheus')) {
      // on a word the New Testament shows, only a reading of a lemma the word already has (ταλαίπωρος, a two-ending adjective, beside its feminine): its counts are better than a second method's
      const unshown = unattested(word);
      const lemmas = new Set(word.candidates.map((c) => bareOf(c.lemma)));
      // Morpheus lists a contraction TBESG lists as a headword of its own (ᾠδός for ἀοιδός) too: no more a reading here than in the rules' candidates
      const contraction = (lemma: string): boolean => parser?.lexicon.get(bareOf(lemma))?.some((e) => e.lemma === lemma && e.contracted) === true && !parser.ntPos.has(lemma);
      const added: WordCandidate[] = [];
      for (const m of known.analyses) {
        if (!unshown && !lemmas.has(bareOf(m.lemma))) continue;
        if (contraction(m.lemma)) continue;
        if (!candidates.some((c) => bareOf(c.lemma) === bareOf(m.lemma) && c.morph === m.code)) added.push(beside(m.lemma, m.code, VIA_MORPHEUS, 'morpheus'));
      }
      // candidates that are all analogy's are a guess at a stem, Morpheus's a lexicon's analysis of the form itself: his readings come first (story mw-u2w5klk.371; weighMorpheus does the same)
      if (added.length && candidates.every((c) => c.analogy)) candidates.unshift(...added);
      else candidates.push(...added);
    }
    for (const c of [...candidates]) {
      const cng = cngOf(c.morph);
      if (!cng || cng[0] !== 'N' || !(cng[1] === 'P' || cng[2] === 'N')) continue;
      const vocative = withCng(c.morph, `V${cng.slice(1)}`);
      if (!has(vocative) && !candidates.some((x) => x.morph === vocative)) candidates.push(beside(c.lemma, vocative, VIA_VOCATIVE));
    }
    for (const c of [...candidates]) {
      const cng = cngOf(c.morph);
      if (!cng || cng[2] !== 'M' || !c.morph.startsWith('N-') || !SEPTUAGINT_FEMININE.has(bareOf(c.lemma))) continue;
      const feminine = withCng(c.morph, `${cng.slice(0, 2)}F`);
      if (!candidates.some((x) => x.morph === feminine && x.lemma === c.lemma)) candidates.push(beside(c.lemma, feminine, VIA_FEMININE));
    }
    return parser ? withParadigm(word, candidates, formOf(word.ref), parser) : changed(word, candidates);
  });
}

const changed = (word: PendingWord, candidates: WordCandidate[]): PendingWord =>
  candidates.length === word.candidates.length && candidates.every((c, i) => c === word.candidates[i]) ? word : { ...word, candidates, notes: [...word.notes, NOTE_COMPLETED] };

/** The word with the paradigm readings (`paradigmReadings`) beside its `candidates`, the invented lemmas the infinitive replaces left out; a word that had none and gains one is no longer 'no candidate'. */
function withParadigm(word: PendingWord, candidates: WordCandidate[], form: string, parser: Pick<Parser, 'lexicon'>): PendingWord {
  const { add, drop } = paradigmReadings(form, candidates, parser.lexicon);
  const kept = candidates.filter((c) => !drop.includes(c));
  for (const a of add) if (!kept.some((c) => bareOf(c.lemma) === bareOf(a.lemma) && c.morph === a.morph)) kept.push(beside(a.lemma, a.morph, VIA_PARADIGM));
  const done = changed(word, kept);
  return word.candidates.length || done === word ? done : { ...done, notes: done.notes.filter((n) => n !== NOTE_NO_CANDIDATE) };
}
