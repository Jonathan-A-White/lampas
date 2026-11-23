// src/settings/entries/voices.ts — one voice entry and one speed entry per speech language (SETTINGS slots 440 and 450, src/settings/entry.ts).
import { getSpeechRate, getSpeechRates, getVoice, setSpeechRate, setVoice } from '../../data/repositories';
import { publish } from '../../events/bus';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP, type SettableLanguage } from '../../speech/languages';
import type { Dependency } from '../define';
import { greekFrom } from '../definitions/greekInterest';
import { hebrewFrom } from '../definitions/hebrewInterest';
import { choice, PHONE_VOICE, slotted, type SettingEntry } from '../entry';

/** The dependency of a language's voice and speed rows: English always, Greek and Hebrew from Curious on their own dial. */
const languageFrom = (language: SettableLanguage): Dependency | undefined => (language === 'greek' ? greekFrom(1) : language === 'hebrew' ? hebrewFrom(1) : undefined);

/** The voice he chose for each language (null: the phone's own pick), as voices-changed carries them. */
const getVoices = async (): Promise<Record<SettableLanguage, string | null>> =>
  Object.fromEntries(await Promise.all(LANGUAGES.map(async (l) => [l.id, await getVoice(l.id)] as const))) as Record<SettableLanguage, string | null>;

export const voicesSlot = slotted(
  440,
  LANGUAGES.map((l): SettingEntry => {
    const entry = choice(
      `${l.id}Voice`,
      `${l.label} voice`,
      `Which voice reads ${l.label} aloud.`,
      [{ value: PHONE_VOICE, label: 'Phone default' }],
      async () => (await getVoice(l.id)) ?? PHONE_VOICE,
      async (value) => {
        const voice = value === PHONE_VOICE || value === '' ? null : value;
        await setVoice(l.id, voice);
        publish({ kind: 'voices-changed', voices: await getVoices() });
      },
      {
        section: 'voices',
        dependsOn: languageFrom(l.id),
        help: "Phone default lets the phone choose. Only the phone's own pick can be asked for; the other voices are the phone's.",
      },
    );
    // A voice he chose reads as itself when it is put back by an Undo.
    return { ...entry, show: (value) => `${l.label} voice: ${value === PHONE_VOICE ? 'Phone default' : String(value)}` };
  }),
);

export const ratesSlot = slotted(
  450,
  LANGUAGES.map(
    (l): SettingEntry => ({
      section: 'speed',
      dependsOn: languageFrom(l.id),
      key: `${l.id}Rate`,
      label: `${l.label} speed`,
      hint: `How fast ${l.label} is read aloud; ${DEFAULT_RATE} is normal, smaller is slower.`,
      allowed: { kind: 'number', min: RATE_MIN, max: RATE_MAX, step: RATE_STEP },
      read: () => getSpeechRate(l.id),
      write: async (value) => {
        await setSpeechRate(l.id, Number(value));
        publish({ kind: 'rates-changed', rates: await getSpeechRates() });
      },
      show: (value) => `${l.label} speed ${Number(value)}x`,
    }),
  ),
);
