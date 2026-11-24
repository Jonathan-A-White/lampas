// src/nav/screen.ts — the screens of the app register themselves (mw-6ww.175.83, stage 3 of the Lampas registry): a screen is one file of src/screens/, named for the screen, which declares it for the type system and
// draws it. src/nav/route.ts gathers the files' NAMES (a glob that does not load them: nearly every file imports route.ts, and loading the screens there would load the whole app into each test) and
// src/App.tsx draws the one the address names, so a new screen edits neither. Its address is '#/<name>' unless ADDRESSES says another (the few that have one that is not).
import type { ReactElement } from 'react';
import type { Random } from '../data/quiz';
import { pathOf } from './path';

/**
 * The screens by name. A screen file adds its own with a declaration, which makes `Route` the union of them all (a typo is a type error, and a `Record<Route, …>` fails typecheck until it names the new screen):
 *
 *     declare module '../nav/screen' { interface ScreenNames { words: true } }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- every screen file fills it in
export interface ScreenNames {}

/** A screen of the app, by name (the keys of ScreenNames: one per file of src/screens/). */
export type Route = keyof ScreenNames;

/** What App hands every screen: the random source of the quizzes, which tests seed (a screen that draws no quiz ignores it). */
export interface ScreenProps {
  newRandom?: () => Random;
}

/** A screen's file as it declares itself: `export const words = defineScreen({ name: 'words', render: () => <WordsScreen /> })`. */
export interface ScreenDef {
  readonly screen: true;
  readonly name: Route;
  /** The screen drawn: its component as an element. */
  readonly render: (props: ScreenProps) => ReactElement;
}

export const defineScreen = (def: { name: Route; render: (props: ScreenProps) => ReactElement }): ScreenDef => ({ screen: true, name: def.name, render: def.render });

/** Where a screen is in the address. */
export interface ScreenAddress {
  readonly name: Route;
  /** The address without a query: '#/words'. */
  readonly path: string;
  /** The addresses below `path` ('#/lists/7') are this screen's too. */
  readonly under: boolean;
  /** The screen an address that names none opens: the Reader. Exactly one is. */
  readonly fallback: boolean;
}

/** The screens whose address is not '#/<name>', or that own the addresses below it, or that are the Reader. */
export const ADDRESSES: Readonly<Partial<Record<Route, { path?: string; under?: true; fallback?: true }>>> = {
  home: { path: '#/', fallback: true },
  essay: { path: '#/preface/robinson' },
  lessons: { path: '#/lessons/variants', under: true },
  lists: { under: true },
  memorize: { under: true },
};

/** The name a screen file has: './words.tsx' and '../screens/words.tsx' are 'words'. */
export const nameOfFile = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');

/** The table of addresses of the screens that are the files (their paths, as import.meta.glob names them). Exactly one is the fallback, and no two share an address. */
export function routeTableOf(files: readonly string[], addresses: Readonly<Record<string, { path?: string; under?: true; fallback?: true }>> = ADDRESSES): Record<Route, ScreenAddress> {
  const table: Record<string, ScreenAddress> = {};
  for (const file of [...files].sort()) {
    const name = nameOfFile(file);
    if (table[name]) throw new Error(`two screen files are named '${name}' (${file}): a screen is one file of src/screens/`);
    const a = addresses[name] ?? {};
    table[name] = { name: name as Route, path: a.path ?? `#/${name}`, under: a.under === true, fallback: a.fallback === true };
  }
  const all = Object.values(table);
  // no file at all (Playwright's loader has no glob, src/nav/screenFiles.ts): no screen is known, and routeIn opens the Reader
  if (all.length === 0) return table as Record<Route, ScreenAddress>;
  const fallbacks = all.filter((d) => d.fallback);
  if (fallbacks.length !== 1) throw new Error(`exactly one screen is the one an address with no screen opens (the Reader), not ${fallbacks.length}`);
  for (const d of all) {
    const clash = all.find((other) => other !== d && other.path === d.path);
    if (clash) throw new Error(`the screens '${d.name}' and '${clash.name}' have the one address '${d.path}'`);
  }
  return table as Record<Route, ScreenAddress>;
}

/** The screen an address opens: the one whose path it is (or is under, for a screen that owns its sub-addresses; the longest path wins), else the fallback. */
export function routeIn(table: Readonly<Record<Route, ScreenAddress>>, hash: string): Route {
  const path = pathOf(hash);
  let best: ScreenAddress | undefined;
  let fallback: ScreenAddress | undefined;
  for (const def of Object.values(table)) {
    if (def.fallback) fallback = def;
    else if ((path === def.path || (def.under && path.startsWith(`${def.path}/`))) && (!best || def.path.length > best.path.length)) best = def;
  }
  return best?.name ?? fallback?.name ?? ('home' as Route);
}

/** The address of a screen: its path ('#/' for the Reader). */
export const hashIn = (table: Readonly<Record<Route, ScreenAddress>>, route: Route): string => table[route].path;

/** The exports of each file, as import.meta.glob(..., { eager: true }) gives them. */
export type Modules = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

const isScreen = (value: unknown): value is ScreenDef => typeof value === 'object' && value !== null && (value as { screen?: unknown }).screen === true && typeof (value as { name?: unknown }).name === 'string';

/** What draws each screen, from the screen files' exports. A file declares the screen it is named for, once: another name, none, or two is a mistake and throws, naming the file. */
export function renderersOf(modules: Modules): Record<Route, ScreenDef['render']> {
  const found: Record<string, ScreenDef['render']> = {};
  for (const file of Object.keys(modules).sort()) {
    const defs = [...new Set(Object.values(modules[file]).filter(isScreen))];
    if (defs.length !== 1) throw new Error(`${file} declares ${defs.length} screens: a screen file declares one, with defineScreen`);
    if (defs[0].name !== nameOfFile(file)) throw new Error(`${file} declares the screen '${defs[0].name}': a screen file is named for its screen`);
    found[defs[0].name] = defs[0].render;
  }
  return found as Record<Route, ScreenDef['render']>;
}
