// tests/unit/diagram-numeral.test.ts — a compound numeral phrase is one box in the Diagram (mw-5r3p30.1128; src/diagram/numeral.ts): Genesis 14:14's eight, ten, and, three, hundred are one '318'
// that a tap opens to its words, John 21:11's three Greek words one '153', a number of one word stays as it was, and every phrase of the shipped text the Number sheet adds up (the sweep) folds.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { foldNumerals, numeralBoxes } from '../../src/diagram/numeral';
import { buildDiagramRequest } from '../../src/diagram/request';
import type { Diagram, DiagramMode, Modifier, Slot, TokenRef } from '../../src/diagram/types';
import { validateDiagram } from '../../src/diagram/validate';
import { flatDiagram } from '../support/flat-diagram';
import { sweepChapter } from '../../scripts/numeral-sweep';
import { slotOf } from '../support/diagram-fixtures';

const chapterOf = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;
const verseOf = (chapter: Chapter, n: number) => chapter.verses.find((v) => v.n === n)!;

/** Every word index the tree uses. */
function used(diagram: Diagram): number[] {
  const out: number[] = [];
  const ref = (r: TokenRef | undefined): void => {
    if (r && 'i' in r) out.push(r.i);
  };
  const slot = (s: Slot): void => {
    s.words.forEach(ref);
    s.modifiers.forEach(modifier);
  };
  const modifier = (m: Modifier): void => {
    if (m.kind === 'word') {
      ref(m.word);
      m.modifiers.forEach(modifier);
    } else if (m.kind === 'prepositional') {
      ref(m.preposition);
      slot(m.object);
    } else {
      ref(m.connector);
      clause(m.clause);
    }
  };
  const clause = (c: Diagram['clauses'][number]['clause']): void => {
    slot(c.subject);
    slot(c.verb);
    if (c.complement) slot(c.complement.slot);
  };
  diagram.clauses.forEach((e) => {
    ref(e.joinedBy);
    clause(e.clause);
  });
  return out;
}

function draw(code: string, n: number, verse: number, mode: DiagramMode) {
  const chapter = chapterOf(code, n);
  const v = verseOf(chapter, verse);
  const { request, words } = buildDiagramRequest(chapter, [v], mode);
  return { verses: [v], words, diagram: flatDiagram(request as unknown as Record<string, unknown>) };
}

describe('Genesis 14:14 in Hebrew', () => {
  const { verses, words, diagram } = draw('gen', 14, 14, 'hebrew');
  const boxes = numeralBoxes(verses, words, 'hebrew');

  it('finds one numeral box, 318, of the five pieces eight, ten, and, three, hundred', () => {
    expect(boxes).toHaveLength(1);
    expect(boxes[0].label).toBe('318');
    expect(boxes[0].members.map((i) => words[i].gloss)).toEqual(['eight', 'ten', 'and', 'three', 'hundred']);
  });

  it('folds into one word, 318, and the tree draws it once and the other four pieces not at all', () => {
    const folded = foldNumerals(diagram, words, boxes, new Set());
    const host = boxes[0].members[0];
    expect(folded.words[host]).toMatchObject({ text: '318', numeral: boxes[0].members });
    expect(folded.words[host].gloss ?? '').toBe('');
    const drawn = used(folded.diagram);
    expect(drawn).toContain(host);
    for (const other of boxes[0].members.slice(1)) expect(drawn).not.toContain(other);
    expect(drawn).toHaveLength(used(diagram).length - 4);
    expect(folded.shut).toEqual(boxes);
    expect(folded.opened).toEqual([]);
  });

  it('opened, it is the tree and the words as the tutor drew them', () => {
    const folded = foldNumerals(diagram, words, boxes, new Set([boxes[0].id]));
    expect(folded.diagram).toBe(diagram);
    expect(folded.words).toBe(words);
    expect(folded.shut).toEqual([]);
    expect(folded.opened).toEqual(boxes);
  });

  it('the English diagram is not folded: its "318" is already one word', () => {
    const english = draw('gen', 14, 14, 'english');
    expect(numeralBoxes(english.verses, english.words, 'english')).toEqual([]);
  });
});

describe('John 21:11 in Greek', () => {
  it('folds the hundred, fifty and three into 153', () => {
    const { verses, words, diagram } = draw('jhn', 21, 11, 'greek');
    const boxes = numeralBoxes(verses, words, 'greek');
    expect(boxes.map((b) => b.label)).toEqual(['153']);
    expect(boxes[0].members.map((i) => words[i].text)).toEqual(['ἑκατὸν', 'πεντήκοντα', 'τριῶν']);
    expect(used(foldNumerals(diagram, words, boxes, new Set()).diagram)).toHaveLength(used(diagram).length - 2);
  });
});

describe('a number of one word, or a phrase the English does not say', () => {
  it('Genesis 5:5 ("930 years" is thirty and nine hundred, split by a noun) is not folded', () => {
    const { verses, words } = draw('gen', 5, 5, 'hebrew');
    expect(numeralBoxes(verses, words, 'hebrew')).toEqual([]);
  });

  it('a verse with no phrase is unchanged: the same diagram and words come back', () => {
    const { verses, words, diagram } = draw('gen', 1, 1, 'hebrew');
    expect(numeralBoxes(verses, words, 'hebrew')).toEqual([]);
    const folded = foldNumerals(diagram, words, [], new Set());
    expect(folded.diagram).toBe(diagram);
    expect(folded.words).toBe(words);
  });
});

describe('where the tutor put the pieces', () => {
  const { verses, words } = draw('gen', 14, 14, 'hebrew');
  const boxes = numeralBoxes(verses, words, 'hebrew');
  const [eight, ten, and, three, hundred] = boxes[0].members;
  const rest = words.map((_, i) => i).filter((i) => !boxes[0].members.includes(i));
  const wordMod = (i: number, modifiers: Modifier[] = []): Modifier => ({ kind: 'word', word: { i }, modifiers });

  it('the pieces of a numeral nested as modifiers of one another fold, and what hung under a dropped piece re-hangs on its parent', () => {
    const noun = rest[rest.length - 1];
    const tree: Diagram = {
      clauses: [
        {
          clause: {
            subject: slotOf(rest[0]),
            verb: { words: [{ i: rest[1] }], modifiers: rest.slice(2, -1).map((i) => wordMod(i)) },
            complement: { kind: 'direct-object', slot: { words: [{ i: noun }], modifiers: [wordMod(eight, [wordMod(ten, [wordMod(and)]), wordMod(three, [wordMod(hundred)])])] } },
          },
        },
      ],
    };
    expect(validateDiagram(tree, words.length).ok).toBe(true);
    const folded = foldNumerals(tree, words, boxes, new Set());
    expect(folded.shut).toEqual(boxes);
    expect(used(folded.diagram).sort((a, b) => a - b)).toEqual([...rest, eight].sort((a, b) => a - b));
  });

  it('a numeral piece the tree uses as a preposition or a connector cannot fold: the words stay as drawn', () => {
    const tree: Diagram = {
      clauses: [
        {
          clause: {
            subject: slotOf(rest[0]),
            verb: { words: [{ i: rest[1] }], modifiers: [{ kind: 'prepositional', preposition: { i: and }, object: slotOf(eight, ten, three, hundred) }, ...rest.slice(2).map((i) => wordMod(i))] },
          },
        },
      ],
    };
    const folded = foldNumerals(tree, words, boxes, new Set());
    expect(folded.diagram).toBe(tree);
    expect(folded.words).toBe(words);
    expect(folded.shut).toEqual([]);
    expect(folded.opened).toEqual([]);
  });

  it('a slot that would be left with no word cannot fold', () => {
    const tree: Diagram = {
      clauses: [
        {
          clause: {
            subject: slotOf(rest[0]),
            verb: { words: [{ i: rest[1] }], modifiers: [{ kind: 'prepositional', preposition: { i: rest[2] }, object: slotOf(eight) }, { kind: 'prepositional', preposition: { i: rest[3] }, object: slotOf(ten, and, three, hundred) }, ...rest.slice(4).map((i) => wordMod(i))] },
          },
        },
      ],
    };
    expect(foldNumerals(tree, words, boxes, new Set()).shut).toEqual([]);
  });
});

/** An understood subject, the first word the verb and every word after it a modifier of it: any word, numeral pieces among them, may be taken out. */
const modifiersOnly = (count: number): Diagram => ({
  clauses: [
    {
      clause: {
        subject: { words: [{ implied: 'it' }], modifiers: [] },
        verb: { words: [{ i: 0 }], modifiers: Array.from({ length: count - 1 }, (_, k): Modifier => ({ kind: 'word', word: { i: k + 1 }, modifiers: [] })) },
      },
    },
  ],
});

describe('every numeral phrase of the shipped text that its English says (the sweep)', () => {
  it('folds: one box for each, in the Hebrew Old Testament and the Greek New Testament', () => {
    let phrases = 0;
    let boxed = 0;
    const dir = 'public/data';
    for (const code of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
      for (const file of readdirSync(`${dir}/${code}`)) {
        if (!/^\d+\.json$/.test(file)) continue;
        const chapter = JSON.parse(readFileSync(`${dir}/${code}/${file}`, 'utf8')) as Chapter;
        const view: DiagramMode = chapter.lang === 'hbo' ? 'hebrew' : 'greek';
        const matching = sweepChapter(code, chapter).filter((f) => f.status === 'match');
        if (matching.length === 0) continue;
        phrases += matching.length;
        for (const verse of chapter.verses) {
          const { words } = buildDiagramRequest(chapter, [verse], view);
          const boxes = numeralBoxes([verse], words, view);
          const folded = foldNumerals(modifiersOnly(words.length), words, boxes, new Set());
          expect(folded.shut, `${code} ${chapter.chapter}:${verse.n}`).toHaveLength(boxes.length);
          boxed += boxes.length;
        }
      }
    }
    expect(phrases).toBeGreaterThan(1000);
    expect(boxed).toBe(phrases);
  });
});
