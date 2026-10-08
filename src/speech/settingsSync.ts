// src/speech/settingsSync.ts — what he chose in Settings reaches the speaker. The saved voices, speeds and pronunciation are
// read once at start and told to the bus; the bus events (also published by the Settings screen) are handed to
// src/speech/greek.ts, which speak() reads without waiting for a database read.
import { getGreekPronunciation, getSpeechRates, getVoice } from '../data/repositories';
import { publish, subscribe } from '../events/bus';
import { setGreekPronunciation, setSpeechRate, setVoice } from './greek';
import { LANGUAGES } from './languages';

/** Starts listening and loads the saved choices; returns the stop. */
export function startSpeechSettingsSync(): () => void {
  let live = true;
  const stops = [
    subscribe('voices-changed', (e) => LANGUAGES.forEach((l) => setVoice(l.id, e[l.id]))),
    subscribe('rates-changed', ({ rates }) => LANGUAGES.forEach((l) => setSpeechRate(l.id, rates[l.id]))),
    subscribe('pronunciation-changed', ({ pronunciation }) => setGreekPronunciation(pronunciation)),
  ];
  void Promise.all([getVoice('english'), getVoice('greek'), getGreekPronunciation(), getSpeechRates()]).then(([english, greek, pronunciation, rates]) => {
    if (!live) return;
    publish({ kind: 'voices-changed', english, greek });
    publish({ kind: 'rates-changed', rates });
    publish({ kind: 'pronunciation-changed', pronunciation });
  });
  return () => {
    live = false;
    stops.forEach((stop) => stop());
  };
}
