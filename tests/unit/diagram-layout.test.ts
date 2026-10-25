// tests/unit/diagram-layout.test.ts — layoutDiagram (src/diagram/layout.ts, mw-souyao.1): a diagram tree to positioned lines and words in the Reed-Kellogg conventions.
// The measure is a fixed 10 px a character, so jsdom needs no layout; the two fixtures are the hand-written diagrams of Colossians 3:1.
import { describe, expect, it } from 'vitest';
import { BAR_SPACE, LABEL_H, MARGIN, layoutDiagram, type Layout, type LayoutLabel, type LayoutSegment } from '../../src/diagram/layout';
import type { Clause, Diagram, DiagramWords } from '../../src/diagram/types';
import { dogsBark, loadFixture, slotOf, wordsOf } from '../support/diagram-fixtures';

const measure = (text: string): number => text.length * 10;
const fixtures = (['english', 'greek'] as const).map((mode) => loadFixture(mode));

const ofKind = (layout: Layout, ...kinds: LayoutSegment['kind'][]): LayoutSegment[] => layout.segments.filter((s) => kinds.includes(s.kind));
const label = (layout: Layout, id: number | undefined): LayoutLabel => {
  const found = layout.labels.find((l) => l.id === id);
  if (!found) throw new Error(`no label ${id}`);
  return found;
};
const baseOf = (layout: Layout, clause: number): LayoutSegment => ofKind(layout, 'base').find((s) => s.clause === clause)!;
const labelsOf = (layout: Layout, clause: number, role: LayoutLabel['role']): LayoutLabel[] => layout.labels.filter((l) => l.clause === clause && l.role === role);
const countClauses = (diagram: Diagram): number => {
  let n = 0;
  const clause = (c: Clause): void => {
    n += 1;
    slot(c.subject);
    slot(c.verb);
    if (c.complement) slot(c.complement.slot);
  };
  const slot = (s: Clause['subject']): void => mods(s.modifiers);
  const mods = (list: Clause['subject']['modifiers']): void => {
    for (const m of list) {
      if (m.kind === 'word') mods(m.modifiers);
      else if (m.kind === 'prepositional') slot(m.object);
      else clause(m.clause);
    }
  };
  diagram.clauses.forEach((e) => clause(e.clause));
  return n;
};
/** The slanted modifiers a tree holds: word and prepositional (the clause modifiers hang on a dotted join instead). */
const countSlanted = (diagram: Diagram): number => {
  let n = 0;
  const slot = (s: Clause['subject']): void => mods(s.modifiers);
  const clause = (c: Clause): void => {
    slot(c.subject);
    slot(c.verb);
    if (c.complement) {
      if (c.complement.kind === 'indirect-object') n += 1;
      slot(c.complement.slot);
    }
  };
  const mods = (list: Clause['subject']['modifiers']): void => {
    for (const m of list) {
      if (m.kind === 'clause') clause(m.clause);
      else {
        n += 1;
        if (m.kind === 'word') mods(m.modifiers);
        else slot(m.object);
      }
    }
  };
  diagram.clauses.forEach((e) => clause(e.clause));
  return n;
};

describe.each(fixtures)('the $mode diagram of Colossians 3:1', ({ diagram, words }) => {
  const layout = layoutDiagram(diagram, words, measure);

  it('has one base line for each clause', () => {
    expect(ofKind(layout, 'base')).toHaveLength(countClauses(diagram));
    expect(countClauses(diagram)).toBe(3);
  });

  it('has one slanted line for each modifier', () => {
    expect(ofKind(layout, 'modifier', 'prep-slant', 'indirect-slant')).toHaveLength(countSlanted(diagram));
  });

  it('puts every word on a label, once, and the implied words in parentheses with no index', () => {
    const real = layout.labels.filter((l) => l.index !== undefined).map((l) => l.index);
    expect([...real].sort((a, b) => a! - b!)).toEqual(words.map((_, i) => i));
    for (const l of layout.labels.filter((x) => x.index !== undefined)) expect(l.text).toBe(words[l.index!].text);
    const implied = layout.labels.filter((l) => l.implied);
    expect(implied.length).toBeGreaterThan(0);
    for (const l of implied) {
      expect(l.text).toMatch(/^\(.+\)$/);
      expect(l.index).toBeUndefined();
    }
  });

  it('sits the subject, the verb and the complement of each clause on its base line, in that order, with the bars between', () => {
    for (const base of ofKind(layout, 'base')) {
      const id = base.clause!;
      const subject = labelsOf(layout, id, 'subject');
      const verb = labelsOf(layout, id, 'verb');
      const complement = labelsOf(layout, id, 'complement');
      expect(subject.length).toBeGreaterThan(0);
      expect(verb.length).toBeGreaterThan(0);
      for (const l of [...subject, ...verb, ...complement]) {
        expect(l.y).toBe(base.y1);
        expect(l.x).toBeGreaterThanOrEqual(base.x1);
        expect(l.x + l.width).toBeLessThanOrEqual(base.x2);
      }
      const right = (ls: LayoutLabel[]) => Math.max(...ls.map((l) => l.x + l.width));
      const left = (ls: LayoutLabel[]) => Math.min(...ls.map((l) => l.x));
      expect(right(subject)).toBeLessThan(left(verb));
      const full = ofKind(layout, 'bar-full').filter((s) => s.clause === id);
      expect(full).toHaveLength(1);
      expect(full[0].x1).toBe(full[0].x2);
      expect(full[0].x1).toBeGreaterThan(right(subject));
      expect(full[0].x1).toBeLessThan(left(verb));
      // the full bar crosses the base line
      expect(full[0].y1).toBeLessThan(base.y1);
      expect(full[0].y2).toBeGreaterThan(base.y1);
      if (complement.length > 0) {
        expect(right(verb)).toBeLessThan(left(complement));
        const bar = ofKind(layout, 'bar-half', 'bar-predicate').filter((s) => s.clause === id);
        expect(bar).toHaveLength(1);
        expect(bar[0].x2).toBeGreaterThan(right(verb));
        expect(bar[0].x2).toBeLessThan(left(complement));
      }
    }
  });

  it('starts each modifier line on the line under the word it modifies and slopes it down and to the right', () => {
    const slants = ofKind(layout, 'modifier', 'prep-slant', 'indirect-slant');
    expect(slants.length).toBeGreaterThan(0);
    for (const s of slants) {
      const head = label(layout, s.attachesTo);
      expect(s.y1).toBe(head.y);
      expect(s.x1).toBeGreaterThanOrEqual(head.x);
      expect(s.x1).toBeLessThanOrEqual(head.x + head.width);
      expect(s.x2).toBeGreaterThan(s.x1);
      expect(s.y2).toBeGreaterThan(s.y1);
    }
  });

  it('runs a prepositional phrase\'s object line level from the foot of its preposition\'s slant', () => {
    const slants = ofKind(layout, 'prep-slant');
    expect(slants.length).toBeGreaterThan(0);
    for (const s of slants) {
      const object = ofKind(layout, 'object-line').find((o) => o.x1 === s.x2 && o.y1 === s.y2);
      expect(object).toBeDefined();
      expect(object!.y2).toBe(object!.y1);
      expect(object!.x2).toBeGreaterThan(object!.x1);
      const preposition = layout.labels.find((l) => l.role === 'preposition' && l.x > s.x2 && l.y < s.y2 && l.y > s.y1);
      expect(preposition).toBeDefined();
    }
  });

  it('hangs a subordinate clause on a base line below, joined by a dotted line from the word it hangs on to its verb, with the connector beside it', () => {
    const joins = ofKind(layout, 'join');
    expect(joins).toHaveLength(2);
    for (const j of joins) {
      expect(j.dotted).toBe(true);
      const head = label(layout, j.attachesTo);
      expect(j.y1).toBe(head.y);
      expect(j.x1).toBeGreaterThanOrEqual(head.x);
      expect(j.x1).toBeLessThanOrEqual(head.x + head.width);
      const base = baseOf(layout, j.clause!);
      expect(base.parent).not.toBeNull();
      expect(base.y1).toBeGreaterThan(head.y);
      expect(j.y2).toBeGreaterThan(j.y1);
      expect(j.y2).toBeLessThan(base.y1);
      const verb = labelsOf(layout, j.clause!, 'verb').at(-1)!;
      expect(verb.x).toBeLessThanOrEqual(j.x2);
      expect(j.x2).toBeLessThanOrEqual(verb.x + verb.width);
      const connector = labelsOf(layout, j.clause!, 'connector')[0];
      expect(connector).toBeDefined();
      expect(connector.y).toBeGreaterThan(j.y1);
      expect(connector.y).toBeLessThan(base.y1);
      // beside the dotted line, at the row the connector stands on
      const lineAt = j.x1 + ((j.x2 - j.x1) * (connector.y - j.y1)) / (j.y2 - j.y1);
      expect(connector.x - lineAt).toBeGreaterThan(0);
      expect(connector.x - lineAt).toBeLessThan(20);
    }
  });

  it('keeps every word apart from every other and inside the picture, never scaled down', () => {
    for (const l of layout.labels) {
      expect(l.width).toBe(measure(l.text));
      expect(l.x).toBeGreaterThanOrEqual(MARGIN);
      expect(l.x + l.width).toBeLessThanOrEqual(layout.width - MARGIN);
      expect(l.y - LABEL_H).toBeGreaterThanOrEqual(MARGIN);
      expect(l.y).toBeLessThanOrEqual(layout.height);
    }
    for (const [a, b] of layout.labels.flatMap((a, i) => layout.labels.slice(i + 1).map((b) => [a, b] as const))) {
      const across = a.x < b.x + b.width && b.x < a.x + a.width;
      const down = a.y - LABEL_H < b.y && b.y - LABEL_H < a.y;
      expect(across && down, `${a.text} and ${b.text} overlap`).toBe(false);
    }
  });

  it('is pure: the same tree, words and measure give the same picture', () => {
    expect(layoutDiagram(diagram, words, measure)).toEqual(layout);
  });

  it('is as wide as a double measure makes it: no scale squeezes it', () => {
    const wide = layoutDiagram(diagram, words, (t) => measure(t) * 2);
    const labelsOf = (l: Layout) => l.labels.reduce((sum, x) => sum + x.width, 0);
    expect(labelsOf(wide)).toBe(2 * labelsOf(layout));
    expect(wide.width).toBeGreaterThan(layout.width);
  });
});

describe('the Reed-Kellogg marks', () => {
  const dogs = wordsOf('Dogs', 'bark');

  it('draws a width that is the labels and the gaps and nothing else', () => {
    const layout = layoutDiagram({ clauses: [{ clause: dogsBark }] }, dogs, measure);
    expect(layout.width).toBe(MARGIN + measure('Dogs') + BAR_SPACE + measure('bark') + MARGIN);
    expect(layout.labels.map((l) => l.x)).toEqual([MARGIN, MARGIN + measure('Dogs') + BAR_SPACE]);
  });

  it('puts a direct object after a half bar, which stands on the line and does not cross it', () => {
    const clause: Clause = { subject: slotOf(0), verb: slotOf(1), complement: { kind: 'direct-object', slot: slotOf(2) } };
    const layout = layoutDiagram({ clauses: [{ clause }] }, wordsOf('Dogs', 'chase', 'cats'), measure);
    const [half] = ofKind(layout, 'bar-half');
    const base = ofKind(layout, 'base')[0];
    expect(half.x1).toBe(half.x2);
    expect(half.y1).toBeLessThan(base.y1);
    expect(half.y2).toBe(base.y1);
    expect(ofKind(layout, 'bar-predicate')).toHaveLength(0);
  });

  it.each(['predicate-nominative', 'predicate-adjective'] as const)('puts a %s after a bar slanted back toward the verb', (kind) => {
    const clause: Clause = { subject: slotOf(0), verb: slotOf(1), complement: { kind, slot: slotOf(2) } };
    const layout = layoutDiagram({ clauses: [{ clause }] }, wordsOf('Dogs', 'are', 'loyal'), measure);
    const [slash] = ofKind(layout, 'bar-predicate');
    const base = ofKind(layout, 'base')[0];
    // the top is to the left of the foot, which is on the base line
    expect(slash.y1).toBeLessThan(slash.y2);
    expect(slash.x1).toBeLessThan(slash.x2);
    expect(slash.y2).toBe(base.y1);
    expect(ofKind(layout, 'bar-half')).toHaveLength(0);
  });

  it('hangs an indirect object under the verb on a slanted line with no bar and no preposition', () => {
    const clause: Clause = { subject: slotOf(0), verb: slotOf(1), complement: { kind: 'indirect-object', slot: slotOf(2) } };
    const layout = layoutDiagram({ clauses: [{ clause }] }, wordsOf('Dogs', 'give', 'bones'), measure);
    const [slant] = ofKind(layout, 'indirect-slant');
    const verb = labelsOf(layout, 0, 'verb')[0];
    expect(slant.attachesTo).toBe(verb.id);
    expect(slant.y1).toBe(verb.y);
    const [indirect] = labelsOf(layout, 0, 'indirect');
    expect(indirect.y).toBeGreaterThan(verb.y);
    expect(indirect.x).toBeGreaterThan(slant.x2 - 1);
    expect(ofKind(layout, 'bar-half', 'bar-predicate')).toHaveLength(0);
    expect(labelsOf(layout, 0, 'complement')).toHaveLength(0);
  });

  it('stacks two coordinate clauses, the second below the first, with a dotted step line carrying the conjunction', () => {
    const second: Clause = { subject: slotOf(3), verb: slotOf(4) };
    const layout = layoutDiagram({ clauses: [{ clause: dogsBark }, { clause: second, joinedBy: { i: 2 } }] }, wordsOf('Dogs', 'bark', 'and', 'cats', 'meow'), measure);
    const bases = ofKind(layout, 'base');
    expect(bases).toHaveLength(2);
    expect(bases[1].y1).toBeGreaterThan(bases[0].y1);
    expect(bases[0].parent).toBeNull();
    expect(bases[1].parent).toBeNull();
    const steps = ofKind(layout, 'step');
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) expect(s.dotted).toBe(true);
    const ys = steps.flatMap((s) => [s.y1, s.y2]);
    expect(Math.min(...ys)).toBe(bases[0].y1);
    expect(Math.max(...ys)).toBe(bases[1].y1);
    const [and] = layout.labels.filter((l) => l.role === 'conjunction');
    expect(and.text).toBe('and');
    expect(and.index).toBe(2);
    expect(and.y).toBeGreaterThan(bases[0].y1);
    expect(and.y).toBeLessThan(bases[1].y1);
  });

  it('draws an implied conjunction in parentheses', () => {
    const layout = layoutDiagram({ clauses: [{ clause: dogsBark }, { clause: { subject: slotOf(2), verb: slotOf(3) }, joinedBy: { implied: 'and' } }] }, wordsOf('Dogs', 'bark', 'cats', 'meow'), measure);
    const [and] = layout.labels.filter((l) => l.role === 'conjunction');
    expect(and.text).toBe('(and)');
    expect(and.implied).toBe(true);
  });

  it('hangs several modifiers of one word one below another without a line crossing a word', () => {
    const clause: Clause = {
      subject: { words: [{ i: 3 }], modifiers: [{ kind: 'word', word: { i: 0 }, modifiers: [] }, { kind: 'word', word: { i: 1 }, modifiers: [] }, { kind: 'word', word: { i: 2 }, modifiers: [] }] },
      verb: slotOf(4),
    };
    const layout = layoutDiagram({ clauses: [{ clause }] }, wordsOf('the', 'big', 'red', 'dogs', 'bark'), measure);
    const slants = ofKind(layout, 'modifier');
    expect(slants).toHaveLength(3);
    expect(new Set(slants.map((s) => s.y2)).size).toBe(3);
    expect(new Set(slants.map((s) => s.x1)).size).toBe(3);
    const modifiers = layout.labels.filter((l) => l.role === 'modifier');
    for (const m of modifiers) {
      const foot = ofKind(layout, 'foot').find((f) => f.y1 === m.y);
      expect(foot).toBeDefined();
      expect(foot!.x1).toBeLessThanOrEqual(m.x);
      expect(foot!.x2).toBeGreaterThanOrEqual(m.x + m.width);
    }
  });

  it('puts the second slot of a clause clear of what hangs under the first', () => {
    // a long modifier under the subject would run beneath the verb: the verb moves right of it
    const clause: Clause = {
      subject: { words: [{ i: 1 }], modifiers: [{ kind: 'word', word: { i: 0 }, modifiers: [] }] },
      verb: slotOf(2),
    };
    const layout = layoutDiagram({ clauses: [{ clause }] }, wordsOf('extraordinarily', 'Dogs', 'bark'), measure);
    const modifier = layout.labels.find((l) => l.role === 'modifier')!;
    const verb = layout.labels.find((l) => l.role === 'verb')!;
    expect(verb.x).toBeGreaterThan(modifier.x + modifier.width);
  });

  it('gives a word with no real words in the diagram a label whose text is what the tree names', () => {
    const words: DiagramWords = wordsOf('bark');
    const layout = layoutDiagram({ clauses: [{ clause: { subject: { words: [{ implied: 'dogs' }], modifiers: [] }, verb: slotOf(0) } }] }, words, measure);
    expect(layout.labels.map((l) => l.text)).toEqual(['(dogs)', 'bark']);
  });
});
