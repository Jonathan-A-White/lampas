// src/memorize/weaveSettings.ts — the Reader's own Weave settings as they are now, read from the store (the Reader reads them live, src/reader/useReaderSettings.ts): what memorizeTarget
// and wovenOf take to make the weave of the moment (docs/layout/memorize.md). The weave exists in the English view, so the view is English here whatever the Reader shows;
// the Greek dial's gate on the Weave (weaveAt) holds, and a plain-English choice under the Weave (the Reader's switch) does not: he asked to learn the verse in the Weave.
import { getGreekInterest, getWeave, getWeaveGrammar, listLearningLemmas, listLevels, listSolidLemmas } from '../data/repositories';
import type { ReaderSettings } from '../reader/useReaderSettings';
import { weaveOrderSetting } from '../settings/definitions';
import { weaveAt } from '../settings/definitions/greekInterest';
import { getSetting } from '../settings/store';

/** The settings the weave of this moment is made from. */
export async function weaveSettingsNow(): Promise<Partial<ReaderSettings>> {
  const [level, saved, weaveGrammar, weaveOrder, levels, solid, learning] = await Promise.all([
    getGreekInterest(),
    getWeave(),
    getWeaveGrammar(),
    getSetting(weaveOrderSetting),
    listLevels(),
    listSolidLemmas(),
    listLearningLemmas(),
  ]);
  const weave = weaveAt(level, saved);
  return { greek: level, view: 'english', weave, weaveGrammar, weaveOrder, weaveShown: weave !== 'off', levels, solid, learning };
}
