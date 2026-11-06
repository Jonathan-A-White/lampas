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
    label: source.name,
    hint: source.describe,
  });
