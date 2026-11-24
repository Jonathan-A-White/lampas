// src/sermons/playerPage.ts — the link back from the player sheet to the row's own page (mw-qtu3zvz.280.6, docs/sermons.md 'The player'): a row that plays a video other than its page
// (Life Bible Ministry's page with a YouTube alt, a Subsplash alt under another url) shows 'Open on <host> ›' under the video; a row whose url is itself the video it plays shows none.
import type { LinkRow } from './merge';
import { videoOf, type Video } from './video';

const sameVideo = (a: Video, b: Video): boolean => (a.kind === 'youtube' ? b.kind === 'youtube' && a.id === b.id : b.kind === 'subsplash' && a.page === b.page);

/** The row's own page (its url) when the video it plays is some other address, else undefined: no link for a row that plays its own url, a Logos row, or a row that plays nothing. */
export function pageOfRow(row: LinkRow, video: Video | undefined): string | undefined {
  if (video === undefined || row.opensIn === 'logos') return undefined;
  const own = videoOf(row.open.url);
  if (own !== undefined && sameVideo(own, video)) return undefined;
  return row.open.url.startsWith('https://') ? row.open.url : undefined;
}

/** The label of the link: 'Open on lifebibleministry.com ›' (the page's host without www; PROVISIONAL, the Governor to confirm). */
export function pageLabel(page: string): string {
  let host = page;
  try {
    host = new URL(page).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    // an address that does not parse is named whole
  }
  return `Open on ${host} ›`;
}
