// src/data/grammar/pathGraph.ts — a learning path as a directed acyclic graph (mw-svw421.9): ideas, the ideas each one needs, the frontier and the depth, all
// taking the path AS DATA, so the Lampas ladder (ladder.ts) is one path among any others and nothing here knows a Lampas id. An idea is {id, needs}; a path is
// the list of ideas in teaching order. Pure: no store, no screen.
// The graph itself is learn-kit's (mw-79en7t.5): this file names it in Lampas's words (a path, an idea) and keeps Lampas's wording of its errors. Only the picture,
// layoutPath below, is Lampas's: the kit gives the rows (layers) and the drawing stays in the app.
import { GraphError, below, depthOf, frontierOf, graphProblems, layers, needsOf, nodeOf, validate, type Graph } from 'learn-kit/graph';

/** What the graph needs of an idea: its id and the ids it rests on. */
export interface PathIdea {
  id: string;
  needs: readonly string[];
}

/** A path: its ideas in teaching order, by id. It is a learn-kit graph (`nodes` are the `ideas`). */
export type Path<T extends PathIdea = PathIdea> = Graph<T> & { ideas: readonly T[] };

/** The kit's problems in the words of a path. */
const inPathWords = (problems: readonly string[]): string[] => problems.map((p) => p.replace(', which is not a node of the graph', ', which is not an idea of the path'));

/** What is wrong with a list of ideas as a path: an id listed twice, a need that names no idea, a need on itself, or a cycle (the cycle is named in full). */
export const pathProblems = (ideas: readonly PathIdea[]): string[] => inPathWords(graphProblems(ideas));

/** The path of these ideas. Throws, naming every problem, when they are not a directed acyclic graph. */
export function makePath<T extends PathIdea>(ideas: readonly T[]): Path<T> {
  try {
    const graph = validate(ideas);
    return { ...graph, ideas: graph.nodes };
  } catch (error) {
    if (error instanceof GraphError) throw new Error(`Not a path: ${inPathWords(error.problems).join('; ')}`);
    throw error;
  }
}

/** The idea with this id. Throws on one the path does not have. */
export function ideaIn<T extends PathIdea>(path: Path<T>, id: string): T {
  if (!path.byId.has(id)) throw new Error(`Unknown grammar idea: ${JSON.stringify(id)}`);
  return nodeOf(path, id);
}

/** The ideas this one rests on directly, in the path's order. */
export const needsIn = <T extends PathIdea>(path: Path<T>, id: string): T[] => needsOf(path, ideaIn(path, id).id);

/** Every idea this one rests on, however far down, in the path's order. */
export const belowIn = <T extends PathIdea>(path: Path<T>, id: string): T[] => below(path, ideaIn(path, id).id);

/** How deep an idea sits: 0 for one that needs nothing, else one more than the deepest idea it needs. */
export const depthIn = <T extends PathIdea>(path: Path<T>, id: string): number => depthOf(path, ideaIn(path, id).id);

/** The frontier: the ideas not yet solid whose every need is solid, in the path's order. These, and only these, are ready to learn now. */
export const frontierIn = <T extends PathIdea>(path: Path<T>, solid: ReadonlySet<string>): T[] => frontierOf(path, solid);

// ---- The path drawn (mw-foy5mb.5): where each idea sits on a picture of the graph, taking the path as data ----

/** A node's box and the gaps around it, in the picture's own units. */
export const NODE_W = 132;
export const NODE_H = 48;
export const COLUMN_GAP = 16;
export const ROW_GAP = 56;

export interface LaidOutNode {
  id: string;
  /** the row it sits in: depthOf */
  depth: number;
  x: number;
  y: number;
  width: number;
}

/** A need drawn: `from` is the idea that is rested on (the row above), `to` the idea that rests on it. */
export interface LaidOutEdge {
  from: string;
  to: string;
}

export interface PathLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

/**
 * The path laid out by depth: one row per depth (the ideas that need nothing at the top, an idea below every idea it needs), each row centred, the ideas
 * of a row ordered by where the ideas they rest on and the ideas resting on them sit (a few sweeps of the barycentre, to keep the edges from crossing
 * more than they must). Pure and deterministic: the same path is the same picture.
 */
export function layoutPath<T extends PathIdea>(path: Path<T>): PathLayout {
  const rows = layers(path);
  const dependents = new Map<string, string[]>(path.ideas.map((i) => [i.id, []]));
  for (const idea of path.ideas) for (const need of idea.needs) dependents.get(need)!.push(idea.id);

  const step = NODE_W + COLUMN_GAP;
  const widest = Math.max(0, ...rows.map((r) => r.length)) * step - COLUMN_GAP;
  const centreOf = new Map<string, number>();
  const place = (row: string[]): void => row.forEach((id, i) => centreOf.set(id, (widest - (row.length * step - COLUMN_GAP)) / 2 + i * step + NODE_W / 2));
  rows.forEach(place);

  const sortBy = (row: string[], neighbours: (id: string) => readonly string[]): void => {
    const mean = (id: string): number => {
      const near = neighbours(id);
      return near.length === 0 ? centreOf.get(id)! : near.reduce((sum, n) => sum + centreOf.get(n)!, 0) / near.length;
    };
    const keyed = row.map((id, i) => ({ id, i, at: mean(id) }));
    keyed.sort((a, b) => a.at - b.at || a.i - b.i);
    keyed.forEach((k, i) => (row[i] = k.id));
    place(row);
  };
  for (let sweep = 0; sweep < 4; sweep += 1) {
    for (let d = 1; d < rows.length; d += 1) sortBy(rows[d], (id) => path.byId.get(id)!.needs);
    for (let d = rows.length - 2; d >= 0; d -= 1) sortBy(rows[d], (id) => dependents.get(id)!);
  }

  const nodes: LaidOutNode[] = [];
  const order = new Map(path.ideas.map((i, n) => [i.id, n]));
  rows.forEach((row, depth) => {
    for (const id of row) nodes.push({ id, depth, x: centreOf.get(id)! - NODE_W / 2, y: depth * (NODE_H + ROW_GAP), width: NODE_W });
  });
  nodes.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const edges = path.ideas.flatMap((idea) => idea.needs.map((need) => ({ from: need, to: idea.id })));
  return { nodes, edges, width: widest, height: rows.length * (NODE_H + ROW_GAP) - ROW_GAP };
}
