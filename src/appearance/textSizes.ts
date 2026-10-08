// src/appearance/textSizes.ts — the text sizes as a list. A size is a percent of the phone's own text size (the root
// font size, which every rem in the app follows): 100 is the phone's. The reader, the word sheet and every screen
// scale with it; spacing and the 44 px tap height do not (src/index.css).

/** The ids of the entries below. */
export type TextSizeId = 'small' | 'normal' | 'large' | 'largest';

export interface TextSizeInfo {
  id: TextSizeId;
  /** what Settings shows */
  label: string;
  percent: number;
}

export const TEXT_SIZES: readonly TextSizeInfo[] = [
  { id: 'small', label: 'Small', percent: 85 },
  { id: 'normal', label: 'Normal', percent: 100 },
  { id: 'large', label: 'Large', percent: 130 },
  { id: 'largest', label: 'Largest', percent: 160 },
];

export const DEFAULT_TEXT_PERCENT = 100;
export const TEXT_MIN_PERCENT = 85;
export const TEXT_MAX_PERCENT = 160;

/** A saved size within the range; the phone's own size when it is not a number. */
export function normaliseTextPercent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.min(TEXT_MAX_PERCENT, Math.max(TEXT_MIN_PERCENT, value)))
    : DEFAULT_TEXT_PERCENT;
}
