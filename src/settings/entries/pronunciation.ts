// src/settings/entries/pronunciation.ts — the registry entries of the pronunciation settings written by hand: the family, Set each language on its own, Greek pronunciation and the English accent
// (SETTINGS slots 460 to 480 and 500, src/settings/entry.ts). Hebrew pronunciation is a plain definition (src/settings/definitions/pronunciation.ts).
import { getGreekPronunciation, setGreekPronunciation } from '../../data/repositories';
import { publish } from '../../events/bus';
import { chooseAccent } from '../../speech/accents';
import { PRONUNCIATIONS } from '../../speech/pronunciation';
import { englishAccentSetting } from '../definitions/englishAccent';
import { familyOf, hebrewPronunciationSetting, pronunciationSeparateSetting, pronunciationSetting, separateFrom } from '../definitions/pronunciation';
import { choice, fromDefinition, slotted, type SettingEntry } from '../entry';
import { getSetting, setSetting } from '../store';

/** Chooses the Greek pronunciation and tells the bus. */
async function writeGreekPronunciation(value: string): Promise<void> {
  await setGreekPronunciation(value);
  publish({ kind: 'pronunciation-changed', pronunciation: value });
}

/** Puts both languages on the family's schemes: what writing the family does, and what turning 'Set each language on its own' off does. */
async function applyFamily(id: unknown): Promise<void> {
  const family = familyOf(id);
  await writeGreekPronunciation(family.greek);
  await setSetting(hebrewPronunciationSetting, hebrewPronunciationSetting.parse(family.hebrew));
}

/** Pronunciation (the family, mw-gdcyf98.6): saved, then it writes both languages' own pronunciation. */
const pronunciationEntry: SettingEntry = (() => {
  const entry = fromDefinition(pronunciationSetting);
  return {
    ...entry,
    write: async (value) => {
      await entry.write(value);
      await applyFamily(value);
    },
  };
})();

/** Set each language on its own: turning it off puts both languages back on the family (the two rows go, and what they held with them). */
const pronunciationSeparateEntry: SettingEntry = (() => {
  const entry = fromDefinition(pronunciationSeparateSetting);
  return {
    ...entry,
    write: async (value) => {
      await entry.write(value);
      if (pronunciationSeparateSetting.parse(value) === 'off') await applyFamily(await getSetting(pronunciationSetting));
    },
  };
})();

export const pronunciationSlot = slotted(460, pronunciationEntry);
export const pronunciationSeparateSlot = slotted(470, pronunciationSeparateEntry);

export const greekPronunciationSlot = slotted(
  480,
  choice('greekPronunciation', 'Greek pronunciation', 'How Greek is pronounced when it is read aloud.', PRONUNCIATIONS.map((p) => ({ value: p.id, label: p.label })), getGreekPronunciation, writeGreekPronunciation, {
    section: 'pronunciation',
    dependsOn: separateFrom('grc'),
  }),
);

/** English accent: saved like any declared setting, and handed to the accent module at once, so the next hint drawn is said in it. */
export const englishAccentSlot = slotted(
  500,
  (() => {
    const entry = fromDefinition(englishAccentSetting);
    return {
      ...entry,
      write: async (value) => {
        await entry.write(value);
        chooseAccent(englishAccentSetting.parse(value));
      },
    } satisfies SettingEntry;
  })(),
);
