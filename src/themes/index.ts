// src/themes/index.ts — the themes module's door (docs/sermons.md 'The themes'): the registry of sources and themesFor, the topics of a verse. Another theme system is one file in src/themes/sources/ and one line in SOURCES.
import { getSetting } from '../settings/store';
import { themeSourceSetting } from '../settings/definitions/themes';
import { enabledSources as enabledOf } from './enabled';
import { SOURCES } from './sources';
import { themesForSources } from './themesFor';
import type { Theme, ThemePlace, ThemeSource } from './types';

export type { Theme, ThemePlace, ThemeSource, Topic, Link } from './types';

export { SOURCES };

/** The sources in use: SOURCES, or a list a test put in their place. */
let active: readonly ThemeSource[] = SOURCES;

/** The test seam (tests/support/test-themes.ts): the sources the screens ask, or `undefined` for the registered ones again. */
export function setThemeSources(sources: readonly ThemeSource[] | undefined): void {
  active = sources ?? SOURCES;
}

/** The sources that are on (src/themes/enabled.ts): each one's switch in Settings > Study resources > Themes. Registry order. `sources` defaults to the ones in use. */
export async function enabledSources(sources: readonly ThemeSource[] = active): Promise<ThemeSource[]> {
  const values: Record<string, string> = {};
  await Promise.all(
    sources.map(async (source) => {
      const def = themeSourceSetting(source);
      values[def.key] = await getSetting(def);
    }),
  );
  return enabledOf(sources, (key) => values[key]);
}

/** The topics of a verse or passage from every source that is on: [] for a whole chapter or where there are none. */
export async function themesFor(place: ThemePlace): Promise<Theme[]> {
  return themesForSources(await enabledSources(), place);
}

/** The source a theme came from: it knows the credit and the home page. */
export function sourceOf(theme: Pick<Theme, 'source'>): ThemeSource | undefined {
  return active.find((source) => source.id === theme.source);
}
