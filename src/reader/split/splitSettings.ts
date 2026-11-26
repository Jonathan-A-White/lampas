// src/reader/split/splitSettings.ts — the split's two settings read and saved (src/settings/definitions/split.ts): whether the dock is open, and the share of the box it takes.
import { getSetting, setSetting, useSetting } from '../../settings/store';
import { readerSplitSetting, splitLinkSetting, splitMapSetting, splitSizeSetting, splitTextSetting, splitTimelineSetting } from '../../settings/definitions/split';
import { fractionOf } from './splitSize';
import { splitTextOf, type SplitTextKey } from './splitTexts';

/** Whether the dock is open, following every change; false until the setting has been read. */
export const useSplitOpen = (): boolean => useSetting(readerSplitSetting) === 'on';

/** The kept share of the box, following every change; undefined until it has been read. */
export const useSplitFraction = (): number | undefined => useSetting(splitSizeSetting);

export const openSplit = (): Promise<void> => setSetting(readerSplitSetting, 'on');
export const closeSplit = (): Promise<void> => setSetting(readerSplitSetting, 'off');
/** Keeps the dock's size (px) in a box of `box` px as the share of it. */
export const keepSplitSize = (size: number, box: number): Promise<void> => setSetting(splitSizeSetting, fractionOf(size, box));

/** The map the dock holds, as src/maps/splitMap.ts writes it ('' for none); undefined until the setting has been read. */
export const useSplitMap = (): string | undefined => useSetting(splitMapSetting);
/** Opens the dock with a map in it (the map is kept first, and any text the dock held is let go, so the dock never draws a moment with the old one). */
export const openSplitWithMap = async (map: string): Promise<void> => {
  await setSetting(splitMapSetting, map);
  await setSetting(splitTextSetting, '');
  await letTimelineGo();
  await openSplit();
};

/** The text the dock holds, following every change; null while it holds none or the setting has not been read yet. */
export const useSplitText = (): SplitTextKey | null => splitTextOf(useSetting(splitTextSetting) ?? '');
/** Opens the dock with a text beside the passage (kept first, as the map is), or swaps the text of a dock already open. */
export const openSplitWithText = async (key: SplitTextKey): Promise<void> => {
  await setSetting(splitTextSetting, key);
  await letTimelineGo();
  await openSplit();
};

/** Whether the dock holds the timeline (mw-fnvjof.17.317.2), following every change; false until the setting has been read. While it does, the dock shows the strip, whatever text or map it held before. */
export const useSplitTimeline = (): boolean => useSetting(splitTimelineSetting) === 'on';
/** Opens the dock with the timeline in it, or puts the timeline in a dock already open. The text or map it held is kept under it, and is let go when another is chosen. */
export const openSplitWithTimeline = async (): Promise<void> => {
  await setSetting(splitTimelineSetting, 'on');
  await openSplit();
};
/** A text or a map takes the timeline's place: written after the new one is kept, so the dock never draws a moment with a third thing; nothing is written while the dock holds no timeline. */
async function letTimelineGo(): Promise<void> {
  if ((await getSetting(splitTimelineSetting)) === 'on') await setSetting(splitTimelineSetting, 'off');
}

/** Whether the Link is on, following every change; true until the setting has been read (it is on by default). */
export const useSplitLink = (): boolean => useSetting(splitLinkSetting) !== 'off';
export const keepSplitLink = (on: boolean): Promise<void> => setSetting(splitLinkSetting, on ? 'on' : 'off');

/** The verse the dock is opened beside (Split on a map is pressed over that verse's Verse view): the passage keeps it in view as it shrinks. Asked for just before the dock opens; the Reader takes it once, and one nobody took in 5 s is let go. */
let besideVerse: { n: number; at: number } | null = null;
const BESIDE_MS = 5000;
export const keepVerseBeside = (n: number): void => {
  besideVerse = { n, at: Date.now() };
};
export function takeVerseBeside(): number | null {
  const asked = besideVerse;
  besideVerse = null;
  return asked && Date.now() - asked.at < BESIDE_MS ? asked.n : null;
}
