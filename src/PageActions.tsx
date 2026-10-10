// src/PageActions.tsx — Read aloud and Share in the header of a page of prose (About, My study way, the Preface; mw-5r3p30.128). The page marks each
// paragraph, heading or line worth reading with `data-read-block`. Read aloud hands them top to bottom to the one reading engine
// (src/speech/readAloud.ts, a block to a "verse", so the package's bar has Pause, Resume, Restart and Stop and keeps the sentence reached), each Greek
// or Hebrew stretch in its own voice (src/speech/pageRuns.ts), and marks the block being read with `data-reading` (src/index.css). Leaving the page
// stops the reading. Share hands the page's own link to the phone's share sheet or, where it has none, copies the link and says 'Link copied'.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LINK_ORIGIN } from './config';
import { pageRuns } from './speech/pageRuns';
import { getReading, startReading, stopReading, useReading, type PlanVerse } from './speech/readAloud';
import { copy } from './ui/clipboard';

/** The id a page's reading goes under (reading.answer): far below any stored answer's, so no Talk turn or verdict is taken for it. */
const PAGE_READING_ID = -2_000_000_000;

/** How long 'Link copied' stays. */
const COPIED_MS = 2500;

const BUTTON = 'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-accent active:bg-line';

const blocksNow = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-read-block]')];

/** The text a block shows, line by line: a line break ends a line, and anything marked `data-read-skip` (a footnote's number, a paragraph's own number) is left out. */
function linesOf(node: Node, lines: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) lines[lines.length - 1] += node.textContent ?? '';
  else if (node instanceof HTMLElement && node.hasAttribute('data-read-skip')) return;
  else if (node instanceof HTMLBRElement) lines.push('');
  else node.childNodes.forEach((child) => linesOf(child, lines));
}

/** What a block says when it is read or shared: its text on one line, without the dash that leads a quotation's credit, the numbers marked
 * `data-read-skip`, and a stop between lines (a quotation and its credit) so the voice pauses where the page breaks. */
const textOf = (el: HTMLElement): string => {
  const lines = [''];
  linesOf(el, lines);
  return lines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .reduce((said, line) => (!said ? line : /[.!?:;,…]["”’)]?$/.test(said) ? `${said} ${line}` : `${said}. ${line}`), '')
    .replace(/^[—–]\s*/, '');
};

const icon = (path: string): ReactNode => {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
};

// a speaker with sound waves; the share glyph is a square with an arrow out of it
const SPEAKER = 'M4 9v6h4l5 4V5L8 9H4Zm12 0a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12';
const SHARE = 'M12 15V4m0 0L8 8m4-4 4 4M5 12v7h14v-7';

/** `hash` is the page's own address ('#/about'), the link Share hands over; `title` is the page's name. Put `buttons` in the header's action and
 * `notice` under the header. */
export function usePageActions(hash: string, title: string): { buttons: ReactNode; notice: ReactNode } {
  const reading = useReading();
  const mine = reading.status !== 'idle' && reading.answer === PAGE_READING_ID;
  const url = `${LINK_ORIGIN}/${hash}`;
  const [said, setSaid] = useState<'idle' | 'copied' | 'by-hand'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // The block being read is marked, and kept in view.
  const marked = mine ? reading.verse : null;
  useEffect(() => {
    blocksNow().forEach((el, i) => {
      if (marked === i + 1) el.setAttribute('data-reading', '');
      else el.removeAttribute('data-reading');
    });
    if (marked !== null) blocksNow()[marked - 1]?.scrollIntoView?.({ block: 'nearest' });
  }, [marked]);

  // Leaving the page ends its reading, and only its own.
  useEffect(
    () => () => {
      if (getReading().answer === PAGE_READING_ID) stopReading();
    },
    [],
  );

  const readAloud = () => {
    if (mine) return stopReading();
    const plan: PlanVerse[] = blocksNow().map((el, i) => ({ n: i + 1, runs: pageRuns(textOf(el)) }));
    if (plan.length === 0) return;
    startReading({ chapter: 0, plan, from: 1, continuous: true, answer: PAGE_READING_ID });
  };

  const copyLink = () =>
    void copy(url).then((done) => {
      clearTimeout(timer.current);
      if (!done) return setSaid('by-hand');
      setSaid('copied');
      timer.current = setTimeout(() => setSaid('idle'), COPIED_MS);
    });

  const share = () => {
    if (typeof navigator.share !== 'function') return copyLink();
    const first = blocksNow()[0];
    void navigator.share({ title, text: first ? textOf(first) : title, url }).catch((error: unknown) => {
      // closing the share sheet is not a failure
      if (!(error instanceof DOMException && error.name === 'AbortError')) copyLink();
    });
  };

  const buttons = (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Read aloud" aria-pressed={mine} onClick={readAloud} className={BUTTON}>
        {icon(SPEAKER)}
      </button>
      <button type="button" aria-label="Share" onClick={share} className={BUTTON}>
        {icon(SHARE)}
      </button>
    </div>
  );
  const notice =
    said === 'copied' ? (
      <p role="status" className="shrink-0 px-4 py-1 text-center text-sm text-muted">
        Link copied
      </p>
    ) : said === 'by-hand' ? (
      <div className="shrink-0 px-4 py-1">
        <p role="status" className="text-sm text-muted">
          The phone would not copy the link. Copy it by hand:
        </p>
        <input
          type="text"
          readOnly
          aria-label="Link to copy"
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-base"
        />
      </div>
    ) : null;
  return { buttons, notice };
}
