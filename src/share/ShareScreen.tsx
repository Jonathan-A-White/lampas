// src/share/ShareScreen.tsx — Share > Lampas from another app (mw-y3qno5.2, docs/ask-tutor.md 'Share to Lampas'). The worker parked the pictures and words
// (src/share/target.ts) and opened the app here, at '#/share?s=<id>': the 'Share to Lampas' sheet asks which talk they go to: 'Continue: <the newest talk> ·
// <when>' first, 'New talk', 'Choose a talk' (the recent talks, newest first, each with its first question and date), and Cancel. A pick takes the share off
// the phone's store and opens that talk (the address becomes '#/share?talk=<key>', so a reopen finds him in it) with the pictures waiting in its composer
// and the words in its field, NOT sent. The talk is the Talk sheet over its own scope (src/share/ShareTalk.tsx).
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useId, useState } from 'react';
import { dropShares, listRecentTalks, waitingShare, type RecentTalk, type ShareRow } from '../data/repositories';
import { navigate, replaceHash, useAddress } from '../nav/route';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { sharedContentOf, type SharedContent } from './shared';
import { TalkHost } from './ShareTalk';
import { useTalkScope } from './talkScope';
import { describeShare, shareTalkHash } from './shareText';
import { dateText, newTalkRef, placeOf, talkLabel, timeAgo } from './talkPlace';

const paramsOf = (hash: string): URLSearchParams => new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '');

const goHome = (): void => navigate('home', { replace: true });

const ACTION = 'flex min-h-14 w-full flex-col justify-center rounded-xl border px-4 py-2 text-left active:bg-line';

/** The sheet that asks where the share goes. */
function ShareChooser({ row, talks, onPick, onCancel }: { row: ShareRow; talks: RecentTalk[]; onPick: (ref: string) => void; onCancel: () => void }) {
  const titleId = useId();
  const [choosing, setChoosing] = useState(false);
  const { drag, handle } = useSheetDrag(onCancel);
  useEscapeToClose(onCancel);
  useSheetBack(onCancel);
  const newest: RecentTalk | undefined = talks[0];
  const [now] = useState(() => Date.now());
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onCancel} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 id={titleId} className="min-w-0 flex-1 truncate text-xl font-semibold">
              Share to Lampas
            </h2>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain border-t border-line px-4 pt-3 pb-[calc(1rem+var(--lp-end-inset))]">
          <p data-share-what className="text-base text-muted">
            {describeShare(row)} from another app. Where should they go?
          </p>
          {newest ? (
            <button type="button" ref={focusOnMount} data-share-continue onClick={() => onPick(newest.ref)} className={`${ACTION} border-accent bg-accent text-accent-fg`}>
              <span className="text-lg font-semibold">{`Continue: ${talkLabel(newest.ref)} · ${timeAgo(newest.lastWhen, now)}`}</span>
            </button>
          ) : null}
          <button type="button" ref={newest ? undefined : focusOnMount} onClick={() => onPick(newTalkRef())} className={`${ACTION} border-line bg-surface`}>
            <span className="text-lg font-semibold">New talk</span>
          </button>
          {talks.length > 0 ? (
            <button type="button" aria-expanded={choosing} onClick={() => setChoosing((open) => !open)} className={`${ACTION} border-line bg-surface`}>
              <span className="text-lg font-semibold">Choose a talk</span>
            </button>
          ) : null}
          {choosing ? (
            <ul aria-label="Recent talks" className="space-y-2">
              {talks.map((talk) => (
                <li key={talk.ref}>
                  <button type="button" data-recent-talk={talk.ref} onClick={() => onPick(talk.ref)} className={`${ACTION} border-line bg-surface`}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-lg font-medium">{talkLabel(talk.ref)}</span>{' '}
                      <span className="shrink-0 text-sm text-muted">{dateText(talk.lastWhen)}</span>
                    </span>{' '}
                    <span className="line-clamp-2 break-words text-base text-muted">{talk.firstQuestion}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" onClick={onCancel} className="min-h-12 w-full rounded-xl px-4 text-lg font-medium text-accent">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** The Share screen (#/share): the sheet that places a share, then the talk it was placed in. */
export function ShareScreen() {
  const address = useAddress();
  const params = paramsOf(address);
  const talk = params.get('talk');
  const shareId = params.get('s') ?? undefined;
  // undefined while the share is being read, null when nothing waits
  const [row, setRow] = useState<ShareRow | null | undefined>(undefined);
  // what was picked up from the share, until the talk is closed
  const [content, setContent] = useState<SharedContent | undefined>(undefined);
  useEffect(() => {
    if (talk) return;
    let current = true;
    void waitingShare(shareId).then((found) => current && setRow(found ?? null));
    return () => {
      current = false;
    };
  }, [talk, shareId]);
  // A share that is gone (Cancel, a pick, or a reopen long after) leaves nothing to place: Home.
  useEffect(() => {
    if ((!talk && row === null) || (talk && !placeOf(talk))) goHome();
  }, [talk, row]);
  // The talks he can place it in, read before the sheet is drawn so that what a tap lands on does not change under his thumb.
  const talks = useLiveQuery(() => listRecentTalks().then((all) => all.filter((t) => placeOf(t.ref) !== null)), []);
  const cancel = useCallback(() => {
    void dropShares().then(goHome);
  }, []);
  const pick = useCallback(
    (ref: string) => {
      if (!row) return;
      setContent(sharedContentOf(row));
      void dropShares().then(() => replaceHash(shareTalkHash(ref)));
    },
    [row],
  );
  const scope = useTalkScope(talk);
  const failed = scope?.status === 'failed' ? scope : null;
  // The chooser stays up while the talk's chapter is fetched, and the talk takes its place in one commit.
  const chooser = !failed && scope?.status !== 'ready' && row && talks ? <ShareChooser row={row} talks={talks} onPick={pick} onCancel={cancel} /> : null;
  return (
    <main data-share-screen className="flex min-h-0 flex-1 items-center justify-center bg-canvas p-6">
      {scope?.status === 'ready' && talk ? <TalkHost scope={scope.scope} talkRef={talk} book={scope.book} chapter={scope.chapter} shared={content} onClose={goHome} /> : null}
      {failed ? (
        <div role="alert" className="max-w-sm text-center">
          <p className="text-lg">{`${failed.title} is not on this phone yet, and you are offline.`}</p>
          <button type="button" onClick={failed.retry} className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg">
            Try again
          </button>
          <button type="button" ref={focusOnMount} onClick={goHome} className="mt-3 block min-h-12 w-full rounded-xl border border-line text-lg font-medium">
            Close
          </button>
        </div>
      ) : null}
      {chooser}
    </main>
  );
}
