// src/diagram/emptied.ts — a diagram never draws a place with no word (mw-5r3p30.1233), pure. The Weave (weave.ts) draws the English words of a chunk it shows in Greek as nothing (text ''), the
// Greek word standing on the first of them: of 'we have heard' the Greek verb ἀκηκόαμεν takes the place of 'we' (the subject's) and 'have' and 'heard' (the verb's) are left empty, so the verb's slot is drawn
// bare and the Greek verb stands where the subject goes; 'our own' leaves a leg with no word. repairEmptied(diagram, words, original) draws it as Reed-Kellogg writes it: a clause whose subject holds a woven Greek word whose chunk's other words are in the verb (emptied) takes
// that word into the verb's place and leaves the subject understood, in parentheses, in the English the word had ('(we)'); a clause with no such word draws its verb in English; and every other
// emptied word is taken out of the tree, what hung under it hanging from what it hung from. The tree it is given is not changed. validate.ts drawnFaults is the rule it leaves none of.
import type { Clause, ClauseEntry, Diagram, DiagramWords, Modifier, Slot, TokenRef } from './types';

export interface Repaired {
  diagram: Diagram;
  words: DiagramWords;
}

/** `diagram` and its `words` (as drawn, the Weave's) with no place left bare; `original` are the words before the Weave. The very same two when no word is drawn as nothing. */
export function repairEmptied(diagram: Diagram, words: DiagramWords, original: DiagramWords): Repaired {
  if (words === original || !words.some((w) => w.text === '')) return { diagram, words };
  const shown = [...words];
  const blank = (ref: TokenRef): boolean => 'i' in ref && shown[ref.i]?.text === '';
  const woven = (ref: TokenRef): boolean => 'i' in ref && (shown[ref.i]?.weft?.length ?? 0) > 0 && !blank(ref);
  const sameChunk = (a: TokenRef, b: TokenRef): boolean => {
    const x = 'i' in a ? shown[a.i] : undefined;
    const y = 'i' in b ? shown[b.i] : undefined;
    return !!x && !!y && 'chunk' in x && 'chunk' in y && x.chunk === y.chunk && x.verse === y.verse;
  };
  const understoodAs = (ref: TokenRef): TokenRef => ('i' in ref ? { implied: (original[ref.i]?.text ?? '').toLowerCase() } : ref);

  const slot = (s: Slot): Slot | null => {
    let list = s.words.filter((w) => !blank(w));
    let mods = modifiers(s.modifiers);
    if (list.length === 0) {
      // the words are gone: the first word hanging under them stands in their place
      const head = mods.findIndex((m) => m.kind === 'word');
      if (head < 0) return null;
      const lead = mods[head] as Extract<Modifier, { kind: 'word' }>;
      list = [lead.word];
      mods = [...lead.modifiers, ...mods.filter((_, k) => k !== head)];
    }
    return { words: list, modifiers: mods };
  };

  const modifiers = (list: Modifier[]): Modifier[] =>
    list.flatMap((m): Modifier[] => {
      if (m.kind === 'word') return blank(m.word) ? modifiers(m.modifiers) : [{ ...m, modifiers: modifiers(m.modifiers) }];
      if (m.kind === 'clause') {
        const { connector, ...rest } = m;
        return [{ ...rest, ...(connector && !blank(connector) ? { connector } : {}), clause: clause(m.clause) }];
      }
      const object = slot(m.object);
      if (!blank(m.preposition)) return [object ? { ...m, object } : { kind: 'word', word: m.preposition, modifiers: [] }];
      if (!object) return [];
      // no preposition to write: its object takes the line, the object's other words and what hangs under them below it
      const [lead, ...more] = object.words;
      return [{ kind: 'word', word: lead, modifiers: [...more.map((word): Modifier => ({ kind: 'word', word, modifiers: [] })), ...object.modifiers] }];
    });

  function clause(c: Clause): Clause {
    let subject = c.subject;
    let verb = c.verb;
    // the Greek word stands where the English chunk's FIRST word was: when that is in the subject and the rest of the chunk (the verb's 'have heard') is the verb's, it belongs in the verb's place
    const moved = subject.words.filter((w) => woven(w) && verb.words.some((v) => blank(v) && sameChunk(w, v)));
    if (moved.length > 0) {
      verb = { ...verb, words: [...moved, ...verb.words.filter((v) => !moved.includes(v))] };
      subject = { ...subject, words: subject.words.map((w) => (moved.includes(w) ? understoodAs(w) : w)) };
    } else if (verb.words.length > 0 && verb.words.every(blank)) {
      for (const w of verb.words) if ('i' in w) shown[w.i] = original[w.i];
    }
    const placeOf = (s: Slot): Slot | null => slot(s);
    const kept = placeOf(subject) ?? { words: [understoodAs(subject.words.find(blank) ?? { implied: '' })], modifiers: [] };
    const out: Clause = { subject: kept, verb: placeOf(verb) ?? verb };
    if (c.complement) {
      const complement = placeOf(c.complement.slot);
      if (complement) out.complement = { kind: c.complement.kind, slot: complement };
    }
    if (c.independent) {
      const independent = c.independent.flatMap((e) => {
        const s = placeOf(e.slot);
        return s ? [{ kind: e.kind, slot: s }] : [];
      });
      if (independent.length > 0) out.independent = independent;
    }
    return out;
  }

  const entries = diagram.clauses.map((entry): ClauseEntry => {
    const { joinedBy, ...rest } = entry;
    return { ...rest, ...(joinedBy && !blank(joinedBy) ? { joinedBy } : {}), clause: clause(entry.clause) };
  });
  return { diagram: { clauses: entries }, words: shown };
}
