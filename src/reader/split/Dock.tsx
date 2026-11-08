// src/reader/split/Dock.tsx — the Reader's dock (docs/design/reader-split.md): a pane that stands below the passage (side by side sideways and wide), whose handle row is the divider. The row is
// 44 px, the sheets' own: the dock's name at the left (it takes the room the pill and Close leave, so "No map for Genesis 15" reads whole), the pill (the divider, a separator he can focus and move with the arrow keys, Home and End), Close at the right. The whole
// row is the drag surface, so a finger or a mouse drags the dock to any height and it rests where he lets go (useSplit.ts); pulled down past the smallest size by 80 px the name says
// 'Let go to close' and the body fades. The body is a slot: a map (mw-5r3p30.1129.2) or a second text (mw-5r3p30.1130) goes in it, and scrolls in its own box, so a scroll in it never moves the divider.
import type { ReactNode } from 'react';
import { HANDLE_ROW } from './splitSize';
import type { Split } from './useSplit';

export function Dock({ split, footRef, title, quiet = false, inert, children }: { split: Split; footRef: (el: HTMLElement | null) => void; title: string; /** the row says there is nothing to show (No map for Genesis 15): muted, not the dock's name */ quiet?: boolean; inert: boolean; children: ReactNode }) {
  const { axis, size, bounds, closing, dragging } = split;
  const column = axis === 'column';
  // pulled to a width too narrow for the pill and Close beside the words, the row gives them up and says only what letting go does
  const bare = closing && !column;
  return (
    <aside
      data-dock
      data-axis={axis}
      data-dragging={dragging ? '' : undefined}
      aria-label="Split"
      inert={inert}
      style={size === null ? { flex: '0 0 50%' } : { flex: `0 0 ${size}px` }}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-line bg-surface ${column ? 'border-t' : 'border-l'}`}
    >
      <div
        data-dock-handle
        style={{ height: HANDLE_ROW }}
        onPointerDown={split.handle.onPointerDown}
        onPointerMove={split.handle.onPointerMove}
        onPointerUp={split.handle.onPointerUp}
        onPointerCancel={split.handle.onPointerCancel}
        className={`grid shrink-0 touch-none select-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <span data-dock-title className={`truncate text-base font-medium ${bare ? 'col-span-3 ' : ''}${closing ? 'text-accent' : quiet ? 'text-muted' : 'text-fg'}`}>
          {closing ? 'Let go to close' : title}
        </span>
        <div
          role="separator"
          tabIndex={0}
          aria-label="Split size"
          aria-orientation={column ? 'horizontal' : 'vertical'}
          aria-valuemin={Math.round(bounds.min)}
          aria-valuemax={Math.round(bounds.max)}
          aria-valuenow={size === null ? undefined : Math.round(size)}
          onKeyDown={split.onKeyDown}
          className={`${bare ? 'hidden' : 'flex'} h-11 w-16 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
        >
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <button type="button" onClick={split.close} className={`${bare ? 'hidden ' : ''}min-h-11 justify-self-end rounded-xl px-2 text-base font-medium text-accent active:bg-line`}>
          Close
        </button>
      </div>
      <div data-dock-body style={{ opacity: closing ? 0.35 : 1 }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
      {/* the room the phone's bar keeps clear at the dock's foot (--lp-bar-inset): its height is part of the dock's smallest size */}
      <div ref={footRef} aria-hidden="true" style={{ height: 'var(--lp-bar-inset)' }} className="shrink-0" />
    </aside>
  );
}
