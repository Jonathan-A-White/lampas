// src/settings/useHomeSearch.ts — what he typed in the search field of the Settings home, held above every page of Settings (mw-6ww.175.108). The sermon sources and What Lampas has counted
// are drawn in the home's place (src/SettingsScreen.tsx), so text held by the home itself was thrown away with it: the home listed its groups again when their back arrow brought him back,
// where it still lists what he searched for after a group's page. SettingsScreen calls this once and hands the pair to the home; leaving Settings lets the text go. docs/layout/settings.md 'Search'.
import { useEffect, useState } from 'react';
import { settingKeyOf } from './link';
import { isHomeRow, rowOf } from './rows';

/** The text kept in the history entry of the Settings home (keepHomeSearch), '' for none. */
const keptSearch = (): string => (window.history.state as { settingsSearch?: string } | null)?.settingsSearch ?? '';

/** Keeps the search text in the history entry he is on, before the search opens a screen outside Settings (the Library filtered to it, mw-qtu3zvz.281): Settings is drawn anew when he comes back, and its search starts with
 *  what is kept there. The text lives with its entry, so no other way into Settings finds it. */
export function keepHomeSearch(query: string): void {
  window.history.replaceState({ ...(window.history.state as object | null), settingsSearch: query }, '', window.location.href);
}

/** The search text and its setter, for the Settings screen at `address`. A link that names a row of the home (the dial) clears the search that found it, so the home shows the row marked and not the list of answers. */
export function useHomeSearch(address: string): [query: string, setQuery: (query: string) => void] {
  const [query, setQuery] = useState(keptSearch);
  // taken once: the entry holds it no longer, so a later return to it finds the field as he left it then
  useEffect(() => {
    if (keptSearch() === '') return;
    const rest = { ...(window.history.state as Record<string, unknown>) };
    delete rest.settingsSearch;
    window.history.replaceState(rest, '', window.location.href);
  }, []);
  const linked = settingKeyOf(address);
  const [linkSeen, setLinkSeen] = useState(linked);
  if (linkSeen !== linked) {
    setLinkSeen(linked);
    const linkedRow = linked ? rowOf(linked) : undefined;
    if (linkedRow && isHomeRow(linkedRow)) setQuery('');
  }
  return [query, setQuery];
}
