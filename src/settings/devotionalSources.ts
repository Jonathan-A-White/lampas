// src/settings/devotionalSources.ts — which sources of devotionals are on (mw-r9xo1pj.4): Logos itself, 'Logos devotionals' and Brookfield First, read once into the DrawSources that the one draw
// (src/data/daily/devotionals.ts drawPool) takes. Live for a screen, once for the tutor and Today's tutor facts.
import { drawSourcesOf, type DrawSources } from '../data/daily/devotionals';
import { getStudyResources } from '../data/repositories';
import { useLogosOn } from '../useLogosOn';
import { devotionalLogosSetting, devotionalRephilSetting } from './definitions';
import { getSetting, useSetting } from './store';

/** The sources that are on, live; undefined until every switch has been read. */
export function useDrawSources(): DrawSources | undefined {
  const logosOn = useLogosOn();
  const logos = useSetting(devotionalLogosSetting);
  const rephil = useSetting(devotionalRephilSetting);
  return logosOn === undefined || logos === undefined || rephil === undefined ? undefined : drawSourcesOf(logosOn, logos, rephil);
}

/** The sources that are on, as they stand now. */
export async function readDrawSources(): Promise<DrawSources> {
  const [study, logos, rephil] = await Promise.all([getStudyResources(), getSetting(devotionalLogosSetting), getSetting(devotionalRephilSetting)]);
  return drawSourcesOf(study.on.includes('logos'), logos, rephil);
}
