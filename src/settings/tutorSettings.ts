// src/settings/tutorSettings.ts — what the tutor is told on Settings (mw-5r3p30.107): every setting and study-resource switch the screen has, with
// the value it holds now and the hint shown under its control, so he can say what one gives and what is lost without it, a setting that is Off
// included (a row's details are drawn only while it is on, mw-5r3p30.106, but the tutor still knows them). Links to other screens are not settings.
// The longer help of a registry setting is already in the grind's instructions (src/settings/grindText.ts); only what is shown rides here.
import { getStudyResources } from '../data/repositories';
import type { ScreenSetting } from '../tutor/screen';
import { settingOf } from './registry';
import { isSermonSourceRow, isTalkable, ROWS } from './rows';

/** The value as the screen shows it: 'Dark', '0.8x', 'Off', without the setting's name that `show` starts with. */
function shown(label: string, text: string): string {
  for (const lead of [`${label}: `, `${label} `]) if (text.startsWith(lead)) return text.slice(lead.length);
  return text;
}

/** The one line the tutor is told of every sermon source (mw-qtu3zvz.236, his choice A: "I don't think the tutor needs to know what logos resources you have"): how many are on, and where they are switched. It weighs the same
 *  with one source or fifty (the count's digits apart); a source's own row is not sent. */
export const SERMON_SOURCES_LINE = 'Sermon sources';

async function sermonSourcesLine(): Promise<ScreenSetting> {
  const rows = ROWS.filter(isSermonSourceRow);
  const on = (await Promise.all(rows.map(async (r) => (await settingOf(r.key)?.read()) === 'on'))).filter(Boolean).length;
  return { name: SERMON_SOURCES_LINE, value: `${on} of ${rows.length} on`, help: 'Each is switched in Settings > Study resources > Sermons > Sermon sources.' };
}

/** Every setting and study resource of Settings, in the screen's order, as the tutor reads it, with the sermon sources as one line where the first of them stands. */
export async function settingsForTutor(): Promise<ScreenSetting[]> {
  const resources = await getStudyResources();
  const rows = ROWS.filter((r) => isTalkable(r.key) || (isSermonSourceRow(r) && r === ROWS.find(isSermonSourceRow)));
  return Promise.all(
    rows.map(async (row): Promise<ScreenSetting> => {
      if (isSermonSourceRow(row)) return sermonSourcesLine();
      const entry = settingOf(row.key);
      const value = entry
        ? shown(row.label, entry.show(await entry.read()))
        : resources.on.includes(row.key.slice('resource.'.length))
          ? 'On'
          : 'Off';
      return { name: row.label, value, help: row.hint };
    }),
  );
}
