// src/settings/useExtent.ts — the saved value of a grammar-extent setting, live (mw-irpgqi.2, docs/paradigm-components.md): How much of a table for the
// paradigm table screen and the Paradigms list, and any of the three (src/settings/definitions/grammarExtent.ts) as the extent it stands for.
import { useLiveQuery } from 'dexie-react-hooks';
import type { GrammarExtent } from '../data/grammar/extent';
import { extentOf, paradigmExtentSetting, type ExtentKey } from './definitions/grammarExtent';
import { settingOf } from './registry';
import { useSetting } from './store';

/** The saved value of an extent setting, live, and the extent it stands for; undefined until read. */
export function useExtentSetting(key: ExtentKey): { value: string; extent: GrammarExtent } | undefined {
  const value = useLiveQuery(async () => String(await settingOf(key)?.read()), [key]);
  return value === undefined ? undefined : { value, extent: extentOf(key, value) };
}

/** How much of a table, live (the paradigm table screen and list read it); undefined until read. */
export const useParadigmExtent = (): GrammarExtent | undefined => useSetting(paradigmExtentSetting);
