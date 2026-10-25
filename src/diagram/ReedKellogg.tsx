// src/diagram/ReedKellogg.tsx — draws a sentence diagram's layout (layout.ts) as the classic Reed-Kellogg picture (mw-souyao.1). The lines are one SVG; every word is a
// button laid over it at the label's place (44 px tall, so a thumb hits it), its text the app's own face (the reading face for English, Gentium for Greek, tagged Greek as
// VerseText tags it). An understood word is text in parentheses, no button. The picture is as wide as its words make it and scrolls sideways in its own box
// (overflow-x-auto: src/reader/useChapterSwipe.ts skips a press inside a box that scrolls sideways, so a swipe along the diagram never turns the chapter); the type is never shrunk to fit.
// The SVG is the image (role img, named by the reference and the mode) and the buttons stand beside it, not in it: an image's children are presentational to a screen reader.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { langOf } from '../script/greekLang';
import { NO_SELECT } from '../ui/longPress';
import { LABEL_H, layoutDiagram, type LayoutLabel } from './layout';
import type { Diagram, DiagramMode, DiagramWords } from './types';

/** The room round a word that is still a tap on it. Less than half WORD_GAP, so two neighbours' targets never meet. */
const HIT_PAD = 4;
/** How much a character is worth before the face is known (the first paint), as a share of the font size. */
const ESTIMATE_EM = 0.6;
const ESTIMATE_PX = 20;

type Measure = (text: string) => number;
const estimate: Measure = (text) => text.length * ESTIMATE_EM * ESTIMATE_PX;

const MODE_NAME: Record<DiagramMode, string> = { english: 'English', greek: 'Greek' };

/** The width of text in the face of `probe` (a hidden span carrying the classes of the labels), by canvas; null where there is no canvas (jsdom). */
function measureIn(probe: HTMLElement): Measure | null {
  const context = document.createElement('canvas').getContext?.('2d') ?? null;
  if (!context) return null;
  const style = getComputedStyle(probe);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return (text) => context.measureText(text).width;
}

/** The words in the order of the verse (the order a screen reader and the Tab key take them in); the understood words, which are no buttons, after. */
const inReadingOrder = (labels: LayoutLabel[]): LayoutLabel[] => [...labels].sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity) || a.id - b.id);

export interface ReedKelloggProps {
  diagram: Diagram;
  words: DiagramWords;
  mode: DiagramMode;
  /** the verse, as the screen names it ('Colossians 3:1'): it names the picture */
  reference: string;
  /** a tap on word `index` of `words` */
  onWord: (index: number) => void;
  /** a label's width; the screen's own face by default (a test passes a fixed one, jsdom has no layout) */
  measure?: Measure;
}

export function ReedKellogg({ diagram, words, mode, reference, onWord, measure }: ReedKelloggProps) {
  const greek = mode === 'greek';
  const face = greek ? 'font-greek text-[length:var(--lp-greek-size)]' : 'font-sans text-[length:var(--lp-english-size)]';
  const probe = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<Measure | null>(null);
  // The face is read once the probe is on the page, before it is painted, and again when the web font has loaded (the labels' widths follow it).
  useLayoutEffect(() => {
    if (measure || !probe.current) return;
    const node = probe.current;
    const read = () => setMeasured(() => measureIn(node));
    read();
    let live = true;
    void document.fonts?.ready.then(() => live && read());
    return () => {
      live = false;
    };
  }, [measure, mode]);
  const width = measure ?? measured ?? estimate;
  const layout = useMemo(() => layoutDiagram(diagram, words, width), [diagram, words, width]);

  const label = (l: LayoutLabel) => {
    const place = { left: l.x - HIT_PAD, top: l.y - LABEL_H - 2, width: l.width + 2 * HIT_PAD, height: LABEL_H };
    const text = 'absolute flex items-center justify-center whitespace-nowrap leading-none text-fg';
    if (l.index === undefined) {
      return (
        <span key={l.id} data-implied="" {...langOf(greek)} style={place} className={`${text} ${face} text-muted`}>
          {l.text}
        </span>
      );
    }
    const index = l.index;
    return (
      <button key={l.id} type="button" data-word={String(index)} {...langOf(greek)} style={place} onClick={() => onWord(index)} className={`${text} ${face} ${NO_SELECT} cursor-pointer rounded active:bg-line`}>
        {l.text}
      </button>
    );
  };

  return (
    <div data-diagram="" className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        <svg
          role="img"
          aria-label={`Sentence diagram of ${reference}, ${MODE_NAME[mode]}`}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="absolute left-0 top-0 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          {layout.segments.map((s, i) => (
            <line key={i} data-kind={s.kind} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeDasharray={s.dotted ? '1 5' : undefined} />
          ))}
        </svg>
        {inReadingOrder(layout.labels).map(label)}
        <span ref={probe} aria-hidden="true" className={`pointer-events-none invisible absolute left-0 top-0 ${face}`}>
          Hg
        </span>
      </div>
    </div>
  );
}
