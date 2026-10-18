// src/data/grammar/textIdeas.ts — the ideas a word of the text shows that no parsing code names (mw-5r3p30.604, PROVISIONAL, docs/grammar.md 'What a passage needs'): a verb
// with a preposition in front, a word a mark tells from its twin, an enclitic, a word a pronunciation says like another, a letter that moves. Read off the word as it
// stands (its form, dictionary form and code), like patterns.ts; ladder.ts ideasOfWord adds them to the ideas its code names, so a goal's needs, the placement and
// every screen that asks "what does this word need" read them from one place. Pure: no ladder, no store.
import { MARK_PAIRS } from './marks';
import { COMPOUND_VERBS } from './prepositions';
import { SOUND_ALIKE } from './soundAlike';

/** The ids of the ideas textIdeasOf can name, in the ladder's order. */
export const TEXT_IDEAS = ['words-sound-alike', 'movable-letters', 'marks-change-word', 'enclitics', 'compound-verbs'] as const;
export type TextIdea = (typeof TEXT_IDEAS)[number];

const nfc = (text: string): string => text.normalize('NFC').toLowerCase();
const bare = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const COMPOUNDS = new Set(COMPOUND_VERBS.map((c) => nfc(c.lemma)));
/** Both words of each pair, as the lesson lists them and as the phrase spells them (a grave accent is an acute before another word). */
const PAIR_WORDS = new Set(MARK_PAIRS.flatMap(({ a, b }) => [a.word, a.inPhrase, b.word, b.inPhrase].map(nfc)));
const ALIKE_WORDS = new Set(SOUND_ALIKE.flatMap(({ a, b }) => [a.word, b.word, a.nt.word, b.nt.word].map(bare)));
/** The small forms of ἐγώ and σύ that lean on the word before them. */
const LEANING = new Set(['μου', 'μοι', 'με', 'σου', 'σοι', 'σε']);
/** The forms of εἰμί in the present indicative that lean (εἶ, the second person singular, does not). */
const PRESENT_ESTI = /^V-PAI-(?:1S|3S|1P|2P|3P)(?:-|$)/;
const MOVES = new Set(['οὐκ', 'οὐχ', 'ἐξ']);
const ELIDED = /['’᾿ʼ]$/;

/**
 * The text ideas a word of the text shows, from its form `t`, its dictionary form `l` and its RP parsing code `p`, in the ladder's order. A compound
 * verb is one COMPOUND_VERBS lists (PROVISIONAL: a verb it does not list is not found); an enclitic is a present εἰμί but εἶ, τις (not τίς), and the small
 * forms of ἐγώ and σύ.
 */
export function textIdeasOf(word: { t?: string; l: string; p: string }): TextIdea[] {
  const form = word.t ?? '';
  const lemma = nfc(word.l);
  const out = new Set<TextIdea>();
  if (ALIKE_WORDS.has(bare(form))) out.add('words-sound-alike');
  if (MOVES.has(nfc(form)) || MOVES.has(nfc(bare(form))) || ELIDED.test(form)) out.add('movable-letters');
  if (PAIR_WORDS.has(nfc(form))) out.add('marks-change-word');
  if (
    (lemma === 'εἰμί' && PRESENT_ESTI.test(word.p)) ||
    (lemma === 'τις' && word.p.startsWith('X-')) ||
    ((lemma === 'ἐγώ' || lemma === 'σύ') && LEANING.has(bare(form)))
  ) {
    out.add('enclitics');
  }
  if (word.p.startsWith('V-') && COMPOUNDS.has(lemma)) out.add('compound-verbs');
  return TEXT_IDEAS.filter((id) => out.has(id));
}
