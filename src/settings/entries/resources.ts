// src/settings/entries/resources.ts — the registry entries of the study resources: one On | Off switch for each resource, map source, theme source and sermon source, and the Bible in Logos
// (SETTINGS slots 520 to 560, src/settings/entry.ts).
import { getLogosBible, getStudyResources, setLogosBibleFor, setResourceOn } from '../../data/repositories';
import { SOURCES } from '../../maps/sources';
import { RESOURCES } from '../../resources';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE, isResourceId } from '../../resources/logosBible';
import { resourcesForLevel } from '../../resources/resourcesForLevel';
import { SOURCES as SERMON_SOURCES } from '../../sermons/sources';
import { SOURCES as THEME_SOURCES } from '../../themes/sources';
import { greekLevelOf } from '../definitions/greekInterest';
import { mapSourceSetting } from '../definitions/maps';
import { sermonSourceSetting } from '../definitions/sermons';
import { themeSourceSetting } from '../definitions/themes';
import { choice, fromDefinition, slotted, type SettingEntry } from '../entry';

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

// One on/off switch per study resource (src/resources): the Settings screen's own switch, kept in the store as 'resource.<id>'. Turning
// one on by talk skips the check the screen makes for an app on this phone; the word sheet says so when a link finds no app.
export const resourcesSlot = slotted(
  520,
  RESOURCES.map((r) =>
    choice(
      `resource.${r.id}`,
      r.name,
      r.describe,
      ON_OFF,
      async () => ((await getStudyResources()).on.includes(r.id) ? 'on' : 'off'),
      (value) => setResourceOn(r.id, value === 'on'),
      // a resource the dial hides at Just English (a Greek one: Strong's, the word sheet's number and its link) is drawn from Curious up; the dial's selector decides (mw-5r3p30.710)
      { section: 'resources', dependsOn: resourcesForLevel([r], 0).length === 0 ? { key: 'greekInterest', shown: (value) => resourcesForLevel([r], greekLevelOf(value)).length > 0 } : undefined },
    ),
  ),
);

// Bible in Logos (mw-5r3p30.841) is kept for each part of the canon: this setting is the New Testament's, the one `logosBible` always was. The Old Testament's and the Apocrypha's follow it until
// each is picked and are rows of their own in rows.ts (PART_ROWS), not settings the tutor reads: its Settings request has no room for two more.
const logosBibleEntry: SettingEntry = {
  section: 'resources',
  dependsOn: { key: 'resource.logos', shown: (value) => value === 'on' },
  key: 'logosBible',
  label: 'Bible in Logos',
  hint: 'The Bible that New Testament verses open in, in Logos.',
  help: `The Bible in your Logos library that New Testament verses open in, named by its Resource ID, such as ${DEFAULT_LOGOS_BIBLE} (the Legacy Standard Bible). It shows only while Logos is On. The Old Testament and the Apocrypha have a Bible of their own below it; Library > Bibles sets all three at once.`,
  allowed: { kind: 'text', valid: isResourceId, example: DEFAULT_LOGOS_BIBLE, note: 'a Resource ID; "" for none' },
  read: getLogosBible,
  write: async (value) => {
    await setLogosBibleFor('nt', String(value));
  },
  show: (value) => `Bible in Logos: ${COMMON_BIBLES.find((b) => b.id === value)?.name ?? String(value)}`,
};

export const logosBibleSlot = slotted(530, logosBibleEntry);

// One On/Off switch per map source (src/maps/index.ts SOURCES): 'maps.<id>', Settings > Study resources > Maps (src/settings/definitions/maps.ts). A source that needs Logos is drawn only while Logos is On.
export const mapsSlot = slotted(
  540,
  SOURCES.map((source) => fromDefinition(mapSourceSetting(source))),
);

// One On/Off switch per theme source (src/themes/sources/index.ts): 'themes.<id>', Settings > Study resources > Themes (src/settings/definitions/themes.ts).
export const themesSlot = slotted(
  550,
  THEME_SOURCES.map((source) => fromDefinition(themeSourceSetting(source))),
);

// One On/Off switch per sermon source (src/sermons/sources/index.ts): 'sermons.<id>', Settings > Study resources > Sermons (src/settings/definitions/sermons.ts). A source that needs Logos is drawn only while Logos is On.
export const sermonsSlot = slotted(
  560,
  SERMON_SOURCES.map((source) => fromDefinition(sermonSourceSetting(source))),
);
