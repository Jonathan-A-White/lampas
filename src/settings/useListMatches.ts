// src/settings/useListMatches.ts — how many members of each long list the Settings search matches (mw-qtu3zvz.281): the sermon sources and the books of his library. The search answers in layers: the settings that
// match first, then each list as ONE row saying how many of its members match, which opens the list filtered to the search (SettingsHome.tsx FoundLists). The sermon sources are counted by the filter the page of
// Sermon sources itself uses (sourceList.ts sourcesMatching) and the books by the Library's (librarySearch.ts), so a row's number is the number of rows its page then shows.
import { useLiveQuery } from 'dexie-react-hooks';
import { ownedResources } from '../data/repositories';
import { useSourceList } from '../sermons/useSourceList';
import { sourcesMatching } from '../sermons/sourceList';
import { searchLibrary } from './librarySearch';

export interface ListMatches {
  /** the sermon sources (lists and Logos books alike) the list of sermon sources shows for the search */
  sermons: number;
  /** the books of his Logos library that are no sermon books, which the Library shows for the search; none while Logos is Off (the library is under the Logos switch, mw-rfjjzd.23) */
  library: number;
}

/** The counts for `query`; nothing for an empty one. `logosOn` is the Logos switch as the Settings values have it. */
export function useListMatches(query: string, logosOn: boolean): ListMatches {
  const sourceList = useSourceList();
  // the books of his import: the search answers no other book (src/data/owned.ts)
  const owned = useLiveQuery(ownedResources, []);
  if (query.trim() === '') return { sermons: 0, library: 0 };
  return {
    sermons: sourceList ? sourcesMatching(sourceList.items, query).length : 0,
    library: logosOn && owned !== undefined ? searchLibrary(query, owned).total : 0,
  };
}
