// src/themes/index.ts — the themes module's door (docs/sermons.md 'The themes'): the registry of sources and themesFor, the topics of a verse. Another theme system is one file in src/themes/sources/ and one line in SOURCES.
import { getSetting, setSetting } from '../settings/store';
import { hiddenThemesSetting, themeSourceSetting } from '../settings/definitions/themes';
import { enabledSources as enabledOf } from './enabled';
import { hiddenText, isHidden, parseHidden, withHidden, withoutHidden } from './hidden';
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

/** The names of the themes he has hidden (mw-qtu3zvz.91): [] where he has hidden none. */
export async function hiddenThemes(): Promise<string[]> {
  return parseHidden(await getSetting(hiddenThemesSetting));
}

/** Hides a theme by its name: it is left out of every place that shows a theme (themesFor), in every list that names it, until `showTheme`. */
export async function hideTheme(label: string): Promise<void> {
  await setSetting(hiddenThemesSetting, hiddenText(withHidden(await hiddenThemes(), label)));
}

/** Brings a hidden theme back ('Show again'); nothing changes for a theme that is not hidden. */
export async function showTheme(label: string): Promise<void> {
  const held = await hiddenThemes();
  const kept = withoutHidden(held, label);
  if (kept.length !== held.length) await setSetting(hiddenThemesSetting, hiddenText(kept));
}

/**
 * The topics of a verse or passage from every source that is on, without the themes he has hidden (mw-qtu3zvz.91): [] for a whole chapter or where there are none. Every place that shows or counts a theme asks here (the Themes line,
 * 'On the same theme', the sermons a theme lists, the tutor's themes), so a hidden theme is left out of all of them at once.
 */
export async function themesFor(place: ThemePlace): Promise<Theme[]> {
  const [themes, hidden] = await Promise.all([themesForSources(await enabledSources(), place), hiddenThemes()]);
  return themes.filter((theme) => !isHidden(theme.label, hidden));
}

/** The source a theme came from: it knows the credit and the home page. */
export function sourceOf(theme: Pick<Theme, 'source'>): ThemeSource | undefined {
  return active.find((source) => source.id === theme.source);
}
