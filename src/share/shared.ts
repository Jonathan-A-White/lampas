// src/share/shared.ts — what Share > Lampas brought, as the Talk sheet takes it (mw-y3qno5.2): the pictures as files, to wait in the composer, and the
// words, to wait in its field. The parked row (src/data/repositories/shares.ts) holds bytes; this is the same thing made ready for the sheet.
import type { ShareRow } from '../data/repositories/shares';

export interface SharedContent {
  files: File[];
  text: string;
}

/** The share as files and words. A file the share sheet sent without a name or kind still becomes a file; the picture box refuses what is no picture. */
export function sharedContentOf(row: ShareRow): SharedContent {
  return {
    files: row.files.map((f, i) => new File([f.bytes], f.name || `shared-${i + 1}`, { type: f.type })),
    text: row.text ?? '',
  };
}
