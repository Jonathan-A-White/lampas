// Maps (Settings > Study resources > Maps): one On/Off switch per map source (src/maps/sources/), 'maps.<id>', made from the registry of sources the way
// the study-resource switches are made from RESOURCES. A source that needs Logos is drawn, and used, only while Logos is On (src/maps/enabled.ts).
import type { MapSource } from '../../maps/types';
import { defineSetting } from '../define';

export type MapSwitch = 'on' | 'off';

export const mapSourceSetting = (source: Pick<MapSource, 'id' | 'name' | 'describe' | 'default' | 'needs'>) =>
  defineSetting<MapSwitch>({
    key: `maps.${source.id}`,
    default: source.default,
    allowed: {
      kind: 'choice',
      values: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
    },
    section: 'maps',
    label: source.name,
    hint: source.describe,
    ...(source.needs === 'logos' ? { help: 'This source is used, and its row shown, only while Logos is On in Study resources.' } : {}),
    ...(source.needs === 'logos' ? { dependsOn: { key: 'resource.logos', shown: (value: string) => value === 'on' } } : {}),
  });
