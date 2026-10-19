// src/LadderGraph.tsx — the whole path (mw-foy5mb.5, #/path, PROVISIONAL): the grammar ladder drawn as a graph to look at, reached from the Goal screen.
// Each idea of ladder.ts is a node, each need an edge, laid out by depth (pathGraph.ts layoutPath: the ideas that need nothing at the top, an idea below
// all it needs). A node's colour is ideaState's (goalProgress.ts), the one reading of his levels Learn uses; the state is also written on the node, so
// colour is never the only sign. SVG, panned with one finger and zoomed with two (or the buttons: Pan, Zoom; focus on a node pans it into view); a tap on a node opens that idea's sheet. Nothing
// heavier until a path passes about 150 nodes (the ladder has 133).
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { Chapter, GreekWord } from './data/chapter';
import { ideaState, levelsOf, STATE_NAMES, type IdeaState } from './data/grammar/goalProgress';
import { ideaOf, LADDER_PATH } from './data/grammar/ladder';
import { layoutPath, NODE_H, type LaidOutNode } from './data/grammar/pathGraph';
import { listLevels } from './data/repositories';
import { IdeaSheet } from './IdeaSheet';
import { navigate } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { useReportScreen } from './tutor/screenContext';
import { WordSheet, type Lookup } from './WordSheet';

const MARGIN = 24;
const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;
/** How far a finger moves before a touch is a pan and no longer a tap. */
const TAP_SLOP = 8;
/** A pan button moves the picture by this part of the frame. */
const PAN_STEP = 0.4;
/** A focused node must lie this far (px) inside the frame, or focus pans it to the middle. */
const FOCUS_MARGIN = 8;
const ORDER: readonly IdeaState[] = ['solid', 'learning', 'next', 'notYet'];

// Three calm colours and the plain one: solid green, learning amber, next a dashed outline in the text colour, not yet quiet. Shape differs too (the dashes, the weight).
const PAINT: Record<IdeaState, { fill: string; stroke: string; dash?: string; width: number }> = {
  solid: { fill: 'color-mix(in srgb, var(--lp-good) 30%, var(--lp-surface))', stroke: 'var(--lp-good)', width: 2 },
  learning: { fill: 'color-mix(in srgb, var(--lp-accent) 32%, var(--lp-surface))', stroke: 'var(--lp-accent)', width: 2.5 },
  next: { fill: 'var(--lp-surface)', stroke: 'var(--lp-fg)', dash: '6 4', width: 2 },
  notYet: { fill: 'var(--lp-surface)', stroke: 'var(--lp-line)', width: 1.5 },
};

const ROUND = 'size-12 rounded-xl border border-line bg-surface text-2xl font-medium active:bg-line';
// the picture moves the other way to the view: 'Pan left' shows what lies to the left, so the picture slides right
const PANS = [
  { name: 'Pan up', arrow: '↑', dx: 0, dy: 1 },
  { name: 'Pan down', arrow: '↓', dx: 0, dy: -1 },
  { name: 'Pan left', arrow: '←', dx: 1, dy: 0 },
  { name: 'Pan right', arrow: '→', dx: -1, dy: 0 },
] as const;

interface View {
  x: number;
  y: number;
  k: number;
}

const clamp = (n: number, low: number, high: number): number => Math.min(high, Math.max(low, n));

/** A title cut over at most two lines of about this many letters. */
function titleLines(title: string, max = 16): string[] {
  const words = title.split(' ');
  const lines: string[] = [''];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last === '' || (last + ' ' + word).length <= max) lines[lines.length - 1] = last === '' ? word : `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length <= 2 ? lines : [lines[0], lines.slice(1).join(' ').slice(0, max - 1) + '…'];
}

/** The phone's text size as a multiple of the usual 16 px (2 at 200%): the root font size is what its Font size changes. The picture is drawn at this much more, so a
 * label, which is SVG text in the picture's own units, follows the phone's size as every rem does, and its node grows with it (mw-cwf538.7). */
const rootScale = (): number => {
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return px > 0 ? px / 16 : 1;
};

function useTextScale(): number {
  const [scale, setScale] = useState(rootScale);
  useEffect(() => {
    const measure = () => setScale(rootScale());
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return scale;
}

const curve = (from: LaidOutNode, to: LaidOutNode): string => {
  const x1 = from.x + from.width / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + to.width / 2;
  const y2 = to.y;
  const mid = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`;
};

export function LadderGraph() {
  const rows = useLiveQuery(listLevels, []);
  const levels = useMemo(() => levelsOf(rows ?? new Map()), [rows]);
  const layout = useMemo(() => layoutPath(LADDER_PATH), []);
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const states = useMemo(() => new Map(layout.nodes.map((n) => [n.id, ideaState(n.id, levels)])), [layout, levels]);
  const counts = ORDER.map((state) => ({ state, n: layout.nodes.filter((n) => states.get(n.id) === state).length }));

  const text = useTextScale();
  const frame = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [word, setWord] = useState<Lookup | null>(null);
  const [wordChapter, setWordChapter] = useState<Chapter | null>(null);

  useReportScreen({
    name: 'The whole path',
    facts: [
      { label: 'Ideas', value: counts.map((c) => `${STATE_NAMES[c.state]} ${c.n}`).join(' · ') },
      { label: 'Shows', value: 'every grammar idea as a node, each linked to the ideas it needs' },
    ],
  });

  /** A view with the node `id` in the middle of the frame at this scale. */
  const centreOn = (id: string, k: number): View => {
    const box = frame.current!.getBoundingClientRect();
    const node = byId.get(id)!;
    return { k, x: box.width / 2 - (MARGIN + node.x + node.width / 2) * k * text, y: box.height / 2 - (MARGIN + node.y + NODE_H / 2) * k * text };
  };
  /** The idea he is on: the one he is learning, else the first one that is next, else the top. */
  const placeToLook = (): string => {
    const pick = (state: IdeaState) => layout.nodes.find((n) => states.get(n.id) === state)?.id;
    return pick('learning') ?? pick('next') ?? layout.nodes[0].id;
  };

  // the first view: at a size a title can be read, on the idea he is on
  useLayoutEffect(() => {
    if (view === null && rows !== undefined && frame.current) setView(centreOn(placeToLook(), 0.8));
    // the first view is made once, when his levels have come
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const zoomBy = (factor: number): void => {
    const box = frame.current!.getBoundingClientRect();
    setView((v) => (v ? zoomAround(v, box.width / 2, box.height / 2, clamp(v.k * factor, MIN_SCALE, MAX_SCALE)) : v));
  };

  // ---- one finger pans, two fingers pinch; a touch that moved is no tap ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; at: { x: number; y: number }; span: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const local = (event: ReactPointerEvent): { x: number; y: number } => {
    const box = frame.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const begin = (): void => {
    if (!view) return;
    const points = [...pointers.current.values()];
    if (points.length === 0) {
      gesture.current = null;
      return;
    }
    const at = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const span = points.length === 1 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    gesture.current = { view, at, span, moved: gesture.current?.moved ?? false };
  };
  const onDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (pointers.current.size === 0) moved.current = false;
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 2) {
      moved.current = true;
      for (const id of pointers.current.keys()) event.currentTarget.setPointerCapture(id);
    }
    begin();
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const start = gesture.current;
    if (!pointers.current.has(event.pointerId) || !start) return;
    pointers.current.set(event.pointerId, local(event));
    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      const span = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const at = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      const k = clamp(start.view.k * (span / Math.max(start.span, 1)), MIN_SCALE, MAX_SCALE);
      const anchored = zoomAround(start.view, start.at.x, start.at.y, k);
      setView({ ...anchored, x: anchored.x + (at.x - start.at.x), y: anchored.y + (at.y - start.at.y) });
      return;
    }
    const dx = points[0].x - start.at.x;
    const dy = points[0].y - start.at.y;
    if (!moved.current && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!moved.current) event.currentTarget.setPointerCapture(event.pointerId);
    moved.current = true;
    setView({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    pointers.current.delete(event.pointerId);
    // the finger left behind carries on as a pan from where it is
    if (pointers.current.size > 0) begin();
    else gesture.current = null;
  };

  /** The buttons that pan: a step is part of the frame, and 'Pan left' shows what lies to the left (the picture moves right). */
  const panBy = (dx: number, dy: number): void => {
    const box = frame.current!.getBoundingClientRect();
    setView((v) => (v ? { ...v, x: v.x + dx * box.width * PAN_STEP, y: v.y + dy * box.height * PAN_STEP } : v));
  };
  /** Focus on a node (Tab, or a screen reader's swipe) that is not wholly in the frame brings it to the middle, so a keyboard reader reaches every idea. */
  const onFocusNode = (event: ReactFocusEvent<SVGGElement>, id: string): void => {
    const box = frame.current!.getBoundingClientRect();
    const at = event.currentTarget.getBoundingClientRect();
    const inside = at.left >= box.left + FOCUS_MARGIN && at.right <= box.right - FOCUS_MARGIN && at.top >= box.top + FOCUS_MARGIN && at.bottom <= box.bottom - FOCUS_MARGIN;
    if (!inside && view) setView(centreOn(id, view.k));
  };

  const open = (id: string): void => {
    if (!moved.current) setIdeaId(id);
  };
  const onKey = (event: KeyboardEvent, id: string): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIdeaId(id);
    }
  };

  const style = (state: IdeaState): CSSProperties => ({ fill: PAINT[state].fill, stroke: PAINT[state].stroke, strokeWidth: PAINT[state].width, strokeDasharray: PAINT[state].dash });

  return (
    <>
      <ScreenHeader title="The whole path" back={<HeaderButton onClick={() => navigate('goal')}>‹ Goal</HeaderButton>} />
      <ul aria-label="Colours" data-testid="graph-legend" className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-b border-line px-4 py-2 text-base">
        {counts.map(({ state, n }) => (
          <li key={state} className="flex items-center gap-1.5">
            <svg aria-hidden="true" width="22" height="14" className="shrink-0">
              <rect x="1.5" y="1.5" width="19" height="11" rx="3" style={style(state)} />
            </svg>
            <span>
              {STATE_NAMES[state]} {n}
            </span>
          </li>
        ))}
      </ul>
      <div
        ref={frame}
        data-testid="ladder-graph"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
      >
        {view ? (
          <svg role="group" aria-label="The grammar ladder as a graph: each idea with the ideas it needs above it" width="100%" height="100%" className="block">
            <g data-testid="graph-world" data-scale={view.k.toFixed(3)} transform={`translate(${view.x} ${view.y}) scale(${view.k * text}) translate(${MARGIN} ${MARGIN})`}>
              <g fill="none" stroke="var(--lp-muted)" strokeOpacity="0.45" strokeWidth="1.5">
                {layout.edges.map((e) => (
                  <path key={`${e.from}>${e.to}`} data-edge={`${e.from}>${e.to}`} d={curve(byId.get(e.from)!, byId.get(e.to)!)} />
                ))}
              </g>
              {layout.nodes.map((n) => {
                const idea = ideaOf(n.id);
                const state = states.get(n.id)!;
                const lines = titleLines(idea.title);
                return (
                  <g
                    key={n.id}
                    data-idea={n.id}
                    data-state={state}
                    role="button"
                    tabIndex={0}
                    aria-label={`${idea.title}: ${STATE_NAMES[state]}`}
                    transform={`translate(${n.x} ${n.y})`}
                    onClick={() => open(n.id)}
                    onKeyDown={(event) => onKey(event, n.id)}
                    onFocus={(event) => onFocusNode(event, n.id)}
                    className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[4]"
                  >
                    <rect width={n.width} height={NODE_H} rx="10" style={style(state)} />
                    {lines.map((line, i) => (
                      <text
                        key={line}
                        x={n.width / 2}
                        y={NODE_H / 2 + (i - (lines.length - 1) / 2) * 16 + 5}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight={state === 'notYet' ? 400 : 600}
                        fill="var(--lp-fg)"
                        stroke="none"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          </svg>
        ) : null}
        <div className="absolute left-3 flex flex-col gap-2" style={{ bottom: 'calc(var(--lp-bar-inset) + 0.75rem)' }}>
          <div role="group" aria-label="Pan" className="flex gap-2">
            {PANS.map(({ name, arrow, dx, dy }) => (
              <button key={name} type="button" aria-label={name} onClick={() => panBy(dx, dy)} className={ROUND}>
                {arrow}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.4)} className={ROUND}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)} className={ROUND}>
              −
            </button>
            <button type="button" onClick={() => setView(centreOn(placeToLook(), 0.8))} className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base font-medium text-accent active:bg-line">
              Where I am
            </button>
          </div>
        </div>
      </div>
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => setIdeaId(null)}
          covered={word !== null}
          onWord={(chapter: Chapter, tapped: GreekWord) => {
            // the word sheet opens over the idea sheet, which stays: Back closes one sheet at a time (mw-5r3p30.378)
            setWordChapter(chapter);
            setWord({ words: [tapped], fromEnglish: false });
          }}
        />
      ) : null}
      {word && wordChapter ? <WordSheet chapter={wordChapter} lookup={word} onClose={() => setWord(null)} /> : null}
    </>
  );
}

/** The view at scale `k` that keeps the point (px, py) of the frame over the same spot of the picture. */
function zoomAround(view: View, px: number, py: number, k: number): View {
  const ratio = k / view.k;
  return { k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio };
}
