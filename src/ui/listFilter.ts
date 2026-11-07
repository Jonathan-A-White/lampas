// src/ui/listFilter.ts — what SearchableList shows: the search filter and the ticked-first order, pure.

/** `also` is more text the search looks in and the list does not show (a book's author and series). */
export type ListItem = { id: string; name: string; also?: string };

/** The noun for a count: `noun` for one, its plural otherwise ('commentary' -> 'commentaries', 'index' -> 'indexes', 'lexicon' -> 'lexicons'). */
export function pluralOf(noun: string, count: number): string {
  if (count === 1) return noun;
  if (/[^aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(noun)) return `${noun}es`;
  return `${noun}s`;
}

/** Ticked items first, then the rest, each group in the list's own order. */
export function tickedFirst(items: readonly ListItem[], first: ReadonlySet<string>): ListItem[] {
  return [...items.filter((i) => first.has(i.id)), ...items.filter((i) => !first.has(i.id))];
}

/** Items in the order of their rank, the lowest first, each rank in the list's own order; an item with no rank goes last. */
export function ranked(items: readonly ListItem[], rank: ReadonlyMap<string, number>): ListItem[] {
  const of = (i: ListItem) => rank.get(i.id) ?? Number.MAX_SAFE_INTEGER;
  return [...items].sort((a, b) => of(a) - of(b));
}

/** The items whose name (or `also`) holds what he typed (ignoring case and spaces at the ends); all of them for an empty search. Nothing held, it falls back to the
 *  names one slip away from it (`slipsAway`), closest first: 'mwt' finds Matthew. */
export function matching(items: readonly ListItem[], query: string): ListItem[] {
  const found = matchingExactly(items, query);
  return found.length > 0 ? found : slipsAway(items, query).map((s) => s.item);
}

/** `matching` with no fallback, for the one caller that must not guess (a title the tutor filled in picks a book only when it is held, never when it is near). */
export function matchingExactly(items: readonly ListItem[], query: string): ListItem[] {
  const q = query.trim().toLocaleLowerCase();
  return q === '' ? [...items] : items.filter((i) => i.name.toLocaleLowerCase().includes(q) || (i.also?.toLocaleLowerCase().includes(q) ?? false));
}

/** A name as the filter compares it: lower case, no spaces or dots ('1 John' -> '1john'). */
const squashed = (name: string): string => name.toLocaleLowerCase().replace(/[\s.]/g, '');

/** The fewest letters a slip is forgiven in: with fewer, one wrong letter fits most of a list. */
const MIN_FORGIVEN = 3;
/** Typed text of this many letters or more is forgiven two slips, shorter one. */
const TWO_SLIPS_FROM = 6;
/** A slip costs this much; the 1 that the less common slips add only orders the names that are the same number of slips away. */
const SLIP = 1000;

/** The phone keyboard's rows, each shifted a little right of the one above, as the keys sit. */
const KEY_ROWS: readonly (readonly [string, number])[] = [['qwertyuiop', 0], ['asdfghjkl', 0.25], ['zxcvbnm', 0.75]];
const KEY_AT = new Map(KEY_ROWS.flatMap(([keys, shift], row) => [...keys].map((k, i) => [k, { row, x: i + shift }] as const)));

/** Whether two letters are neighbouring keys ('w' and 'a'). */
function neighbours(a: string, b: string): boolean {
  const ka = KEY_AT.get(a);
  const kb = KEY_AT.get(b);
  return !!ka && !!kb && a !== b && Math.abs(ka.row - kb.row) <= 1 && Math.abs(ka.x - kb.x) < (ka.row === kb.row ? 1.5 : 1);
}

/** How far `typed` is from the START of `name`: the least cost of turning it into some start of the name by one-letter slips (a letter wrong, missing, extra, or
 *  two swapped). Each slip costs SLIP; a letter wrong on a neighbouring key and two swapped cost a little less than any other slip, so they come first. 0 when the name starts with it. */
function startCost(typed: string, name: string): number {
  const m = typed.length;
  const n = name.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j * (SLIP + 1) : j === 0 ? i * (SLIP + 1) : Infinity)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const same = typed[i - 1] === name[j - 1];
      let best = d[i - 1][j - 1] + (same ? 0 : neighbours(typed[i - 1], name[j - 1]) ? SLIP : SLIP + 1);
      best = Math.min(best, d[i - 1][j] + SLIP + 1, d[i][j - 1] + SLIP + 1);
      if (i > 1 && j > 1 && typed[i - 1] === name[j - 2] && typed[i - 2] === name[j - 1]) best = Math.min(best, d[i - 2][j - 2] + SLIP);
      d[i][j] = best;
    }
  }
  // the name may go on past what was typed for free
  return Math.min(...d[m]);
}

/** The items whose name starts one slip from what he typed (two for six letters or more), closest first and then in the list's own order; none for less than three
 *  letters. The fallback of `matching` and `matchingInOrder`, when no name holds what he typed. `cost` lets a caller tell the closest from the rest. */
export function slipsAway(items: readonly ListItem[], query: string): { item: ListItem; cost: number }[] {
  const q = squashed(query);
  if (q.length < MIN_FORGIVEN) return [];
  const budget = (q.length >= TWO_SLIPS_FROM ? 2 : 1) * SLIP + SLIP - 1;
  return items
    .map((item, i) => ({ item, i, cost: startCost(q, squashed(item.name)) }))
    .filter((r) => r.cost <= budget)
    .sort((a, b) => a.cost - b.cost || a.i - b.i)
    .map(({ item, cost }) => ({ item, cost }));
}

/** Whether `letters` occur in `name` in order, not necessarily side by side ('phlm' in 'philemon'). */
function inOrder(letters: string, name: string): boolean {
  let at = 0;
  for (const letter of name) if (letter === letters[at] && ++at === letters.length) return true;
  return letters === '';
}

/** The items whose name holds what he typed, or holds its letters in order ('phlm' finds Philemon, '1jn' finds 1 John), ignoring case, spaces and dots. The names that
 *  start with it come first, then those that hold it, then the rest, each group in the list's own order; all of them for an empty search. Only when none does, the
 *  names one slip away from it, closest first (`slipsAway`: 'mwt' finds Matthew). */
export function matchingInOrder(items: readonly ListItem[], query: string): ListItem[] {
  const found = matchingInOrderExactly(items, query);
  return found.length > 0 ? found : slipsAway(items, query).map((s) => s.item);
}

/** `matchingInOrder` with no fallback. */
export function matchingInOrderExactly(items: readonly ListItem[], query: string): ListItem[] {
  const q = squashed(query);
  if (q === '') return [...items];
  const rank = (name: string): number => (name.startsWith(q) ? 0 : name.includes(q) ? 1 : inOrder(q, name) ? 2 : 3);
  const ranked = items.map((item) => ({ item, rank: rank(squashed(item.name)) })).filter((r) => r.rank < 3);
  return [0, 1, 2].flatMap((n) => ranked.filter((r) => r.rank === n).map((r) => r.item));
}
