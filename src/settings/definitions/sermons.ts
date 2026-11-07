// Sermons (Settings > Study resources > Sermons): one On/Off switch per sermon source (src/sermons/sources/), 'sermons.<id>', made from the registry of sources the way the map switches are (definitions/maps.ts).
// A source that is Off gives the Sermons door and its sheet no rows. A source that needs Logos is drawn, and used, only while Logos is On (src/sermons/enabled.ts).
import type { SermonSource } from '../../sermons/types';
import { defineSetting } from '../define';

export type SermonSwitch = 'on' | 'off';

/** The tutor is told a setting's name in this many characters (src/tutor/screen.ts SETTING_NAME_MAX); a source's name is the label, less a bracketed qualifier at its end when it would not fit. */
const NAME_MAX = 40;

export const sermonSourceSetting = (source: Pick<SermonSource, 'id' | 'name' | 'describe' | 'default' | 'needs'>) =>
  defineSetting<SermonSwitch>({
    key: `sermons.${source.id}`,
    default: source.default,
    allowed: {
      kind: 'choice',
      values: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
    },
    section: 'sermons',
    label: source.name.length > NAME_MAX ? source.name.replace(/ \([^)]*\)$/, '') : source.name,
    hint: source.describe,
    ...(source.needs === 'logos' ? { help: 'This source is used, and its row shown, only while Logos is On in Study resources.' } : {}),
    ...(source.needs === 'logos' ? { dependsOn: { key: 'resource.logos', shown: (value: string) => value === 'on' } } : {}),
  });
