// src/share/shareText.ts — the Share screen's addresses and words, apart from its components.
import type { ShareRow } from '../data/repositories/shares';

/** The address of the Share screen with the talk the share went to. */
export const shareTalkHash = (ref: string): string => `#/share?talk=${encodeURIComponent(ref)}`;

/** What is waiting, in a line: '2 pictures and some words'. */
export function describeShare(row: Pick<ShareRow, 'files' | 'text'>): string {
  const pictures = row.files.length;
  const parts = [pictures === 0 ? '' : pictures === 1 ? '1 picture' : `${pictures} pictures`, row.text ? (pictures === 0 ? 'Some words' : 'some words') : ''].filter(Boolean);
  return parts.length === 2 ? `${parts[0]} and ${parts[1]}` : (parts[0] ?? 'Nothing');
}
