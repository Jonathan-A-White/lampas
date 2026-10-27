// src/settings/useInterestLevels.ts — both dials' steps (mw-gdcyf98.3), live: undefined until they have been read. A screen that draws a chapter reads the step of the chapter's own
// language from them (levelOf in definitions/interest.ts), so a change made in Settings or by the tutor reaches the screen that is open.
import { hebrewInterestSetting, greekInterestSetting } from './definitions';
import { greekLevelOf } from './definitions/greekInterest';
import { hebrewLevelOf } from './definitions/hebrewInterest';
import { type InterestLevels } from './definitions/interest';
import { useSetting } from './store';

export function useInterestLevels(): InterestLevels | undefined {
  const greek = useSetting(greekInterestSetting);
  const hebrew = useSetting(hebrewInterestSetting);
  return greek === undefined || hebrew === undefined ? undefined : { grc: greekLevelOf(greek), he: hebrewLevelOf(hebrew) };
}
