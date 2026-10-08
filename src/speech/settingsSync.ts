// src/speech/settingsSync.ts — what he chose in Settings reaches the speaker. The saved voice and pronunciation are
// read once at start and told to the bus; the bus events (also published by the Settings screen) are handed to
// src/speech/greek.ts, which speak() reads without waiting for a database read.
import { getGreekPronunciation, getVoice } from '../data/repositories';
import { publish, subscribe } from '../events/bus';
import { setGreekPronunciation, setGreekVoice } from './greek';

/** Starts listening and loads the saved choices; returns the stop. */
export function startSpeechSettingsSync(): () => void {
  let live = true;
  const stops = [
    subscribe('voices-changed', ({ greek }) => setGreekVoice(greek)),
    subscribe('pronunciation-changed', ({ pronunciation }) => setGreekPronunciation(pronunciation)),
  ];
  void Promise.all([getVoice('english'), getVoice('greek'), getGreekPronunciation()]).then(([english, greek, pronunciation]) => {
    if (!live) return;
    publish({ kind: 'voices-changed', english, greek });
    publish({ kind: 'pronunciation-changed', pronunciation });
  });
  return () => {
    live = false;
    stops.forEach((stop) => stop());
  };
}
