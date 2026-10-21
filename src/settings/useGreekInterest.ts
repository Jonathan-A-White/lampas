// src/settings/useGreekInterest.ts — the Greek dial's step (mw-3ased2.2), live: undefined until it has been read. What the Reader, the word sheet and the pace draw or do
// depends on it (viewAt, weaveAt, newWordsAt in definitions/greekInterest.ts), so a change made in Settings or by the tutor reaches the screen that is open.
import { greekInterestSetting } from './definitions';
import { greekLevelOf, type GreekLevel } from './definitions/greekInterest';
import { useSetting } from './store';

export function useGreekInterest(): GreekLevel | undefined {
  const value = useSetting(greekInterestSetting);
  return value === undefined ? undefined : greekLevelOf(value);
}
