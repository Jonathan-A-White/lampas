// src/ui/HearAnyWord.tsx — a long press on ANY word of prose says it aloud in its own language (mw-5r3p30.124), mounted once in App: the tutor's
// answers, the sheets, About, Settings, Study way. It listens on the document; a press of 500 ms under 10 px of movement (src/ui/longPress.ts's
// timings) finds the word under the finger (src/ui/wordAt.ts), says it with speakWord and marks it while it speaks. Whatever has a long press of its own
// keeps it: buttons (the Reader's words, the Words list, the verse numbers), links, fields and the hold bars are skipped; a button that only holds text
// says so with data-hear-word (the Hebrew word of an answer). The click that ends a spoken press is dropped, so a tap handler round the prose
// (a tap on an answer stops its reading) does not cut the word off.
import { useEffect, useState } from 'react';
import { publish } from '../events/bus';
import { hasVoice, noVoiceHelp, speakWord, watchWordEnd } from '../speech/greek';
import { pauseReading } from '../speech/readAloud';
import { LONG_PRESS_MS, LONG_PRESS_SLOP_PX } from './longPress';
import { wordAtPoint } from './wordAt';

/** What has a press of its own, or takes typing: the app-wide long press leaves it alone. */
const OWN_PRESS = 'button, a, input, textarea, select, label, summary, [role="button"], [role="slider"], [contenteditable="true"], [data-hold-bar]';
/** Where a notice stays on screen. */
const NOTICE_MS = 4000;
/** The longest a word stays marked if the phone never reports its speech ended. */
const MARK_MAX_MS = 8000;
/** The name of the page highlight (src/index.css ::highlight). */
const HIGHLIGHT = 'hear-word';

interface HighlightApi {
  highlights?: Map<string, unknown>;
}

/** Marks the range while the word is spoken (the CSS Custom Highlight API; a browser without it just does not mark). */
function mark(range: Range): void {
  const registry = (globalThis as unknown as { CSS?: HighlightApi }).CSS?.highlights;
  const Highlight = (globalThis as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!registry || !Highlight) return;
  registry.set(HIGHLIGHT, new Highlight(range));
  let off = () => {};
  const clear = () => {
    off();
    clearTimeout(timer);
    registry.delete(HIGHLIGHT);
  };
  const timer = setTimeout(clear, MARK_MAX_MS);
  off = watchWordEnd(clear);
}

/** Whether a press that begins on `target` is the page's to handle: not on a control with a press of its own. */
function isProse(target: EventTarget | null): target is Element {
  if (!(target instanceof Element)) return false;
  const owner = target.closest(OWN_PRESS);
  return owner === null || owner.hasAttribute('data-hear-word');
}

export function HearAnyWord() {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let from = { x: 0, y: 0 };
    // the press that has just spoken: its click is dropped
    let spoke = false;
    const cancel = () => clearTimeout(timer);
    const down = (e: PointerEvent) => {
      cancel();
      spoke = false;
      if (e.button !== 0 || !isProse(e.target)) return;
      const target = e.target;
      from = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => {
        const hit = wordAtPoint(from.x, from.y, target);
        if (!hit) return;
        spoke = true;
        navigator.vibrate?.(10);
        window.getSelection()?.removeAllRanges();
        pauseReading();
        if (hit.language !== 'english' && hasVoice(hit.language) === false) {
          setNotice(noVoiceHelp(hit.language));
          return;
        }
        if (speakWord(hit.word, hit.language)) {
          publish({ kind: 'word-spoken', text: hit.word, language: hit.language, verse: null });
          mark(hit.range);
        }
      }, LONG_PRESS_MS);
    };
    const move = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > LONG_PRESS_SLOP_PX) cancel();
    };
    const click = (e: MouseEvent) => {
      if (!spoke) return;
      spoke = false;
      e.preventDefault();
      e.stopPropagation();
    };
    // the phone's menu on a held word (a field and a link keep theirs)
    const menu = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('input, textarea, a, [contenteditable="true"]')) e.preventDefault();
    };
    const forget = () => (spoke = false);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', cancel, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('scroll', cancel, true);
    document.addEventListener('click', click, true);
    document.addEventListener('contextmenu', menu, true);
    document.addEventListener('keydown', forget, true);
    return () => {
      cancel();
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', cancel, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('scroll', cancel, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('contextmenu', menu, true);
      document.removeEventListener('keydown', forget, true);
    };
  }, []);
  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  return notice === null ? null : (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--lp-bar-inset)+5rem)] z-30 mx-auto max-w-sm rounded-xl border border-line bg-surface px-4 py-3 text-center text-base shadow-lg"
    >
      {notice}
    </div>
  );
}
