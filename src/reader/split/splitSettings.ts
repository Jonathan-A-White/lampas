// src/reader/split/splitSettings.ts — the split's two settings read and saved (src/settings/definitions/split.ts): whether the dock is open, and the share of the box it takes.
import { setSetting, useSetting } from '../../settings/store';
import { readerSplitSetting, splitMapSetting, splitSizeSetting } from '../../settings/definitions/split';
import { fractionOf } from './splitSize';

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
/** Opens the dock with a map in it (the map is kept first, so the dock never draws a moment with the old one). */
export const openSplitWithMap = async (map: string): Promise<void> => {
  await setSetting(splitMapSetting, map);
  await openSplit();
};

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
