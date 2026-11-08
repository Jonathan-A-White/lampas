// src/diagram/numeral.ts — a compound numeral phrase is one box in the Diagram (mw-5r3p30.1128, his ask 2026-11-06 on Genesis 14:14 'the 318'; PROVISIONAL, the Governor to confirm). The Hebrew writes 318 as
// 'eight ten and three hundred' and the Greek 153 as 'hundred fifty three': drawn word for word the diagram has four or five nodes where the English has one number. The tutor's tree is unchanged (and kept
// as it was drawn); at draw time the first piece of the phrase becomes a box that says the sum ('318', DiagramWord.numeral names the pieces it stands for) and the other pieces are taken out of the tree, what
// hung under one of them hanging on what it hung on. A tap on the box opens it: the tree as the tutor drew it, every piece its own node, each opening its word sheet. A phrase is folded only where
// the Number sheet would open (src/data/numerals.ts numberPhraseOf: the English says the sum too), and only where the tree puts every piece where it can be taken out. The English diagram is not folded:
// its chunk 'the 318' is already one word. Pure: no store, no network.
import type { Verse } from '../data/chapter';
import { numeralPhrases, phraseSays, type NumeralLanguage } from '../data/numerals';
import type { Clause, Diagram, DiagramMode, DiagramWords, Modifier, Slot } from './types';

/** One numeral phrase of the diagram's words. */
export interface NumeralBox {
  /** the index in the diagram's words of its first piece: the box's name, and the word that is drawn as the box */
  id: number;
  /** the pieces' indexes in the diagram's words, in the order of the text (the first is `id`) */
  members: number[];
  /** the sum, as the sheet says it: '318', '1,000' */
  label: string;
}

/** The numeral phrases of `verses` (the verses of one sentence) that `words` draw: Hebrew pieces or Greek words (mode 'hebrew' or 'greek'). A Hebrew phrase's first word is its own piece only, its prefixes ('to', 'the') stay out of the number. */
export function numeralBoxes(verses: readonly Verse[], words: DiagramWords, mode: DiagramMode): NumeralBox[] {
  if (mode === 'english') return [];
  const language: NumeralLanguage = mode === 'hebrew' ? 'hbo' : 'grc';
  const boxes: NumeralBox[] = [];
  for (const verse of verses) {
    const pieces = new Map<number, number[]>();
    words.forEach((w, i) => {
      if (!('word' in w) || (w.verse ?? verses[0].n) !== verse.n) return;
      pieces.set(w.word, [...(pieces.get(w.word) ?? []), i]);
    });
    for (const phrase of numeralPhrases(verse.g, language)) {
      if (!phraseSays(verse, phrase).includes(phrase.sum)) continue;
      const parts = phrase.parts.map((part, k) => {
        const own = pieces.get(part.index) ?? [];
        return k === 0 && language === 'hbo' ? own.slice(-1) : own;
      });
      if (parts.some((own) => own.length === 0)) continue;
      const members = parts.flat();
      if (members.length >= 2) boxes.push({ id: members[0], members, label: phrase.sum.toLocaleString('en-US') });
    }
  }
  return boxes;
}

/** A piece the tree puts where it cannot be taken out (a preposition, a connector, a joining word, the only word of a place). */
class Fixed extends Error {}

/** `diagram` without the pieces `drop`, which must each stand as a word of a place or as a word modifier; `keep` (the box's own piece) must stand so too. */
function without(diagram: Diagram, drop: ReadonlySet<number>, keep: number): Diagram {
  let dropped = 0;
  let kept = false;
  const isDropped = (i: number): boolean => drop.has(i);
  const place = (slot: Slot): Slot => {
    const words = slot.words.filter((ref) => !('i' in ref && isDropped(ref.i)));
    dropped += slot.words.length - words.length;
    if (words.length === 0) throw new Fixed();
    if (words.some((ref) => 'i' in ref && ref.i === keep)) kept = true;
    return { words, modifiers: hung(slot.modifiers) };
  };
  const hung = (list: Modifier[]): Modifier[] =>
    list.flatMap((m): Modifier[] => {
      if (m.kind === 'word') {
        if ('i' in m.word && isDropped(m.word.i)) {
          dropped += 1;
          return hung(m.modifiers);
        }
        if ('i' in m.word && m.word.i === keep) kept = true;
        return [{ ...m, modifiers: hung(m.modifiers) }];
      }
      if (m.kind === 'prepositional') {
        if ('i' in m.preposition && isDropped(m.preposition.i)) throw new Fixed();
        return [{ ...m, object: place(m.object) }];
      }
      if (m.connector && 'i' in m.connector && isDropped(m.connector.i)) throw new Fixed();
      return [{ ...m, clause: clause(m.clause) }];
    });
  const clause = (c: Clause): Clause => ({ ...c, subject: place(c.subject), verb: place(c.verb), ...(c.complement ? { complement: { ...c.complement, slot: place(c.complement.slot) } } : {}) });
  const clauses = diagram.clauses.map((entry) => {
    if (entry.joinedBy && 'i' in entry.joinedBy && isDropped(entry.joinedBy.i)) throw new Fixed();
    return { ...entry, clause: clause(entry.clause) };
  });
  if (dropped !== drop.size || !kept) throw new Fixed();
  return { clauses };
}

export interface FoldedNumerals {
  diagram: Diagram;
  words: DiagramWords;
  /** the boxes drawn as one word */
  shut: NumeralBox[];
  /** the boxes that could fold and are open: drawn as the tutor drew them, with 'Fold' offered */
  opened: NumeralBox[];
}

/** `diagram` and `words` with each box of `boxes` folded into its first piece, except the boxes in `open` (by id) and the boxes the tree puts where they cannot fold; the same diagram and words when nothing folds. */
export function foldNumerals(diagram: Diagram, words: DiagramWords, boxes: readonly NumeralBox[], open: ReadonlySet<number>): FoldedNumerals {
  let tree = diagram;
  let shown = words;
  const shut: NumeralBox[] = [];
  const opened: NumeralBox[] = [];
  for (const box of boxes) {
    let next: Diagram;
    try {
      next = without(tree, new Set(box.members.slice(1)), box.id);
    } catch (error) {
      if (error instanceof Fixed) continue;
      throw error;
    }
    if (open.has(box.id)) {
      opened.push(box);
      continue;
    }
    tree = next;
    if (shown === words) shown = [...words];
    shown[box.id] = { ...words[box.id], text: box.label, gloss: undefined, numeral: box.members };
    shut.push(box);
  }
  return { diagram: tree, words: shown, shut, opened };
}
