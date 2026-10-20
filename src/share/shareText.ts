// src/share/shareText.ts — the Share screen's addresses and words, apart from its components.
import type { ShareRow } from '../data/repositories/shares';
import { isTalkPicture } from '../talk/pictures';

/** The address of the Share screen with the talk the share went to. */
export const shareTalkHash = (ref: string): string => `#/share?talk=${encodeURIComponent(ref)}`;

/** What is waiting, in a line: '2 pictures and some words'. Only the pictures Lampas can read are counted (JPEG, PNG or WebP, as a talk takes them);
 *  '' when nothing readable is waiting. */
export function describeShare(row: Pick<ShareRow, 'files' | 'text'>): string {
  const pictures = row.files.filter(isTalkPicture).length;
  const parts = [pictures === 0 ? '' : pictures === 1 ? '1 picture' : `${pictures} pictures`, row.text ? (pictures === 0 ? 'Some words' : 'some words') : ''].filter(Boolean);
  return parts.length === 2 ? `${parts[0]} and ${parts[1]}` : (parts[0] ?? '');
}

/** The line for the files of a share that are no picture Lampas reads (a GIF), or '' when there are none: said at the share, before a talk is chosen. */
export function leftOutLine(row: Pick<ShareRow, 'files'>): string {
  const left = row.files.filter((f) => !isTalkPicture(f)).length;
  return left === 0 ? '' : `${left === 1 ? '1 picture' : `${left} pictures`} left out: Lampas reads only JPEG, PNG or WebP.`;
}
