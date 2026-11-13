// Sermons (Settings > Study resources > Sermons): one On/Off switch per sermon source (src/sermons/sources/), 'sermons.<id>', made from the registry of sources the way the map switches are (definitions/maps.ts).
// A source that is Off gives the Sermons door and its sheet no rows. A source that needs Logos is drawn, and used, only while Logos is On; one that opens in Logos resources (`resources`) is drawn and used only while his Library import holds one (src/sermons/enabled.ts).
import { ownsKey } from '../../sermons/enabled';
import type { SermonSource } from '../../sermons/types';
import { defineSetting } from '../define';

export type SermonSwitch = 'on' | 'off';

/** The tutor is told a setting's name in this many characters (src/tutor/screen.ts SETTING_NAME_MAX); a source's name is the label, less a bracketed qualifier at its end when it would not fit. */
const NAME_MAX = 40;

export const sermonSourceSetting = (source: Pick<SermonSource, 'id' | 'name' | 'describe' | 'default' | 'needs' | 'resources'>) =>
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
    ...(source.resources ? { help: 'Only if your import says you own it.' } : source.needs === 'logos' ? { help: 'Used only while Logos is On in Study resources.' } : {}),
    // a Logos collection is drawn only while his import holds it (or Logos gives it free): the pseudo-key is read by rows.ts readValues
    ...(source.resources
      ? { dependsOn: { key: ownsKey(source), shown: (value: string) => value === 'on' } }
      : source.needs === 'logos'
        ? { dependsOn: { key: 'resource.logos', shown: (value: string) => value === 'on' } }
        : {}),
  });

export type OpenWebIn = 'browser' | 'firefox';

/** Where a web sermon opens (mw-qtu3zvz.16, src/sermons/openWeb.ts). Its key has no dot: 'sermons.<id>' is a source's On/Off switch. Not in the registry or DEFINITIONS (the tutor's Settings request is full): a row of its own, rows.ts OPEN_WEB_ROW, as Hand is. */
export const openWebSetting = defineSetting<OpenWebIn>({
  key: 'sermonsOpenWeb',
  default: 'browser',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'browser', label: 'This browser' },
      { value: 'firefox', label: 'Firefox' },
    ],
  },
  section: 'sermons',
  label: 'Open web sermons in',
  hint: 'Where a text sermon opens. Firefox works on Android only.',
  help: 'A text sermon opens in **This browser**, the default, or in **Firefox**. Firefox is for Android, where its read-aloud works over a Bluetooth speaker or earbuds when Chrome\'s plays on the phone. On a phone with no Firefox, or off Android, the sermon opens in this browser as before. A video sermon (YouTube or Subsplash) always opens as it is, in this browser, and a sermon in your Logos library always opens in Logos.',
});
