// src/reader/ReaderMenu.tsx — the Reader header's Menu (mw-5r3p30.754, his words of 2026-11-03: "the three lines for the menu, you could choose tools or settings under that"). A three-line button, where the
// gear was, opens a small menu of two rows, Tools and Settings, each an icon beside its word, the same size and style (the wrench beside Tools, the gear beside Settings). A tap outside, Escape and the phone's
// Back close it (useSheetBack, as a sheet); a row closes it and opens its screen, so Back from that screen returns to the Reader.
import { useState, type ReactNode } from 'react';
import { navigate } from '../nav/route';
import { useNoDoor } from '../tutor/door';
import { focusOnMount } from '../ui/focus';
import { closeAllSheets, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose } from '../ui/sheetDrag';

const ICON = { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

function MenuIcon() {
  return (
    <svg {...ICON}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg {...ICON}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" />
    </svg>
  );
}

function Row({ icon, label, onGo, first }: { icon: ReactNode; label: string; onGo: () => void; first?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      ref={first ? focusOnMount : undefined}
      onClick={onGo}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-lg font-medium text-fg active:bg-line"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </button>
  );
}

function MenuPanel({ onClose }: { onClose: () => void }) {
  useSheetBack(onClose);
  useEscapeToClose(onClose);
  useNoDoor();
  // a row takes him to a screen of its own: the menu closes first (its history entry is left beneath, which Back steps over, src/ui/sheetBack.ts closeAllSheets)
  const go = (route: 'tools' | 'settings') => () => {
    closeAllSheets();
    navigate(route);
  };
  return (
    <>
      <div data-testid="menu-backdrop" aria-hidden="true" onClick={onClose} className="fixed inset-0 z-30" />
      <div role="menu" aria-label="Menu" className="absolute right-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
        <Row first icon={<WrenchIcon />} label="Tools" onGo={go('tools')} />
        <Row icon={<GearIcon />} label="Settings" onGo={go('settings')} />
      </div>
    </>
  );
}

/** The button that stood as the gear: three lines, labelled Menu, 48 px square. */
export function ReaderMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-accent active:bg-line"
      >
        <MenuIcon />
      </button>
      {open ? <MenuPanel onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
