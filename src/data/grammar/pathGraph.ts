// src/data/grammar/pathGraph.ts — a learning path as a directed acyclic graph (mw-svw421.9): ideas, the ideas each one needs, the frontier and the depth, all
// taking the path AS DATA, so the Lampas ladder (ladder.ts) is one path among any others and nothing here knows a Lampas id. An idea is {id, needs}; a path is
// the list of ideas in teaching order. Pure: no store, no screen.

/** What the graph needs of an idea: its id and the ids it rests on. */
export interface PathIdea {
  id: string;
  needs: readonly string[];
}

/** A path: its ideas in teaching order, by id. */
export interface Path<T extends PathIdea = PathIdea> {
  ideas: readonly T[];
  byId: ReadonlyMap<string, T>;
}

/** What is wrong with a list of ideas as a path: an id listed twice, a need that names no idea, a need on itself, or a cycle (the cycle is named in full). */
export function pathProblems(ideas: readonly PathIdea[]): string[] {
  const problems: string[] = [];
  const byId = new Map<string, PathIdea>();
  for (const idea of ideas) {
    if (byId.has(idea.id)) problems.push(`${idea.id} is listed twice`);
    else byId.set(idea.id, idea);
  }
  for (const idea of ideas) {
    for (const need of idea.needs) if (!byId.has(need)) problems.push(`${idea.id} needs ${need}, which is not an idea of the path`);
  }
  // depth-first colouring: a need that is still 'open' on the walk is a way back to an idea above it, a cycle
  const state = new Map<string, 'open' | 'done'>();
  const walk = (id: string, trail: string[]): void => {
    state.set(id, 'open');
    for (const need of byId.get(id)?.needs ?? []) {
      if (!byId.has(need)) continue;
      const here = [...trail, id];
      if (state.get(need) === 'open') problems.push(`cycle: ${[...here.slice(here.indexOf(need)), need].join(' needs ')}`);
      else if (!state.has(need)) walk(need, here);
    }
    state.set(id, 'done');
  };
  for (const idea of byId.values()) if (!state.has(idea.id)) walk(idea.id, []);
  return problems;
}

/** The path of these ideas. Throws, naming every problem, when they are not a directed acyclic graph. */
export function makePath<T extends PathIdea>(ideas: readonly T[]): Path<T> {
  const problems = pathProblems(ideas);
  if (problems.length > 0) throw new Error(`Not a path: ${problems.join('; ')}`);
  return { ideas, byId: new Map(ideas.map((i) => [i.id, i])) };
}

/** The idea with this id. Throws on one the path does not have. */
export function ideaIn<T extends PathIdea>(path: Path<T>, id: string): T {
  const idea = path.byId.get(id);
  if (!idea) throw new Error(`Unknown idea: ${JSON.stringify(id)}`);
  return idea;
}

/** The ideas this one rests on directly, in the path's order. */
export const needsIn = <T extends PathIdea>(path: Path<T>, id: string): T[] => path.ideas.filter((i) => ideaIn(path, id).needs.includes(i.id));

/** Every idea this one rests on, however far down, in the path's order. */
export function belowIn<T extends PathIdea>(path: Path<T>, id: string): T[] {
  const seen = new Set<string>();
  const walk = (at: string): void => {
    for (const need of ideaIn(path, at).needs) {
      if (!seen.has(need)) {
        seen.add(need);
        walk(need);
      }
    }
  };
  walk(id);
  return path.ideas.filter((i) => seen.has(i.id));
}

/** How deep an idea sits: 0 for one that needs nothing, else one more than the deepest idea it needs. */
export function depthIn<T extends PathIdea>(path: Path<T>, id: string): number {
  const memo = new Map<string, number>();
  const depth = (at: string): number => {
    const known = memo.get(at);
    if (known !== undefined) return known;
    const needs = ideaIn(path, at).needs;
    const d = needs.length === 0 ? 0 : 1 + Math.max(...needs.map(depth));
    memo.set(at, d);
    return d;
  };
  return depth(id);
}

/** The frontier: the ideas not yet solid whose every need is solid, in the path's order. These, and only these, are ready to learn now. */
export const frontierIn = <T extends PathIdea>(path: Path<T>, solid: ReadonlySet<string>): T[] =>
  path.ideas.filter((i) => !solid.has(i.id) && i.needs.every((n) => solid.has(n)));
