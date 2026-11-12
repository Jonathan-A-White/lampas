// src/speech/settingsSync.ts — what he chose in Settings reaches the speaker. The saved voices, speeds, pronunciation and English accent are
// read once at start and told to the bus; the bus events (also published by the Settings screen) are handed to
// src/speech/greek.ts, which speak() reads without waiting for a database read.
import { getGreekPronunciation, getSpeechRates, getVoice } from '../data/repositories';
import { publish, subscribe } from '../events/bus';
import { getSetting, onSetting } from '../settings/store';
import { bibleVoiceSetting } from '../settings/definitions/bibleVoice';
import { englishAccentSetting } from '../settings/definitions/englishAccent';
import { hebrewPronunciationSetting } from '../settings/definitions/pronunciation';
import { chooseAccent } from './accents';
import { setGreekPronunciation, setSpeechRate, setVoice } from './greek';
import { LANGUAGES, type SettableLanguage } from './languages';
import { setHebrewPronunciation } from './pronunciation';
import { setBibleVoice, setRecordedRate } from './recordedVoice';

/** Starts listening and loads the saved choices; returns the stop. */
export function startSpeechSettingsSync(): () => void {
  let live = true;
  const stops = [
    subscribe('voices-changed', ({ voices }) => LANGUAGES.forEach((l) => setVoice(l.id, voices[l.id]))),
    subscribe('rates-changed', ({ rates }) => {
      LANGUAGES.forEach((l) => setSpeechRate(l.id, rates[l.id]));
      // the recorded voice reads English: it plays at his English speed (mw-82lb97i.3)
      setRecordedRate(rates.english);
    }),
    subscribe('pronunciation-changed', ({ pronunciation }) => setGreekPronunciation(pronunciation)),
    onSetting(englishAccentSetting, chooseAccent),
    onSetting(bibleVoiceSetting, setBibleVoice),
    onSetting(hebrewPronunciationSetting, setHebrewPronunciation),
  ];
  // the English accent of the sound hints (mw-5r3p30.353) is told to the accent module as soon as it is read, so no sheet is drawn in the wrong one for long
  void getSetting(englishAccentSetting).then((accent) => live && chooseAccent(accent));
  // the Bible voice (mw-82lb97i.6) is told to the recorded voice as soon as it is read: a chapter started before it is read goes by the default, Recording on Wi-Fi only (mw-zbgo4ep.30)
  void getSetting(bibleVoiceSetting).then((voice) => live && setBibleVoice(voice));
  void getSetting(hebrewPronunciationSetting).then((scheme) => live && setHebrewPronunciation(scheme));
  void Promise.all([Promise.all(LANGUAGES.map(async (l) => [l.id, await getVoice(l.id)] as const)), getGreekPronunciation(), getSpeechRates()]).then(([saved, pronunciation, rates]) => {
    if (!live) return;
    publish({ kind: 'voices-changed', voices: Object.fromEntries(saved) as Record<SettableLanguage, string | null> });
    publish({ kind: 'rates-changed', rates });
    publish({ kind: 'pronunciation-changed', pronunciation });
  });
  return () => {
    live = false;
    stops.forEach((stop) => stop());
  };
}
