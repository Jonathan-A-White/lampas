// src/reader/Tap.tsx — a word he can tap in the Reader's text (moved as is from VerseText.tsx, mw-9ji6ek0.15: the words inside a variant's brace are the same Tap).
import type { MouseEvent, ReactNode } from 'react';
import { NO_SELECT, useLongPress } from '../ui/longPress';
// 44 px (--lp-tap) minus 1 em, halved, top and bottom. Every face's content area is taller than 1 em (Gentium Plus
// about 1.11 em, a phone's sans about 1.1 em), so an inline word is never under 44 px whatever the font, and the line
// box stays --lp-tap tall, so the spare pixels cost no layout.
export const TAP_PAD = 'py-[calc((var(--lp-tap)-1em)/2)]';

/** A word he can tap: a span with role button and no chrome. The caller pads it to a 44 px tap height (an inline box
 * is as tall as its font's content area, so the padding is 44 px minus that, which differs by face). The trailing
 * space is inside so the gap between two words is tappable too. It has no horizontal padding: the gap between two words is that one space (mw-5r3p30.127). A finger held on it for half a second (`onLongPress`)
 * is a press, not a tap: the click that follows is dropped, and so is one after the finger wandered over 10 px
 * (src/ui/longPress.ts). The word never selects text and never raises the phone's callout menu, so the hold is free for the press. */
export function Tap({ onTap, onLongPress, still, lang, dir, className, children, ...data }: {
  /** a tap by touch or mouse gives its click: where on the word the finger was; the keyboard's Enter gives none */
  onTap: (e?: MouseEvent<HTMLElement>) => void;
  onLongPress: () => void;
  /** read only (a verse on a card): a plain span, not a button */
  still?: boolean;
  lang?: string;
  /** the direction the word is isolated in: an Old Testament weave puts English chunks (ltr) and Hebrew ones (rtl) in one row, each its own way round */
  dir?: 'ltr' | 'rtl';
  'data-lang'?: string;
  className?: string;
  children: ReactNode;
  'data-chunk'?: string;
  'data-woven'?: string;
  'data-learning'?: string;
  'data-word'?: string;
  'data-hint'?: string;
  'data-marked'?: string;
  'data-variant'?: string;
  'data-brace-word'?: string;
}) {
  const press = useLongPress((e) => onTap(e as MouseEvent<HTMLElement>), onLongPress);
  if (still) {
    return (
      <>
        <span lang={lang} dir={dir} {...data} className={className}>
          {children}
        </span>{' '}
      </>
    );
  }
  // A word with a direction of its own is a bidi isolate and its trailing space stands outside it: inside, the space would sit on the isolate's own end, which is the side of the previous neighbour
  // for a left-to-right chunk and of the next for a right-to-left one, and the gaps in a row of both would fall unevenly.
  const word = (
    <span
      role="button"
      tabIndex={0}
      lang={lang}
      dir={dir}
      {...data}
      {...press}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`cursor-pointer ${NO_SELECT} rounded active:bg-line ${className ?? ''}`}
    >
      {children}
      {dir ? null : ' '}
    </span>
  );
  return dir ? (
    <>
      {word}{' '}
    </>
  ) : (
    word
  );
}
