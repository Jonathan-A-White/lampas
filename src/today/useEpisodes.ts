// src/today/useEpisodes.ts — the Morning RePhil episodes Today draws from (mw-r9xo1pj.24): the bundled list at once, and with the sermon index service's newest once it has answered (src/data/daily/rephilFeed.ts,
// at most one ask a day); the component draws again when the list grows.
import { useEffect, useSyncExternalStore } from 'react';
import { currentEpisodes, subscribeEpisodes, type Episode } from '../data/daily/morningRephil';
import { refreshEpisodes } from '../services/rephilFeed';

export function useEpisodes(): readonly Episode[] {
  useEffect(() => {
    void refreshEpisodes();
  }, []);
  return useSyncExternalStore(subscribeEpisodes, currentEpisodes);
}
