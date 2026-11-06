// src/themes/enabled.ts — which theme sources are in use (docs/sermons.md 'The themes', as src/sermons/enabled.ts): a source is on by its own switch in Settings > Study resources > Themes ('themes.<id>', its `default`
// where nothing is saved). Pure: `read(key)` gives a setting's value as text (undefined for one never saved); src/themes/index.ts reads the store and hands the values in.
import type { ThemeSource } from './types';

/** The key a source's switch is kept under. */
export const sourceKey = (source: Pick<ThemeSource, 'id'>): string => `themes.${source.id}`;

/** The sources that are on, in the order given. */
export function enabledSources(sources: readonly ThemeSource[], read: (key: string) => string | undefined): ThemeSource[] {
  return sources.filter((source) => {
    const value = read(sourceKey(source));
    return (value === 'on' || value === 'off' ? value : source.default) === 'on';
  });
}
