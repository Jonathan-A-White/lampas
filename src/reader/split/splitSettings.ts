// src/reader/split/splitSettings.ts — the split's two settings read and saved (src/settings/definitions/split.ts): whether the dock is open, and the share of the box it takes.
import { setSetting, useSetting } from '../../settings/store';
import { readerSplitSetting, splitSizeSetting } from '../../settings/definitions/split';
import { fractionOf } from './splitSize';

/** Whether the dock is open, following every change; false until the setting has been read. */
export const useSplitOpen = (): boolean => useSetting(readerSplitSetting) === 'on';

/** The kept share of the box, following every change; undefined until it has been read. */
export const useSplitFraction = (): number | undefined => useSetting(splitSizeSetting);

export const openSplit = (): Promise<void> => setSetting(readerSplitSetting, 'on');
export const closeSplit = (): Promise<void> => setSetting(readerSplitSetting, 'off');
/** Keeps the dock's size (px) in a box of `box` px as the share of it. */
export const keepSplitSize = (size: number, box: number): Promise<void> => setSetting(splitSizeSetting, fractionOf(size, box));
