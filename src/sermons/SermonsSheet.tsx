// src/sermons/SermonsSheet.tsx — the Sermons sheet (mw-qtu3zvz.2, docs/sermons.md): 'Sermons for Romans 5:8' (a verse), 'Sermons for Romans 5:1-11' (a passage) or 'Sermons for Romans 5', the place's sermons grouped
// as 'On this verse' ('On these verses') and 'In this chapter' (a group is absent when empty), each row 44 px with the title and, under it, the preacher, the date and where it opens. A row is a plain link
// to the sermon where it lives; nothing is fetched until one is tapped, and offline the rows stay and the second line says 'Needs the internet'. openSermons(place) opens it; <SermonsHost /> (mounted once in App) draws it.
// Under the title of a verse or a passage a 'Themes' line names the topics that carry it, and after 'In this chapter' come the sermons 'On <topic>' that share a topic with it (mw-qtu3zvz.4, docs/sermons.md 'The themes').
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { placeName } from '../maps/placeName';
import { armFallback } from '../resources/openApp';
import { useNoDoor } from '../tutor/door';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { useOnline } from '../ui/online';
import { sourceOf as themeSourceOf, type Theme } from '../themes';
import { sourceOf } from './index';
import { plainDate } from './plainDate';
import { closeSermons, useOpenSermons } from './openSermons';
import type { SameTheme, SermonPlace, SermonRow } from './types';
import { useSermons } from './useSermons';
import { useSameTheme, useThemes } from './useThemes';

const ROW = 'flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-4 py-2 text-left text-base font-medium text-accent active:bg-line';
/** The second line of a row: the preacher, the date, and where it opens (a web page needs the internet while the phone is offline). */
function metaOf(row: SermonRow, online: boolean): string {
  const opens = row.opensIn === 'logos' ? 'Opens in Logos' : online ? 'Opens on the web' : 'Needs the internet';
  return [row.preacher, row.date === undefined ? undefined : plainDate(row.date), opens].filter((p) => p !== undefined && p !== '').join(' · ');
}

function Row({ row, online }: { row: SermonRow; online: boolean }) {
  const { url, fallback } = row.open;
  return (
    <a
      data-sermon-row
      href={url}
      data-fallback={fallback}
      onClick={fallback ? () => armFallback(fallback) : undefined}
      {...(url.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={ROW}
    >
      <span className="min-w-0 flex-1">
        <span data-sermon-title className="block break-words">
          {row.title}
        </span>
        <span data-sermon-meta className="block break-words text-sm font-normal text-muted">
          {metaOf(row, online)}
        </span>
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function Group({ title, rows, online, part }: { title: string; rows: SermonRow[]; online: boolean; part: 'here' | 'chapter' }) {
  if (rows.length === 0) return null;
  return (
    <div role="group" aria-label={title} data-sermons-part={part} className="pb-3">
      <h3 className="pb-1 text-base font-semibold">{title}</h3>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <Row key={`${row.source}:${row.id}`} row={row} online={online} />
        ))}
      </div>
    </div>
  );
}

/** The Themes line under the title: the verse's topics as the module names them ('Atonement', 'Love-Hatred: Of God'), a name once however many lists give it. */
function ThemesLine({ themes }: { themes: Theme[] }) {
  const names = [...new Set(themes.map((theme) => theme.text))];
  if (names.length === 0) return null;
  return (
    <p data-sermons-themes className="max-h-[30dvh] overflow-y-auto overscroll-contain pt-1 text-sm text-muted">
      <span className="font-semibold text-fg">Themes</span> {names.join(' · ')}
    </p>
  );
}

/** 'On the same theme': a group for each topic, headed 'On <topic>', then how many more there were beyond the cut. */
function SameThemeGroups({ same, online }: { same: SameTheme; online: boolean }) {
  if (same.groups.length === 0) return null;
  return (
    <div role="group" aria-label="On the same theme" data-sermons-part="theme" className="pb-3">
      <h3 className="pb-1 text-base font-semibold">On the same theme</h3>
      {same.groups.map((group) => (
        <div key={`${group.topic.source}:${group.topic.id}`} role="group" aria-label={`On ${group.topic.label}`} data-theme-topic={`${group.topic.source}:${group.topic.id}`} className="pb-3">
          <h4 className="pb-1 text-sm font-semibold text-muted">{`On ${group.topic.label}`}</h4>
          <div className="flex flex-col gap-2">
            {group.rows.map((row) => (
              <Row key={`${row.source}:${row.id}`} row={row} online={online} />
            ))}
          </div>
        </div>
      ))}
      {same.more > 0 ? (
        <p data-sermons-more className="text-sm text-muted">
          {`${same.more} more on these themes`}
        </p>
      ) : null}
    </div>
  );
}

/** The bottom sheet the Sermons sheet is drawn in: the backdrop, the handle and Close, the heading, the scroll box. It takes the phone's Back, Escape and a swipe down on the handle as every sheet does. */
function SermonsFrame({ label, onClose, children, heading }: { label: string; onClose: () => void; children: ReactNode; heading: ReactNode }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, true);
  useSheetBack(onClose);
  // z-50, over the Talk sheet (z-10): nothing to ask about here, so no ? over it
  useNoDoor();
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="sermons-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-sermons-sheet
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex [--lp-panel-max:92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sermons-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Close
          </button>
        </div>
        <div className="shrink-0 px-4 pb-2">{heading}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(0.5rem+var(--lp-bar-inset))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function SermonsSheet({ place, onClose }: { place: SermonPlace; onClose: () => void }) {
  const found = useSermons(place);
  const themes = useThemes(place);
  const same = useSameTheme(place, found);
  const online = useOnline();
  const title = `Sermons for ${placeName(place)}`;
  const passage = place.from !== undefined && place.to !== undefined && place.to !== place.from;
  // the credit of each source that answered a row, once, in the order its rows come
  const rows = found ? [...found.here, ...found.chapter] : [];
  const sources = [...new Set(rows.map((row) => row.source))].flatMap((id) => sourceOf({ source: id }) ?? []);
  // and of each theme source that named a topic of the line or a group, once
  const named = [...new Set([...(themes ?? []).map((theme) => theme.source), ...(same?.groups ?? []).map((group) => group.topic.source)])].flatMap((id) => themeSourceOf({ source: id }) ?? []);
  const sameRows = same ? same.groups.reduce((n, group) => n + group.rows.length, 0) : 0;
  return (
    <SermonsFrame
      label={title}
      onClose={onClose}
      heading={
        <>
          <h2 className="text-xl font-semibold">{title}</h2>
          {themes ? <ThemesLine themes={themes} /> : null}
        </>
      }
    >
      {found && rows.length === 0 && same && sameRows === 0 ? <p role="status" className="py-2 text-base text-muted">No sermons here.</p> : null}
      {found ? <Group title={passage ? 'On these verses' : 'On this verse'} rows={found.here} online={online} part="here" /> : null}
      {found ? <Group title="In this chapter" rows={found.chapter} online={online} part="chapter" /> : null}
      {same ? <SameThemeGroups same={same} online={online} /> : null}
      {[...sources, ...named].map((source) => (
        <p key={source.id} data-sermon-credit className="pb-2 text-sm text-muted">
          <a href={source.homepage} target="_blank" rel="noopener noreferrer" className="underline">
            {source.name}
          </a>
          {`: ${source.credit}`}
        </p>
      ))}
    </SermonsFrame>
  );
}

/** Draws the sheet for the place openSermons was last called with; mounted once, in App. */
export function SermonsHost() {
  const place = useOpenSermons();
  return place ? <SermonsSheet key={placeName(place)} place={place} onClose={closeSermons} /> : null;
}
