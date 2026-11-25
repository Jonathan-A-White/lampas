// src/sermons/SermonsSheet.tsx — the Sermons sheet (mw-qtu3zvz.2, docs/sermons.md): 'Sermons for Romans 5:8' (a verse), 'Sermons for Romans 5:1-11' (a passage) or 'Sermons for Romans 5', the place's sermons grouped
// as 'On this verse' ('On these verses') and 'In this chapter' (a group is absent when empty), each row 44 px with the title and, under it, the preacher (the source's `by` where there is none), the date and where it opens. A row is a plain link
// to the sermon where it lives; nothing is fetched until one is tapped, and offline the rows stay and the second line says 'Needs the internet'. openSermons(place) opens it; <SermonsHost /> (mounted once in App) draws it.
// After 'In this chapter' comes one row, 'Martyn Lloyd-Jones (MLJ Trust)', a live link to the Trust's own sermon search for the chapter (mw-qtu3zvz.280.17, docs/sermons.md 'The MLJ Trust row').
// After them, 'In Logos' lists his sermon books that are On at the place, by name, one link each, while Logos is On (mw-qtu3zvz.3, docs/sermons.md 'In Logos'; switched in Settings > Study resources > Sermons > Sermon sources, mw-qtu3zvz.92).
// Online (mw-qtu3zvz.5, docs/sermons.md 'When online'): the sheet opens on the bundled rows, asks the sermon index service and says 'Latest from the index · N new' (or 'Offline: the bundled index') under the title;
// a search field answers from the service alone ('Found'). Under the title of a verse or a passage a 'Themes' line names the topics that carry it, and after 'In this chapter' come the sermons 'On <topic>' that share a topic with it (mw-qtu3zvz.4, docs/sermons.md 'The themes').
import { useEffect, useRef, useState, type MouseEvent, type MutableRefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { placeName } from '../maps/placeName';
import { armFallback } from '../resources/openApp';
import { DialogAskTutor } from '../AskTutor';
import { listFact, useSheetTalk, type SheetTalk } from '../tutor/sheetTalk';
import { pushSheetStep, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { useOnline } from '../ui/online';
import { hideTheme, sourceOf as themeSourceOf } from '../themes';
import { isHidden } from '../themes/hidden';
import { sermonsServiceKnown } from '../services/sermons';
import { useAiAllowed } from '../gate/licenceContext';
import { AskForPreacher } from './AskForPreacher';
import { sourceOf } from './index';
import { refText } from './forTutor';
import { linkRowOf, linkRowOfHit, openedRow, type LinkRow } from './merge';
import type { ArchiveRow } from './sources/logos';
import { plainDate } from './plainDate';
import { closeSermons, useOpenSermons } from './openSermons';
import { openSermon, videoOfRow } from './player';
import { creditAddress, opensNewTab, OpenWebContext, useOpenWebIn, useReadsAloud, useRowHref, useWebHref } from './openWeb';
import { MLJ_TITLE, mljSearchUrl } from './mljLink';
import { openSermonText } from './sermonText';
import { topicHeading } from './topicHeading';
import type { SameTheme, SermonPlace, SermonRow, ThemeRow } from './types';
import { rankHits, type FoundRankContext } from './foundRank';
import { useArchives, useLatest, usePericope, useServiceSearch, useSermons, useThemeSermons } from './useSermons';
import { useHiddenThemes, useSameTheme, useThemeChips, useThemes, type ThemeChip } from './useThemes';

const ROW = 'flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-4 py-2 text-left text-base font-medium text-accent active:bg-line';
/** The second line of a row, in two parts: the preacher (else the source's `by`, the church, where the preacher is unknown: mw-qtu3zvz.89) and the date, then where it opens (a web page needs the internet while the phone is offline). The phrase is kept whole on a line (mw-qtu3zvz.48). */
function metaOf(row: LinkRow, online: boolean, by?: string, reads = false): { lead: string; opens: string } {
  const opens = row.opensIn === 'logos' ? 'Opens in Logos' : !online ? 'Needs the internet' : videoOfRow(row) ? 'Plays here' : reads ? 'Read aloud here' : 'Opens on the web';
  const lead = [row.preacher ? row.preacher : by, row.date === undefined ? undefined : plainDate(row.date)].filter((p) => p !== undefined && p !== '').join(' · ');
  return { lead: lead === '' ? '' : `${lead} · `, opens };
}

/** The second line of a row: the lead wraps where it must, the phrase of where it opens moves to the next line as a unit (mw-qtu3zvz.48). */
function MetaLine({ row, online, by, reads }: { row: LinkRow; online: boolean; by?: string; reads: boolean }) {
  const { lead, opens } = metaOf(row, online, by, reads);
  return (
    <span data-sermon-meta className="block break-words text-sm font-normal text-muted">
      {lead}
      <span data-sermon-opens className="whitespace-nowrap">
        {opens}
      </span>
    </span>
  );
}

/** The line under a row that came in by the sermon notes (mw-qtu3zvz.59.2): where the sermon was preached, where the service gave a preaching text. */
const whyOf = (row: Pick<ThemeRow, 'ref'>): string => (row.ref ? `From the sermon notes · preached on ${refText(row.ref)}` : 'From the sermon notes');

function Row({ row: given, online, why }: { row: LinkRow; online: boolean; why?: string }) {
  // one link a row: the Subsplash address where the row has one, else its url (mw-qtu3zvz.49.2)
  const row = openedRow(given);
  const { fallback } = row.open;
  // the Firefox intent when he chose Firefox on Android (openWeb.ts); a Logos row's link is never turned
  const href = useRowHref()(row);
  // a video plays here, in the player sheet (mw-qtu3zvz.83); its link stays for a long press and for a page that cannot play it
  const plays = videoOfRow(row) !== undefined;
  // a text sermon of a source the index serves the words of is read aloud in Lampas's own sheet under 'Lampas, read aloud' (mw-ecpivg5.2); its link stays for a long press, and the sheet opens it on the web if it cannot get the words
  const reads = useReadsAloud()(row);
  const onClick = plays
    ? (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        openSermon(row);
      }
    : reads
      ? (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          openSermonText(row);
        }
    : fallback
      ? () => armFallback(fallback)
      : undefined;
  return (
    <a
      data-sermon-row
      {...(plays ? { 'data-sermon-plays': '' } : reads ? { 'data-sermon-reads': '' } : {})}
      href={href}
      data-fallback={fallback}
      onClick={onClick}
      {...(opensNewTab(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={ROW}
    >
      <span className="min-w-0 flex-1">
        <span data-sermon-title className="block break-words">
          {row.title}
        </span>
        <MetaLine row={row} online={online} by={sourceOf(row)?.by} reads={reads} />
        {why === undefined ? null : (
          <span data-sermon-why className="block break-words text-sm font-normal text-muted">
            {why}
          </span>
        )}
      </span>
      <span aria-hidden="true">{plays || reads ? '▶' : '↗'}</span>
    </a>
  );
}

/** The rows with a sermon that is listed twice (the same source and id) once, the first kept: a list is keyed by them (mw-qtu3zvz.252). */
function once<T extends { source: string; id: string }>(rows: ReadonlyArray<T>): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.source}:${row.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function Group({ title, rows, online, part }: { title: string; rows: SermonRow[]; online: boolean; part: 'here' | 'chapter' }) {
  if (rows.length === 0) return null;
  return (
    <div role="group" aria-label={title} data-sermons-part={part} className="pb-3">
      <h3 className="pb-1 text-base font-semibold">{title}</h3>
      <div className="flex flex-col gap-2">
        {once(rows).map((row) => (
          <Row key={`${row.source}:${row.id}`} row={row} online={online} />
        ))}
      </div>
    </div>
  );
}

/** The MLJ Trust row (mw-qtu3zvz.280.17, docs/sermons.md 'The MLJ Trust row'): one 44 px link in every chapter's list to the Trust's own sermon search for the chapter, built from the book and chapter alone; nothing of the Trust's is fetched. */
function MljRow({ place, online }: { place: SermonPlace; online: boolean }) {
  const href = useWebHref()(mljSearchUrl(place));
  return (
    <div role="group" aria-label="Martyn Lloyd-Jones" data-sermons-part="mlj" className="pb-3">
      <a data-mlj-row href={href} {...(opensNewTab(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={ROW}>
        <span className="min-w-0 flex-1">
          <span data-sermon-title className="block break-words">
            {MLJ_TITLE}
          </span>
          <span data-sermon-meta className="block break-words text-sm font-normal text-muted">
            {`The Trust's sermons on ${placeName({ book: place.book, chapter: place.chapter })} · `}
            <span data-sermon-opens className="whitespace-nowrap">
              {online ? 'Opens on the web' : 'Needs the internet'}
            </span>
          </span>
        </span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

/** One archive of his shelf: a plain link into Logos at the place, with the ref.ly address armed as its fallback; nothing is fetched. */
function Archive({ row }: { row: ArchiveRow }) {
  const { url, fallback } = row.open;
  return (
    <a data-archive-row href={url} data-fallback={fallback} onClick={() => armFallback(fallback)} className={ROW}>
      <span className="min-w-0 flex-1">
        <span data-sermon-title className="block break-words">
          {row.title}
        </span>
        <span data-sermon-meta className="block break-words text-sm font-normal text-muted">
          Opens in Logos
        </span>
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

/** 'In Logos': a row for each sermon book that is On in the list of sermon sources, by name; absent when there are none (and while Logos is Off). */
function InLogos({ rows }: { rows: ArchiveRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div role="group" aria-label="In Logos" data-sermons-part="logos" className="pb-3">
      <h3 className="pb-1 text-base font-semibold">In Logos</h3>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <Archive key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

/** How many themes the Themes line shows before 'More' (mw-qtu3zvz.81): four whole chips keep it to about a third of the sheet. */
export const THEMES_SHOWN = 4;

/**
 * The Themes line under the title: the themes of the verse that have sermons in his turned-on sources (useThemeChips), each a button that lists them (mw-qtu3zvz.81), a name once however many lists give it. The chips wrap whole; past
 * THEMES_SHOWN a 'More' button shows the rest, and the line never grows past a third of the sheet (it scrolls inside its own box).
 */
function ThemesLine({ chips, onOpen }: { chips: ThemeChip[]; onOpen: (chip: ThemeChip) => void }) {
  const [all, setAll] = useState(false);
  if (chips.length === 0) return null;
  const shown = all ? chips : chips.slice(0, THEMES_SHOWN);
  return (
    <div data-sermons-themes role="group" aria-label="Themes" className="max-h-[30dvh] overflow-y-auto overscroll-contain pt-1 text-sm">
      <p className="pb-1 font-semibold">Themes</p>
      <div className="flex flex-wrap gap-2">
        {shown.map((chip) => (
          <button key={chip.text} type="button" data-theme-chip onClick={() => onOpen(chip)} className="min-h-11 max-w-full rounded-xl border border-line px-3 py-1 text-left text-sm font-medium text-accent active:bg-line">
            {chip.text}
          </button>
        ))}
        {chips.length > THEMES_SHOWN ? (
          <button type="button" data-themes-more aria-expanded={all} onClick={() => setAll(!all)} className="min-h-11 rounded-xl px-3 py-1 text-sm font-medium text-accent active:bg-line">
            {all ? 'Fewer' : 'More'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** One topic's sermons under its heading, 'On <topic>': the group of 'On the same theme' and of a theme opened from the Themes line. */
function TopicGroup({ id, label, rows, online }: { id: string; label: string; rows: ReadonlyArray<LinkRow & { notes?: true; ref?: ThemeRow['ref'] }>; online: boolean }) {
  return (
    <div role="group" aria-label={topicHeading(label)} data-theme-topic={id} className="pb-3">
      <h4 className="pb-1 text-sm font-semibold text-muted">{topicHeading(label)}</h4>
      <div className="flex flex-col gap-2">
        {once(rows).map((row) => (
          <Row key={`${row.source}:${row.id}`} row={row} online={online} why={row.notes ? whyOf(row) : undefined} />
        ))}
      </div>
    </div>
  );
}

/** What 'Hide this theme' says it did (mw-qtu3zvz.91): where the theme is brought back. */
export const HIDDEN_NOTICE = 'Hidden. Settings > Study resources > Themes brings it back.';

/** A theme of the Themes line opened: 'Hide this theme' (one tap, mw-qtu3zvz.91), then its sermons in the sources that are On, in the index's order (no ranking), under 'Back'. */
function ThemeView({ chip, online, onHide }: { chip: ThemeChip; online: boolean; onHide: () => void }) {
  return (
    <div data-sermons-part="theme-list" className="pb-3">
      <button type="button" data-hide-theme onClick={onHide} className="mb-2 min-h-11 rounded-xl border border-line px-3 py-1 text-sm font-medium text-accent active:bg-line">
        Hide this theme
      </button>
      <TopicGroup id={`${chip.sources[0]}:${chip.text}`} label={chip.label} rows={chip.rows} online={online} />
    </div>
  );
}

/** 'On the same theme': a group for each topic, headed 'On <topic>' in reader order (topicHeading: 'On Christ the Sinner's Friend', not the module's 'Sinner's Friend, Christ the'), then how many more there were beyond the cut. */
export function SameThemeGroups({ same, online }: { same: SameTheme<ThemeRow>; online: boolean }) {
  if (same.groups.length === 0) return null;
  return (
    <div role="group" aria-label="On the same theme" data-sermons-part="theme" className="pb-3">
      <h3 className="pb-1 text-base font-semibold">On the same theme</h3>
      {same.groups.map((group) => (
        <TopicGroup key={`${group.topic.source}:${group.topic.id}`} id={`${group.topic.source}:${group.topic.id}`} label={group.topic.label} rows={group.rows} online={online} />
      ))}
      {same.more > 0 ? (
        <p data-sermons-more className="text-sm text-muted">
          {`${same.more} more on these themes`}
        </p>
      ) : null}
    </div>
  );
}

/** The line under the title that says where the rows come from once the service has answered (or not): absent while it is asked and when there is no service. */
function LatestLine({ latest, online }: { latest: ReturnType<typeof useLatest>; online: boolean }) {
  const offline = latest.status === 'offline' || (!online && latest.status !== 'none');
  const text = offline ? 'Offline: the bundled index' : latest.status === 'latest' ? (latest.added > 0 ? `Latest from the index · ${latest.added} new` : 'Latest from the index') : null;
  if (text === null) return null;
  return (
    <p data-sermons-latest={offline ? 'offline' : 'latest'} role="status" className="pt-1 text-sm text-muted">
      {text}
    </p>
  );
}

const FIELD = 'min-h-11 w-full rounded-xl border border-line bg-surface px-4 text-base text-fg placeholder:text-muted disabled:opacity-60';

/** The search field at the head of the sheet: answered by the service alone, so it is greyed with 'Needs the internet' while the phone (or the service) cannot be reached. */
function SearchField({ query, onChange, offline }: { query: string; onChange: (value: string) => void; offline: boolean }) {
  return (
    <div className="pt-2">
      <input
        type="search"
        data-sermons-search
        aria-label="Search sermons and themes"
        placeholder={offline ? 'Needs the internet' : 'Search sermons and themes'}
        value={offline ? '' : query}
        disabled={offline}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD}
      />
    </div>
  );
}

/** A theme the search found, with the sermons it holds: tapping it lists them right under it, in this sheet. */
function ThemeHit({ source, id, title, rows, open, onToggle, online }: { source: string; id: string; title: string; rows: LinkRow[]; open: boolean; onToggle: () => void; online: boolean }) {
  return (
    <div data-found-theme={`${source}:${id}`}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={ROW}>
        <span className="min-w-0 flex-1">
          <span data-sermon-title className="block break-words">
            {title}
          </span>
          <span data-sermon-meta className="block break-words text-sm font-normal text-muted">
            {`Theme · ${rows.length === 1 ? '1 sermon' : `${rows.length} sermons`} · tap for its sermons`}
          </span>
        </span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 pt-2 pl-3">
          {once(rows).map((row) => (
            <Row key={`${row.source}:${row.id}`} row={row} online={online} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 'Found': the search's answer, sermons that open where they live and themes that list their sermons on a tap. A theme is offered only once its sermons are known and number one or more (mw-qtu3zvz.65, PROVISIONAL,
 * the Governor to confirm): one with none, or whose sermons could not be asked, is left out.
 */
function FoundGroup({ query, offline, online, rank }: { query: string; offline: boolean; online: boolean; rank: Omit<FoundRankContext, 'pericope'> }) {
  const found = useServiceSearch(query, !offline);
  const [open, setOpen] = useState<string | null>(null);
  const pericope = usePericope(rank.place, found.status !== 'idle');
  // mw-qtu3zvz.66: what is on the open verse, its pericope, its chapter or a theme of it comes first (PROVISIONAL, the Governor to confirm); the rest stand in the service's order
  // a theme he has hidden (mw-qtu3zvz.91) is not offered, whatever the search found; until the hidden set is read no theme is
  const hidden = useHiddenThemes();
  const hits = found.status === 'found' ? rankHits(found.hits, { ...rank, pericope }).filter((hit) => hit.kind !== 'theme' || (hidden !== undefined && !isHidden(hit.title, hidden))) : [];
  const lists = useThemeSermons(hits.flatMap((hit) => (hit.kind === 'theme' ? [`${hit.source}:${hit.id}`] : [])));
  if (found.status === 'idle') return null;
  const shown = hits.flatMap((hit) => {
    const key = `${hit.kind}:${hit.source}:${hit.id}`;
    if (hit.kind === 'theme') {
      const themeKey = `${hit.source}:${hit.id}`;
      const list = lists.get(themeKey);
      const rows = list?.status === 'found' ? list.rows.flatMap((row) => linkRowOf(row) ?? []) : [];
      return rows.length === 0 ? [] : [<ThemeHit key={key} source={hit.source} id={hit.id} title={hit.title} rows={rows} open={open === themeKey} onToggle={() => setOpen(open === themeKey ? null : themeKey)} online={online} />];
    }
    const row = linkRowOfHit(hit);
    return row ? [<Row key={key} row={row} online={online} />] : [];
  });
  const themesAsking = hits.some((hit) => hit.kind === 'theme' && lists.get(`${hit.source}:${hit.id}`)?.status === 'asking');
  return (
    <div role="group" aria-label="Found" data-sermons-part="found" className="pb-3">
      <h3 className="pb-1 text-base font-semibold">Found</h3>
      {found.status === 'searching' ? <p className="text-sm text-muted">Searching…</p> : null}
      {found.status === 'failed' ? <p role="status" className="text-sm text-muted">Could not reach the sermon index.</p> : null}
      {found.status === 'found' && shown.length === 0 && !themesAsking ? <p role="status" className="text-sm text-muted">Nothing found.</p> : null}
      {found.status === 'found' && shown.length === 0 && themesAsking ? <p className="text-sm text-muted">Searching…</p> : null}
      {found.status === 'found' && shown.length > 0 ? <div className="flex flex-col gap-2">{shown}</div> : null}
    </div>
  );
}

/** 'Ask for a preacher' at the sheet's foot (mw-qtu3zvz.6): a 44 px row that opens the form which tells the makers whom the index lacks. It goes to the mill, so without a licence it is greyed and says 'Needs a licence'. */
function AskRow({ place }: { place: SermonPlace }) {
  const allowed = useAiAllowed();
  const [asking, setAsking] = useState(false);
  return (
    <div data-sermons-part="ask" className="pt-1">
      <button type="button" data-ask-preacher-row disabled={!allowed} onClick={() => setAsking(true)} className={`${ROW} disabled:opacity-50`}>
        <span className="min-w-0 flex-1">
          <span className="block break-words">Ask for a preacher</span>
          {allowed ? null : <span className="block text-sm font-normal text-muted">Needs a licence</span>}
        </span>
      </button>
      {asking ? <AskForPreacher place={place} onClose={() => setAsking(false)} /> : null}
    </div>
  );
}

/** The bottom sheet the Sermons sheet is drawn in: the backdrop, the handle and Close, the heading, the scroll box. It takes the phone's Back, Escape and a swipe down on the handle as every sheet does. */
function SermonsFrame({ label, onClose, children, heading, talk, stepRef }: { label: string; onClose: () => void; children: ReactNode; heading: ReactNode; talk: SheetTalk; stepRef: MutableRefObject<(undo: () => void) => void> }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, true);
  const levelNow = useSheetBack(onClose);
  // a move inside the sheet (a theme opened) is one Back step: the phone's Back puts the sheet as it was (mw-qtu3zvz.81)
  useEffect(() => {
    stepRef.current = (undo) => pushSheetStep(undo, levelNow());
  }, [stepRef, levelNow]);
  // z-50, over the Talk sheet (z-10): the ? asks about the passage, in a Talk drawn inside this layer so it stands in front (mw-5r3p30.1122)
  const ask = useSheetTalk(talk);
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
      <DialogAskTutor {...ask} />
    </div>,
    document.body,
  );
}

export function SermonsSheet({ place, onClose }: { place: SermonPlace; onClose: () => void }) {
  const openWeb = useOpenWebIn();
  return (
    <OpenWebContext.Provider value={openWeb}>
      <SermonsSheetBody place={place} onClose={onClose} />
    </OpenWebContext.Provider>
  );
}

/** A source's name, linked to its home page, or for a Logos archive to the archive itself; it opens where the sermons do (openWeb.ts). */
function Credit({ source }: { source: { name: string; homepage: string; credit: string; id: string; resources?: readonly string[] } }) {
  const href = useWebHref()(creditAddress(source));
  return (
    <p data-sermon-credit className="pb-2 text-sm text-muted">
      <a href={href} {...(opensNewTab(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="underline">
        {source.name}
      </a>
      {`: ${source.credit}`}
    </p>
  );
}

function SermonsSheetBody({ place, onClose }: { place: SermonPlace; onClose: () => void }) {
  const bundled = useSermons(place);
  // the service's newest rows are merged in once they come; the bundled rows stand until then, and when the service cannot be reached
  const latest = useLatest(place, bundled);
  const found = latest.status === 'latest' ? latest.found : bundled;
  const [query, setQuery] = useState('');
  const themes = useThemes(place);
  const same = useSameTheme(place, found, latest.status === 'latest');
  const archives = useArchives(place);
  const online = useOnline();
  const serviceKnown = sermonsServiceKnown();
  const offline = !online || latest.status === 'offline';
  const title = `Sermons for ${placeName(place)}`;
  const passage = place.from !== undefined && place.to !== undefined && place.to !== place.from;
  // the credit of each source that answered a row, once, in the order its rows come
  const rows = found ? [...found.here, ...found.chapter] : [];
  // a source that gave a row only on the same theme has its credit too
  const sameListed = same ? same.groups.flatMap((group) => group.rows) : [];
  const sources = [...new Set([...rows, ...sameListed].map((row) => row.source))].flatMap((id) => sourceOf({ source: id }) ?? []);
  // the Themes line: only the themes that have sermons in his On sources (mw-qtu3zvz.81); the service's answer may add some
  const chips = useThemeChips(themes, latest.status === 'latest');
  // and of each theme source that named a topic of the line (one with a sermon) or a group, once
  const named = [...new Set([...(chips ?? []).flatMap((c) => c.sources), ...(same?.groups ?? []).map((group) => group.topic.source)])].flatMap((id) => themeSourceOf({ source: id }) ?? []);
  const sameRows = same ? same.groups.reduce((n, group) => n + group.rows.length, 0) : 0;
  const [opened, setOpened] = useState<string | null>(null);
  // what Hide this theme did, said on the sheet it goes back to (mw-qtu3zvz.91)
  const [notice, setNotice] = useState<string | null>(null);
  const chip = chips?.find((c) => c.text === opened);
  const step = useRef<(undo: () => void) => void>(() => undefined);
  const openChip = (c: ThemeChip) => {
    step.current(() => setOpened(null));
    setNotice(null);
    setOpened(c.text);
  };
  // one tap: the theme goes (every list that names it, themesFor), the sheet says so and goes back to where it was
  const hideChip = (c: ThemeChip) => {
    void hideTheme(c.label).then(() => {
      setNotice(HIDDEN_NOTICE);
      window.history.back();
    });
  };
  const themeCredits = chip ? chip.sources.flatMap((id) => themeSourceOf({ source: id }) ?? []) : [];
  const chipSources = chip ? [...new Set(chip.rows.map((row) => row.source))].flatMap((id) => sourceOf({ source: id }) ?? []) : [];
  return (
    <SermonsFrame
      label={title}
      onClose={onClose}
      stepRef={step}
      talk={{
        name: 'Sermons',
        facts: [{ label: 'Passage', value: placeName(place) }, listFact('Sermons listed', rows.map((row) => row.title))],
        suggestions: ['Which of these sermons would help me most with this passage?', 'What do these sermons say about this passage?'],
      }}
      heading={
        <>
          <h2 className="text-xl font-semibold" data-themes-read={chips === undefined ? undefined : ''}>
            {title}
          </h2>
          {chip ? (
            <button type="button" data-theme-back onClick={() => window.history.back()} className="min-h-11 rounded-lg pr-3 text-base font-medium text-accent">
              ‹ Back to the sheet
            </button>
          ) : (
            <>
              <LatestLine latest={latest} online={online} />
              {notice ? (
                <p data-theme-hidden-notice role="status" className="pt-1 text-sm text-muted">
                  {notice}
                </p>
              ) : null}
              {chips ? <ThemesLine chips={chips} onOpen={openChip} /> : null}
              {serviceKnown ? <SearchField query={query} onChange={setQuery} offline={offline} /> : null}
            </>
          )}
        </>
      }
    >
      {chip ? (
        <>
          <ThemeView chip={chip} online={online} onHide={() => hideChip(chip)} />
          {[...chipSources, ...themeCredits].map((source) => (
            <Credit key={source.id} source={source} />
          ))}
        </>
      ) : (
        <>
        {serviceKnown ? <FoundGroup query={query} offline={offline} online={online} rank={{ place, themes: new Set((themes ?? []).map((theme) => `${theme.source}:${theme.topic}`)), themeSermons: new Set(sameListed.map((row) => `${row.source}:${row.id}`)) }} /> : null}
        {found && rows.length === 0 && same && sameRows === 0 ? <p role="status" className="py-2 text-base text-muted">No sermons here.</p> : null}
        {found ? <Group title={passage ? 'On these verses' : 'On this verse'} rows={found.here} online={online} part="here" /> : null}
        {found ? <Group title="In this chapter" rows={found.chapter} online={online} part="chapter" /> : null}
        <MljRow place={place} online={online} />
        {same ? <SameThemeGroups same={same} online={online} /> : null}
        {archives ? <InLogos rows={archives} /> : null}
        {[...sources, ...named].map((source) => (
          <Credit key={source.id} source={source} />
        ))}
        </>
      )}
      <AskRow place={place} />
    </SermonsFrame>
  );
}

/** Draws the sheet for the place openSermons was last called with; mounted once, in App. */
export function SermonsHost() {
  const place = useOpenSermons();
  return place ? <SermonsSheet key={placeName(place)} place={place} onClose={closeSermons} /> : null;
}
