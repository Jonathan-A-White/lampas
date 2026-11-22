// tests/unit/diagram-emptied.test.ts — a diagram never draws a place with no word (mw-5r3p30.1233). 1 John 1:1 in the English diagram with every word woven into Greek: the Weave draws
// the words of a chunk it shows in Greek as nothing, so 'we have heard' left the verb's slot empty (ἀκηκόαμεν stood in the subject's) and 'our own' left a leg with no word. drawnFaults
// (validate.ts) names each such place; repairEmptied (emptied.ts) puts the Greek verb in the verb's place with the subject understood and takes the bare legs out.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { weaveVerse, wovenInOrder } from '../../src/data/weave';
import { repairEmptied } from '../../src/diagram/emptied';
import { layoutDiagram } from '../../src/diagram/layout';
import { buildDiagramRequest } from '../../src/diagram/request';
import { hang, prep, slot, understood } from '../../src/diagram/handwritten';
import type { Clause, Diagram, DiagramWords, Modifier } from '../../src/diagram/types';
import { drawnFaults, validateDiagram } from '../../src/diagram/validate';
import { weaveDiagramWords } from '../../src/diagram/weave';

const john1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const verse = john1.verses[0];
const english = buildDiagramRequest(john1, [verse], 'english').words;
const woven = wovenInOrder(verse, weaveVerse(verse, { solid: new Set(verse.g.map((g) => (g.l ?? '').normalize('NFC'))) }), 'english');
const shown = weaveDiagramWords(english, [verse], () => woven);

// 'That which was from the beginning, which we have heard, which we have seen with our own eyes, which we have gazed upon and touched with our own hands: this is the Word of life.'
const relative = (clause: Clause): Modifier => ({ kind: 'clause', clause });
const heard: Clause = { subject: slot([7]), verb: slot([8, 9]), complement: { kind: 'direct-object', slot: slot([6]) } };
const seen: Clause = {
  subject: slot([11]),
  verb: slot([12, 13], [prep(14, slot([17], [hang(15), hang(16)]))]),
  complement: { kind: 'direct-object', slot: slot([10]) },
};
const gazed: Clause = { subject: slot([19]), verb: slot([20, 21, 22]), complement: { kind: 'direct-object', slot: slot([18]) } };
const tree: Diagram = {
  clauses: [
    { clause: { subject: slot([1], [hang(0), relative(heard), relative(seen), relative(gazed)]), verb: slot([2], [prep(3, slot([5], [hang(4)]))]) } },
    { joinedBy: { i: 23 }, clause: { subject: understood('we'), verb: slot([24], [prep(25, slot([28], [hang(26), hang(27)]))]) } },
    { clause: { subject: slot([29]), verb: slot([30]), complement: { kind: 'predicate-nominative', slot: slot([32], [hang(31), prep(33, slot([34]))]) } } },
  ],
};
const drawnText = (words: DiagramWords, layout: ReturnType<typeof layoutDiagram>): string[] => layout.labels.map((l) => (l.index === undefined ? l.text : words[l.index].text));
const measure = (t: string): number => t.length * 8;

describe('1 John 1:1, the English diagram woven into Greek', () => {
  it('has a tree that keeps THE RULE', () => {
    expect(english).toHaveLength(35);
    expect(validateDiagram(tree, english.length)).toEqual({ ok: true });
  });

  it('as the Weave draws it, leaves the verb\'s place empty and a leg with no word', () => {
    expect(shown.slice(7, 10).map((w) => w.text)).toEqual(['ἀκηκόαμεν', '', '']);
    const faults = drawnFaults(tree, shown);
    expect(faults.filter((f) => f.kind === 'bare-verb').map((f) => f.at)).toEqual(['clause 1 > subject > modifier 2 > clause 2', 'clause 1 > subject > modifier 3 > clause 3', 'clause 1 > subject > modifier 4 > clause 4']);
    expect(faults.filter((f) => f.kind === 'bare-leg').length).toBeGreaterThan(0);
  });

  it('is repaired: each relative clause has its verb in the verb\'s place and the subject understood, and no place is drawn bare', () => {
    const fixed = repairEmptied(tree, shown, english);
    expect(drawnFaults(fixed.diagram, fixed.words)).toEqual([]);
    const subject = fixed.diagram.clauses[0].clause.subject;
    const clauses = subject.modifiers.filter((m) => m.kind === 'clause').map((m) => (m.kind === 'clause' ? m.clause : heard));
    expect(clauses).toHaveLength(3);
    const first = clauses[0];
    expect(first.subject.words).toEqual([{ implied: 'we' }]);
    expect(first.verb.words).toEqual([{ i: 7 }]);
    expect(fixed.words[7].text).toBe('ἀκηκόαμεν');
    expect(clauses[1].verb.words).toEqual([{ i: 11 }]);
    expect(clauses[2].verb.words).toEqual([{ i: 19 }]);
    expect(clauses[2].subject.words).toEqual([{ implied: 'we' }]);
  });

  it('draws that as (we) | ἀκηκόαμεν | ὃ on the base line, and every leg with its word', () => {
    const fixed = repairEmptied(tree, shown, english);
    const layout = layoutDiagram(fixed.diagram, fixed.words, measure);
    const heardLine = layout.labels.filter((l) => l.clause === 1);
    expect(heardLine.map((l) => [l.role, l.text])).toEqual([
      ['subject', '(we)'],
      ['verb', 'ἀκηκόαμεν'],
      ['complement', 'ὃ'],
    ]);
    const x = (role: string): number => heardLine.find((l) => l.role === role)!.x;
    expect(x('subject')).toBeLessThan(x('verb'));
    expect(x('verb')).toBeLessThan(x('complement'));
    expect(drawnText(fixed.words, layout).every((t) => t !== '')).toBe(true);
    // each slanted leg (a modifier line) ends on a foot line that carries a label
    for (const leg of layout.segments.filter((s) => s.kind === 'modifier')) {
      const foot = layout.segments.find((s) => s.kind === 'foot' && s.x1 === leg.x2 && s.y1 === leg.y2);
      expect(foot).toBeDefined();
      expect(layout.labels.some((l) => l.y === leg.y2 && l.x >= leg.x2 && l.x <= foot!.x2)).toBe(true);
    }
  });

  it('draws τοῖς ὀφθαλμοῖς ἡμῶν with a line each and none bare', () => {
    const fixed = repairEmptied(tree, shown, english);
    const texts = fixed.words.map((w) => w.text);
    expect(texts[14]).toBe('τοῖς');
    expect(texts[17]).toBe('ὀφθαλμοῖς');
    expect(texts[15]).toBe('ἡμῶν');
    const layout = layoutDiagram(fixed.diagram, fixed.words, measure);
    expect(layout.segments.filter((s) => s.kind === 'modifier' && s.clause === 2)).toHaveLength(1);
  });

  it('leaves a diagram with nothing woven exactly as it was', () => {
    const same = repairEmptied(tree, english, english);
    expect(same.diagram).toBe(tree);
    expect(same.words).toBe(english);
  });
});

describe('the rule for the class: a place drawn with no word', () => {
  const words: DiagramWords = [
    { text: 'we', chunk: 0 },
    { text: 'ἀγαπῶμεν', chunk: 1, weft: [1] } as DiagramWords[number],
    { text: '', chunk: 1 },
    { text: 'with', chunk: 2 },
    { text: '', chunk: 3 },
    { text: 'him', chunk: 3 },
  ];
  const original: DiagramWords = ['we', 'love', 'is', 'with', 'all', 'him'].map((text, chunk) => ({ text, chunk }));

  it('refuses a clause whose verb slot has no drawn word, and says where', () => {
    const bare: Diagram = { clauses: [{ clause: { subject: slot([0]), verb: slot([2]) } }] };
    expect(drawnFaults(bare, words)).toEqual([expect.objectContaining({ kind: 'bare-verb', at: 'clause 1' })]);
    expect(drawnFaults({ clauses: [{ clause: { subject: slot([0]), verb: slot([1]) } }] }, words)).toEqual([]);
  });

  it('refuses a leg with no word: a modifier, a preposition, an object and a complement', () => {
    const legs: Diagram = {
      clauses: [{ clause: { subject: slot([0], [hang(2)]), verb: slot([1], [prep(3, slot([4]))]), complement: { kind: 'direct-object', slot: slot([4]) } } }],
    };
    expect(drawnFaults(legs, words).map((f) => f.at)).toEqual([
      'clause 1 > subject > modifier 1',
      'clause 1 > verb > modifier 1 > object',
      'clause 1 > direct-object',
    ]);
  });

  it('counts an understood word as drawn', () => {
    expect(drawnFaults({ clauses: [{ clause: { subject: understood('we'), verb: slot([1]) } }] }, words)).toEqual([]);
  });

  it('repairs a verb with no woven word in its clause by drawing the verb in English', () => {
    const bare: Diagram = { clauses: [{ clause: { subject: slot([0]), verb: slot([2]) } }] };
    const fixed = repairEmptied(bare, words, original);
    expect(fixed.words[2].text).toBe('is');
    expect(drawnFaults(fixed.diagram, fixed.words)).toEqual([]);
  });

  it('repairs a leg with no word by taking it out and keeping what hung under it, and a bare object by letting the word under it stand', () => {
    const legs: Diagram = {
      clauses: [{ clause: { subject: slot([0], [{ kind: 'word', word: { i: 2 }, modifiers: [hang(5)] }]), verb: slot([1], [prep(3, slot([4], [hang(5)]))]) } }],
    };
    const fixed = repairEmptied(legs, words, original);
    expect(drawnFaults(fixed.diagram, fixed.words)).toEqual([]);
    expect(fixed.diagram.clauses[0].clause.subject.modifiers).toEqual([hang(5)]);
    expect(fixed.diagram.clauses[0].clause.verb.modifiers).toEqual([prep(3, slot([5]))]);
  });
});

describe("1 John 1:1 as the tutor drew it (tests/fixtures/diagrams/1jn-1-1-english-tutor.json, the mill's saved answer)", () => {
  const tutor = (JSON.parse(readFileSync('tests/fixtures/diagrams/1jn-1-1-english-tutor.json', 'utf8')) as { diagram: Diagram }).diagram;
  const measureText = (t: string): number => t.length * 8;

  it('is a good tree whose woven drawing has two verbs drawn bare', () => {
    expect(validateDiagram(tutor, english.length)).toEqual({ ok: true });
    expect(drawnFaults(tutor, shown).filter((f) => f.kind === 'bare-verb')).toHaveLength(2);
  });

  it('draws each relative clause as (we) | the Greek verb | (which), and nothing bare', () => {
    const fixed = repairEmptied(tutor, shown, english);
    expect(drawnFaults(fixed.diagram, fixed.words)).toEqual([]);
    const layout = layoutDiagram(fixed.diagram, fixed.words, measureText);
    for (const verb of ['ἀκηκόαμεν', 'ἑωράκαμεν', 'ἐθεασάμεθα']) {
      const label = layout.labels.find((l) => l.text === verb)!;
      expect(label.role).toBe('verb');
      const line = layout.labels.filter((l) => l.clause === label.clause && ['subject', 'verb', 'complement'].includes(l.role)).sort((a, b) => a.x - b.x);
      expect([line[0].text, line[1].text, line[line.length - 1].text]).toEqual(['(we)', verb, '(which)']);
      expect(line.slice(1, -1).every((l) => l.role === 'verb')).toBe(true);
    }
    expect(layout.labels.filter((l) => l.text === '')).toEqual([]);
  });
});
