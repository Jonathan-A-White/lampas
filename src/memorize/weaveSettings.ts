// src/memorize/weaveSettings.ts — the Reader's own Weave settings as they are now, read from the store (the Reader reads them live, src/reader/useReaderSettings.ts): what memorizeTarget
// and wovenOf take to make the weave of the moment (docs/layout/memorize.md). The weave exists in the English view, so the view is English here whatever the Reader shows;
// the dial's gate on the Weave (weaveAt, the dial of the verse's language) holds, and a plain-English choice under the Weave (the Reader's switch) does not: he asked to learn the verse in the Weave.
import { getInterestLevels, getWeave, getWeaveGrammar, listLearningLemmas, listLevels, listSolidLemmas } from '../data/repositories';
import type { ReaderSettings } from '../reader/useReaderSettings';
import { weaveOrderSetting } from '../settings/definitions';
import { weaveAt } from '../settings/definitions/greekInterest';
import { levelOf, type InterestLang } from '../settings/definitions/interest';
import { getSetting } from '../settings/store';

/** The settings the weave of this moment is made from, by the dial of the language the verse is in (mw-gdcyf98.3; a Greek verse unless `source` says 'hbo'). */
export async function weaveSettingsNow(source: InterestLang = 'grc'): Promise<Partial<ReaderSettings>> {
  const [dials, saved, weaveGrammar, weaveOrder, levels, solid, learning] = await Promise.all([
    getInterestLevels(),
    getWeave(),
    getWeaveGrammar(),
    getSetting(weaveOrderSetting),
    listLevels(),
    listSolidLemmas(),
    listLearningLemmas(),
  ]);
  const level = levelOf(source, dials);
  const weave = weaveAt(level, saved);
  return { level, view: 'english', weave, weaveGrammar, weaveOrder, weaveShown: weave !== 'off', levels, solid, learning };
}
