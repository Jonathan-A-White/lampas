// src/share/target.ts — Lampas in the phone's share sheet (mw-y3qno5.2, docs/ask-tutor.md 'Share to Lampas'), the worker's half. The manifest's share_target
// POSTs the shared pictures and words to SHARE_TARGET_PATH as multipart/form-data; src/sw.ts hands the request to receiveShare, which parks what came in
// Dexie (src/data/repositories/shares.ts) and answers with a redirect to the Share screen (#/share). The worker cannot show the screen: the window
// opens at the redirect, behind the licence gate like every screen. A shared CSV (his Logos list, docs/design/library-at-scale.md 5.1) is parked the same
// way but redirects to the library import (#/library?import=<id>, src/library/ImportLibrary.tsx), not to the talk chooser.
import { parkShare } from '../data/repositories/shares';

/** Where the manifest's share_target posts to. */
export const SHARE_TARGET_PATH = '/share-target';
/** The form fields the share_target names (pwa-manifest.ts). */
export const SHARE_FILES_FIELD = 'files';
/** The kinds of file the share sheet offers Lampas for. */
export const SHARE_FILE_ACCEPT = ['image/*', 'text/csv', '.csv'];

/** The address the Share screen is at for the share `id`. */
export const shareHash = (id: string): string => `#/share?s=${encodeURIComponent(id)}`;

/** Whether `request` is a share being posted to the target: a POST, to this origin's SHARE_TARGET_PATH. A GET to the same path is not (it is a page load). */
export const isShareRequest = (request: Request, origin: string): boolean => {
  const url = new URL(request.url);
  return request.method === 'POST' && url.origin === origin && url.pathname === SHARE_TARGET_PATH;
};

/** The address of the library import reading the CSV share `id`. */
export const importHash = (id: string): string => `#/library?import=${encodeURIComponent(id)}`;

/** Whether a shared file is a CSV: its kind says so, or its name ends in .csv (Windows may label a CSV application/vnd.ms-excel, and Android may offer Lampas by extension only). */
export const isCsvFile = (file: { name: string; type: string }): boolean => /^text\/(csv|comma-separated-values)$/i.test(file.type) || /\.csv$/i.test(file.name);

const redirectTo = (path: string): Response => Response.redirect(new URL(path, globalThis.location.origin).href, 303);

/** Parks the share a POST carries and answers with the redirect to the Share screen. A share that cannot be read still opens the app, on Home. */
export async function receiveShare(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const files = await Promise.all(
      form
        .getAll(SHARE_FILES_FIELD)
        .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0)
        .map(async (file) => ({ name: file.name, type: file.type, bytes: await file.arrayBuffer() })),
    );
    const text = ['title', 'text', 'url']
      .map((field) => form.get(field))
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .join('\n');
    if (files.length === 0 && !text) return redirectTo('/');
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await parkShare({ id, createdAt: Date.now(), text: text || undefined, files });
    return redirectTo(`/${files.some(isCsvFile) ? importHash(id) : shareHash(id)}`);
  } catch {
    return redirectTo('/');
  }
}
