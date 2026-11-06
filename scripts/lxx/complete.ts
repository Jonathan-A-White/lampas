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
// Not here: ἐμοῦ as the personal pronoun (P-1GS): TAGNT writes ἐμοῦ S-1SGSN in all its 114 words (mw-u2w5klk.284 holds the recheck), so the candidates are TAGNT's.
import { cngOf, withCng } from './agreement';
import { NOTE_NOT_IN_NT, type DerivedWord, type PendingWord, type WordCandidate } from './derive';
import { morpheusKey, type MorpheusCache } from './morpheus';
import type { Parser } from './parser';
import { bareOf } from './swete';
import { posOf, type LexEntry } from './tbesg';

export const NOTE_COMPLETED = 'readings added beside the candidates (Morpheus, the vocative, the feminine), junk left out: for the model';
const VIA_MORPHEUS = 'Morpheus: the second method, a build tool';
export const VIA_VOCATIVE = 'the vocative beside the nominative: the same form in the plural and in the neuter';
export const VIA_FEMININE = 'the feminine beside the masculine: the Septuagint writes this noun feminine';

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

const beside = (lemma: string, morph: string, via: string, source?: 'morpheus'): WordCandidate => ({ lemma, morph, support: 0, share: 0, via: [via], beside: true, ...(source ? { source } : {}) });

/** The words after the pending ones have been offered what a rule can add (`formOf` is the Greek form of a word's reference; `morpheus` the book's cache, when there is one). */
export function completeReadings(outs: readonly Out[], formOf: (ref: string) => string, morpheus?: MorpheusCache, parser?: Pick<Parser, 'lexicon' | 'ntPos'>): Out[] {
  return outs.map((word) => {
    if (!isPending(word) || word.candidates.length === 0) return word;
    const candidates = parser ? tidy(word.candidates, formOf(word.ref), parser) : [...word.candidates];
    const has = (morph: string): boolean => candidates.some((c) => c.morph === morph);
    const known = morpheus?.get(morpheusKey(formOf(word.ref)));
    if (known && known.analyses.length && !word.candidates.some((c) => c.source === 'morpheus')) {
      // on a word the New Testament shows, only a reading of a lemma the word already has (ταλαίπωρος, a two-ending adjective, beside its feminine): its counts are better than a second method's
      const unshown = unattested(word);
      const lemmas = new Set(word.candidates.map((c) => bareOf(c.lemma)));
      // Morpheus lists a contraction TBESG lists as a headword of its own (ᾠδός for ἀοιδός) too: no more a reading here than in the rules' candidates
      const contraction = (lemma: string): boolean => parser?.lexicon.get(bareOf(lemma))?.some((e) => e.lemma === lemma && e.contracted) === true && !parser.ntPos.has(lemma);
      for (const m of known.analyses) {
        if (!unshown && !lemmas.has(bareOf(m.lemma))) continue;
        if (contraction(m.lemma)) continue;
        if (!candidates.some((c) => bareOf(c.lemma) === bareOf(m.lemma) && c.morph === m.code)) candidates.push(beside(m.lemma, m.code, VIA_MORPHEUS, 'morpheus'));
      }
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
    return candidates.length === word.candidates.length && candidates.every((c, i) => c === word.candidates[i]) ? word : { ...word, candidates, notes: [...word.notes, NOTE_COMPLETED] };
  });
}
