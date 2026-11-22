// src/sermons/SermonPlayer.tsx — the sheet a video sermon plays in (mw-qtu3zvz.83, docs/sermons.md 'The player'): over the reader (and the Sermons sheet it was opened from), the video in 16:9 under its title, and Close.
// YouTube plays in the IFrame player drawn from youtube-nocookie.com; Subsplash in its own embed page. When Lampas opened it itself (openSermon(row, { auto: true })) the video is started with no tap; where the browser refuses
// (autoplay blocked, or a play that never starts in 3 seconds), the video stands on one big Play button and nothing is lost. <SermonPlayerHost /> is mounted once, in App.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNoDoor } from '../tutor/door';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { useSheetBack } from '../ui/sheetBack';
import { closeSermon, useOpenedSermon } from './player';
import { loadYouTube, type YouTubePlayer } from './youtubeApi';

/** How long a started video has to begin before the browser is taken to have refused it. */
export const PLAY_WAIT_MS = 3000;
const PLAYING = 1;
const BUFFERING = 3;

/** The big Play button: one, over the video, as tall as the picture. */
function BigPlay({ onPlay }: { onPlay: () => void }) {
  return (
    <button type="button" data-sermon-play onClick={onPlay} className="absolute inset-0 flex min-h-16 items-center justify-center gap-2 bg-black/70 text-2xl font-semibold text-white active:bg-black/80">
      <span aria-hidden="true">▶</span>
      Play
    </button>
  );
}

function YouTubeStage({ id, auto }: { id: string; auto: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const waiting = useRef<{ done: () => void; refused: () => void } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  // starts the video: it is begun when the player says it is playing; it is refused when the player says autoplay is blocked, or when nothing begins in PLAY_WAIT_MS
  const start = (): void => {
    const target = player.current;
    if (target === null) return;
    waiting.current?.done();
    const timer = window.setTimeout(() => waiting.current?.refused(), PLAY_WAIT_MS);
    const settle = (): void => {
      window.clearTimeout(timer);
      waiting.current = null;
    };
    waiting.current = {
      done: () => {
        settle();
        setBlocked(false);
      },
      refused: () => {
        settle();
        setBlocked(true);
      },
    };
    target.playVideo();
  };

  useEffect(() => {
    let gone = false;
    const mount = document.createElement('div');
    holder.current?.appendChild(mount);
    loadYouTube().then(
      (api) => {
        if (gone) return;
        player.current = new api.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          videoId: id,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, autoplay: auto ? 1 : 0 },
          events: {
            onReady: () => {
              if (auto && !gone) start();
            },
            onStateChange: (event) => {
              if (event.data === PLAYING || event.data === BUFFERING) waiting.current?.done();
            },
            onAutoplayBlocked: () => waiting.current?.refused(),
          },
        });
      },
      () => {
        if (!gone) setFailed(true);
      },
    );
    return () => {
      gone = true;
      waiting.current?.done();
      player.current?.destroy();
      player.current = null;
      mount.remove();
    };
    // the player is made once for this video
  }, [id, auto]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={holder} data-sermon-video className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      {blocked ? <BigPlay onPlay={start} /> : null}
      {failed ? (
        <p role="status" className="absolute inset-0 flex items-center justify-center p-4 text-center text-base text-white">
          Needs the internet to play.
        </p>
      ) : null}
    </div>
  );
}

function SubsplashStage({ embed, title }: { embed: string; title: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe data-sermon-video src={embed} title={title} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
    </div>
  );
}

function PlayerSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, true);
  useSheetBack(onClose);
  useNoDoor(); // video: nothing on it to ask about, so no ? over it
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label={title} data-sermon-player style={{ transform: drag ? `translateY(${drag}px)` : undefined }} className="relative flex flex-col rounded-t-2xl border-t border-line bg-surface">
        <div {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Close
          </button>
        </div>
        <div className="px-4 pb-[calc(1rem+var(--lp-bar-inset))]">
          <h2 className="pb-2 pr-16 text-lg font-semibold break-words">{title}</h2>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Draws the sheet for the sermon openSermon was last called with; mounted once, in App. */
export function SermonPlayerHost() {
  const opened = useOpenedSermon();
  if (opened === null) return null;
  const { video, title, auto } = opened;
  return (
    <PlayerSheet title={title} onClose={closeSermon}>
      {video.kind === 'youtube' ? <YouTubeStage key={video.id} id={video.id} auto={auto} /> : <SubsplashStage embed={video.embed} title={title} />}
    </PlayerSheet>
  );
}
