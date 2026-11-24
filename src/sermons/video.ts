// src/sermons/video.ts — the video a sermon address plays (mw-qtu3zvz.83, docs/sermons.md 'The player'): a YouTube address is a video id for the IFrame player; a Subsplash media address (or a church's short link) is the address of
// Subsplash's own embed page. Anything else is not a video the app plays: it opens on the web as ever.
import { isSubsplashHost } from './merge';

/** A Subsplash video has two pages: its `embed` (always a tap to play) and its media `page` (plays at once with `?autoplay`, mw-qtu3zvz.282). */
export type Video = { kind: 'youtube'; id: string } | { kind: 'subsplash'; embed: string; page: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const onHost = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

function youtubeId(url: URL): string | undefined {
  const host = url.hostname.toLowerCase();
  let id: string | undefined;
  if (onHost(host, 'youtu.be')) id = url.pathname.split('/')[1];
  else if (onHost(host, 'youtube.com') || onHost(host, 'youtube-nocookie.com')) {
    const [, first, second] = url.pathname.split('/');
    id = first === 'watch' ? (url.searchParams.get('v') ?? undefined) : first === 'embed' || first === 'live' || first === 'shorts' ? second : undefined;
  }
  return id !== undefined && YOUTUBE_ID.test(id) ? id : undefined;
}

/**
 * Subsplash's embed page: `https://subsplash.com/u/<church>/media/embed/d/<media id>` (the route its web shell has, with `frame-ancestors *` so any page may frame it). A media page is `https://subsplash.com/u/<church>/media/d/<media id>`;
 * a church's short link `https://<church>.subspla.sh/<media id>` is the same item. Both pages are returned: the embed, and the media page (which reads `?autoplay`). Anything else on a Subsplash host (the church's media list, a series) is no one video.
 */
function subsplash(url: URL): { embed: string; page: string } | undefined {
  const host = url.hostname.toLowerCase();
  if (!isSubsplashHost(host)) return undefined;
  const parts = url.pathname.split('/').filter((p) => p !== '');
  if (host.endsWith('.subspla.sh') && parts.length === 1 && host !== 'www.subspla.sh') {
    const church = host.slice(0, -'.subspla.sh'.length);
    return { embed: `https://subsplash.com/u/${church}/media/embed/d/${parts[0]}`, page: `https://subsplash.com/u/${church}/media/d/${parts[0]}` };
  }
  const media = parts.indexOf('media');
  if (parts[0] === 'u' && parts.length === 5 && media === 2 && parts[3] === 'd') {
    return { embed: `https://subsplash.com/u/${parts[1]}/media/embed/d/${parts[4]}`, page: `https://subsplash.com/u/${parts[1]}/media/d/${parts[4]}` };
  }
  return undefined;
}

/** The video an https address plays in the app, or undefined (a look-alike host, a channel page, a text page). */
export function videoOf(address: string): Video | undefined {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:') return undefined;
  const id = youtubeId(url);
  if (id !== undefined) return { kind: 'youtube', id };
  const pages = subsplash(url);
  return pages === undefined ? undefined : { kind: 'subsplash', ...pages };
}
