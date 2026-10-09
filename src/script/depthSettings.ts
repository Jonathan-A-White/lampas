// src/script/depthSettings.ts — the depth he chose for each language, by the setting's name, as a request to a grind carries it
// ({ hebrewDepth: 'both' }): the verse-ask request's `settings`, and the part of the Bible talk's `settings` that is these.
import { getScriptDepth } from '../data/repositories';
import { SCRIPTS, type Depth } from './scripts';

export async function depthSettings(): Promise<Record<string, Depth>> {
  const depths = await Promise.all(SCRIPTS.map(async (s) => [s.settingKey, await getScriptDepth(s)] as const));
  return Object.fromEntries(depths);
}
