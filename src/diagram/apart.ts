// src/diagram/apart.ts — clauses written apart (mw-5r3p30.979). A deep sentence (Ephesians 1:3-14 is one, a tree 96 levels of JSON deep) written whole as nested JSON loses the
// tutor's answer about one run in three: the closers cannot be counted, and a tree that is not JSON is refused. So the answer may keep its subordinate clauses out of the nesting:
// a `clause` modifier may carry `apart: n` instead of `clause`, n the place of the clause in the answer's `apart` list, which holds the clauses themselves (they may hang `apart` clauses in turn).
// expandApart puts each back where it hangs, once, giving the Diagram everything else (validate, keep, draw) already takes; what is wrong with the placing is a fault, like a word twice.
import type { Diagram } from './types';
import type { Fault } from './validate';

/** What the tutor answers: a Diagram, whose clause modifiers may name a clause held in `apart` rather than carry it. */
export interface WireDiagram {
  clauses: unknown[];
  apart?: unknown[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export interface Expanded {
  diagram: Diagram;
  /** what is wrong with how the `apart` clauses were placed; empty when all is well */
  faults: Fault[];
}

/** The answer with every `apart` clause put in the place that names it; a bad place (no such clause, one placed twice, a clause inside itself, a clause held and never placed) is a fault and leaves that modifier out. */
export function expandApart(answer: WireDiagram): Expanded {
  const faults: Fault[] = [];
  const held = answer.apart ?? [];
  const placed = new Set<number>();

  const fault = (at: string, message: string): void => {
    faults.push({ kind: 'bad-apart', at, message: `${message}, at ${at}` });
  };

  const walk = (node: unknown, at: string, inside: readonly number[]): unknown => {
    if (Array.isArray(node)) return node.flatMap((item, k) => {
      const out = walk(item, `${at} > ${k + 1}`, inside);
      return out === undefined ? [] : [out];
    });
    if (!isObject(node)) return node;
    if (node.kind === 'clause') {
      const { apart, ...rest } = node;
      if (apart === undefined && node.clause !== undefined) return { ...rest, clause: walk(node.clause, `${at} > clause`, inside) };
      if (apart !== undefined && node.clause !== undefined) {
        fault(at, 'a clause modifier has both a clause and an apart place');
        return undefined;
      }
      if (typeof apart !== 'number' || !Number.isInteger(apart) || apart < 0 || apart >= held.length) {
        fault(at, apart === undefined ? 'a clause modifier has neither a clause nor an apart place' : `apart ${String(apart)} is not a place in the apart list (0 to ${held.length - 1})`);
        return undefined;
      }
      if (inside.includes(apart)) {
        fault(at, `apart ${apart} is placed inside itself`);
        return undefined;
      }
      if (placed.has(apart)) {
        fault(at, `apart ${apart} is placed twice`);
        return undefined;
      }
      placed.add(apart);
      return { ...rest, clause: walk(held[apart], `apart ${apart}`, [...inside, apart]) };
    }
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value, `${at}`, inside)]));
  };

  const clauses = walk(answer.clauses, 'clause', []) as Diagram['clauses'];
  held.forEach((_, n) => {
    if (!placed.has(n)) fault(`apart ${n}`, `apart ${n} is never placed in a clause modifier`);
  });
  return { diagram: { clauses }, faults };
}
