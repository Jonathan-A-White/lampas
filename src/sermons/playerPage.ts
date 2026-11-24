// src/sermons/playerPage.ts — the link back from the player sheet to the row's own page (mw-qtu3zvz.280.6, docs/sermons.md 'The player'): a row that plays a video other than its page
// shows 'Open on <host> ›' under the video: a Subsplash video (Brookfield First) links its Subsplash media page, a YouTube video played for another page (Life Bible Ministry's) links that page; a row whose url is itself the YouTube video shows none.
import type { LinkRow } from './merge';
import { videoOf, type Video } from './video';

const sameVideo = (a: Video, b: Video): boolean => (a.kind === 'youtube' ? b.kind === 'youtube' && a.id === b.id : b.kind === 'subsplash' && a.page === b.page);

/** The page the sheet links to under the video: for a Subsplash video, its media page (`https://subsplash.com/u/<church>/media/d/<id>`, never the embed address; Brookfield First's items, mw-qtu3zvz.280.7);
 *  for a YouTube video, the row's own page (its url) when that is some other address; undefined for a row that is itself the YouTube video it plays, a Logos row, or a row that plays nothing. */
export function pageOfRow(row: LinkRow, video: Video | undefined): string | undefined {
  if (video === undefined || row.opensIn === 'logos') return undefined;
  if (video.kind === 'subsplash') return video.page;
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
