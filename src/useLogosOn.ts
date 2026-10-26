// src/useLogosOn.ts — whether Logos is switched on in Settings > Study resources, live: undefined until it has been read. The Hebrew word sheet offers to turn it on while it is off (mw-5vvlay.2).
import { useLiveQuery } from 'dexie-react-hooks';
import { getStudyResources } from './data/repositories';

export function useLogosOn(): boolean | undefined {
  const study = useLiveQuery(getStudyResources, []);
  return study === undefined ? undefined : study.on.includes('logos');
}
