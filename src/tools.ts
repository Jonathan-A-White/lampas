// src/tools.ts — where each door of the Tools screen opens (mw-5r3p30.754). The doors are the rows TOOL_ROWS of src/settings/rows.ts (they stay rows so the Settings search finds them and the
// same dials hide them); each opens the screen it opened when it was a row of Settings, as a new Back step, so Back returns to Tools. docs/layout/settings.md 'Tools'.
import { navigate, routeOf, type Route } from './nav/route';
import { previousAddress } from './nav/lastRoute';

/** The screen each Tools row opens. */
export const TOOL_SCREENS: Readonly<Record<string, Route>> = {
  library: 'library',
  'link.lists': 'lists',
  'link.memorize': 'memorize',
  'link.paradigms': 'paradigms',
  'link.words': 'words',
  'link.review': 'review',
};

/** Opens the screen of the Tools row `key`; nothing for a key that is none. */
export function openTool(key: string): void {
  const route = TOOL_SCREENS[key];
  if (route) navigate(route);
}

/** True when the entry behind this one is the Tools screen: a tool's back button then says ‹ Tools and steps Back to it. */
export const cameFromTools = (): boolean => {
  const behind = previousAddress();
  return behind !== null && routeOf(behind) === 'tools';
};
