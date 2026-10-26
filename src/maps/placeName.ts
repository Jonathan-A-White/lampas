// src/maps/placeName.ts — the place a map sheet is for, as it is written.
import { bookOf } from '../data/books';
import type { MapRef } from './types';

/** 'Genesis 10:19', 'Genesis 10:1-19' or 'Genesis 10': the place the sheet is for. */
export function placeName(ref: MapRef): string {
  const chapter = `${bookOf(ref.book)?.name ?? ref.book} ${ref.chapter}`;
  if (ref.from === undefined) return chapter;
  return ref.to === undefined || ref.to === ref.from ? `${chapter}:${ref.from}` : `${chapter}:${ref.from}-${ref.to}`;
}
