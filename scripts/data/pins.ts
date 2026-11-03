// scripts/data/pins.ts — the sources of the NT data build that are pinned to the bytes the committed data was built from (mw-5r3p30.1004; docs/data.md 'Pinned sources').
// STEPBible's files (TBESG, TAGNT) are fetched at a commit of STEPBible-Data, so the URL always serves the same bytes; the MSB table has no versioned URL, so it is
// checked against a sha256 and, when upstream has changed only what MSB_EDITS says it changed, put back to the pinned bytes. Anything else stops the build.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** One change upstream has made to a file since it was pinned, undone: on this line (1-based) the first `from` becomes `to`. */
export interface PinEdit {
  line: number;
  from: string;
  to: string;
  why: string;
}

/** The MSB table's bytes the committed data was built from (2026-10-28). */
export const MSB_SHA256 = '1fdce92b604b9de2b6d8ab150697dbb7390f1174a13ebffcbfa0af4e83cd1f2c';
/** What majoritybible.com has changed since: Matthew 15:30's "Jesus'" has a typographic apostrophe (seen 2026-11-03). Kept straight, as the committed data has it (mw-9ji6ek0.3). */
export const MSB_EDITS: readonly PinEdit[] = [{ line: 14420, from: '’', to: "'", why: "Matthew 15:30 \"Jesus'\": upstream's typographic apostrophe" }];

/** TBESG's bytes at the commit of TBESG_URL (STEPBible-Data 805360e, 2025-04-16); master has since changed only the licence header. */
export const TBESG_SHA256 = '312f723d7b8ef263bbdfb0451c9b8057125804dfff390b6f8544cff2a84b57f4';

const sha256Of = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

export interface PinnedFile {
  path: string;
  url: string;
  sha256: string;
  /** upstream changes to undo when the bytes are not the pinned ones */
  edits?: readonly PinEdit[];
  download: (url: string, dest: string) => Promise<void>;
  log: (line: string) => void;
}

/**
 * The text of a pinned file: fetched first unless it is there, then it must have the pinned sha256, directly or once `edits` are undone (the file on disk is then
 * written with the pinned bytes, so a second run finds it right). Any other bytes stop the build, naming the file to delete.
 */
export async function loadPinned({ path, url, sha256, edits = [], download, log }: PinnedFile): Promise<string> {
  if (!existsSync(path)) {
    log(`downloading ${url}`);
    await download(url, path);
  }
  const bytes = readFileSync(path);
  const got = sha256Of(bytes);
  if (got === sha256) return bytes.toString('utf8');
  const fail = (): never => {
    throw new Error(`${path}: the file's sha256 is ${got}, not the pinned ${sha256}; delete ${path} to fetch it again (docs/data.md 'Pinned sources')`);
  };
  if (!edits.length) return fail();
  const lines = bytes.toString('utf8').split('\n');
  for (const e of edits) {
    const at = lines[e.line - 1];
    if (at === undefined || !at.includes(e.from)) return fail();
    lines[e.line - 1] = at.replace(e.from, e.to);
  }
  const fixed = lines.join('\n');
  if (sha256Of(Buffer.from(fixed)) !== sha256) return fail();
  for (const e of edits) log(`${path}: upstream changed line ${e.line} (${e.why}); put back to the pinned bytes`);
  writeFileSync(path, fixed);
  return fixed;
}
