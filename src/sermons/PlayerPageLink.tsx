// src/sermons/PlayerPageLink.tsx — the link under the player's video back to the row's own page (mw-qtu3zvz.280.6; what it names and when it shows: playerPage.ts).
import { onAndroid } from '../openInApp';
import { opensNewTab, useOpenWebIn, webHref } from './openWeb';
import { pageLabel } from './playerPage';

/** The link under the video: the page's address as a web row opens (Firefox's intent on Android when he chose it, openWeb.ts), in a new tab where it is an https address. */
export function PlayerPageLink({ page }: { page: string }) {
  const href = webHref(page, useOpenWebIn(), onAndroid());
  return (
    <a data-sermon-page href={href} {...(opensNewTab(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="mt-2 flex min-h-11 items-center text-base font-medium text-accent">
      {pageLabel(page)}
    </a>
  );
}
