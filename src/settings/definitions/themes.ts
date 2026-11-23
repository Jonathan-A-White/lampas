// Themes (Settings > Study resources > Themes): one On/Off switch per theme source (src/themes/sources/), 'themes.<id>', made from the registry of sources the way the map switches are (definitions/maps.ts). A source that
// is Off gives no Themes line under a verse and none of its topics to the sermons on the same theme.
import type { ThemeSource } from '../../themes/types';
import { defineSetting } from '../define';

export type ThemeSwitch = 'on' | 'off';

export const themeSourceSetting = (source: Pick<ThemeSource, 'id' | 'name' | 'describe' | 'default'>) =>
  defineSetting<ThemeSwitch>({
    key: `themes.${source.id}`,
    default: source.default,
    allowed: {
      kind: 'choice',
      values: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
    },
    section: 'themes',
    // the name without its qualifier in brackets: the tutor is told a setting's name in 40 characters (SETTING_NAME_MAX)
    label: source.name.replace(/ \([^)]*\)$/, ''),
    hint: source.describe,
  });

/**
 * The themes he has hidden (mw-qtu3zvz.91, docs/sermons.md 'Hiding a theme'): their names a line each, '' where none is. 'Hide this theme' on a theme's sermon list adds one and 'Show again' under Settings > Study resources > Themes > Hidden themes takes it off
 * (src/themes/index.ts hideTheme, showTheme). A hidden theme is left out of every verse's Themes line, of 'On the same theme', of the search's themes and of the tutor's. Not in the registry or DEFINITIONS (the names are his own to
 * look after, as Open web sermons in is): a row of its own, rows.ts HIDDEN_THEMES_ROW.
 */
export const hiddenThemesSetting = defineSetting<string>({
  outside: 'a row of its own (rows.ts), the names are his own to hide and show',
  key: 'themesHidden',
  default: '',
  allowed: { kind: 'text', valid: () => true, example: 'Atonement\nGrace', note: 'the names of the hidden themes, one a line, or empty for none' },
  parse: (raw) => (typeof raw === 'string' ? raw : ''),
  section: 'themes',
  label: 'Hidden themes',
  hint: 'Themes you hid from a verse\'s Themes line. Show again brings one back.',
});
