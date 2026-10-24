// src/settings/definitions/index.ts — every setting declared once (src/settings/define.ts), one line each. src/settings/registry.ts makes
// their entries from these (and src/settings/rows.ts their rows); the rest of the settings are still written out in the registry until
// they move here (docs/module-map.md R2b to R2d).
import type { SettingDef, SettingValue } from '../define';
import { askBySetting } from './askBy';
import { audioBibleSetting } from './audioBible';
import { chapterButtonsSetting } from './chapterButtons';
import { dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting, todaysDevotionalSetting } from './daily';
import { englishAccentSetting } from './englishAccent';
import { fontSetting } from './font';
import { paradigmExtentSetting } from './grammarExtent';
import { greekInterestSetting } from './greekInterest';
import { greekKeyboardSetting } from './greekKeyboard';
import { handwritingSetting } from './handwriting';
import { immersiveSetting } from './immersive';
import { immersiveHintSetting } from './immersiveHint';
import { readLessonsSetting } from './readLessons';
import { readingModeSetting } from './readingMode';
import { readingPlanSetting } from './readingPlan';
import { themeSetting } from './theme';
import { sendSetting, talkSetting } from './talk';
import { tipsSetting } from './tips';
import { weaveSetting } from './weave';
import { weaveOrderSetting } from './weaveOrder';

export { ANOTHER } from './daily';
export { askBySetting, audioBibleSetting, chapterButtonsSetting, dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting, englishAccentSetting, fontSetting, greekInterestSetting, greekKeyboardSetting, handwritingSetting, immersiveHintSetting, immersiveSetting, paradigmExtentSetting, readLessonsSetting, readingModeSetting, readingPlanSetting, sendSetting, talkSetting, themeSetting, tipsSetting, todaysDevotionalSetting, weaveOrderSetting, weaveSetting };

export const DEFINITIONS: readonly SettingDef<SettingValue>[] = [themeSetting, weaveSetting, tipsSetting, immersiveSetting, immersiveHintSetting, askBySetting, audioBibleSetting, readingPlanSetting, readLessonsSetting, englishAccentSetting, weaveOrderSetting, handwritingSetting, readingModeSetting, chapterButtonsSetting, fontSetting, greekInterestSetting, dailyReviewSetting, dailyPlanSetting, dailyPsalmsSetting, dailyDevotionalSetting, devotionalSetting, devotionalDrawSetting, dailyTicksSetting, greekKeyboardSetting, talkSetting, sendSetting, paradigmExtentSetting];
