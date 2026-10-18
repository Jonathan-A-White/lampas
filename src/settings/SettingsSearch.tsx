// src/settings/SettingsSearch.tsx — the settings search from every screen (mw-5r3p30.502): a magnifier named 'Find a setting' (not 'Search settings', which a role-and-name
// match on 'Settings', the gear, would also find) in the screen's header (src/ScreenHeader.tsx, the Reader's
// header) opens a sheet with a search field; typing lists the settings whose name or hint holds the words (searchSettings, src/settings/rows.ts), and a tap on one
// opens Settings at that row, marked (src/settings/link.ts openSetting). The sheet is left first (closeAllSheets), so Back from Settings is the screen he
// started from. The Settings page has its own search field at the top and draws no magnifier.
import { useState } from 'react';
import { focusOnMount } from '../ui/focus';
import { closeAllSheets, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose } from '../ui/sheetDrag';
import { openSetting } from './link';
import { SECTIONS, searchSettings } from './rows';

const sectionTitle = (id: string): string => SECTIONS.find((s) => s.id === id)?.title ?? '';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** The sheet: a search field and, under it, the settings it finds. */
export function SettingsSearchSheet({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const found = searchSettings(query);
  return (
    <div className="fixed inset-0 z-30 flex flex-col">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="Find a setting" className="relative flex max-h-[85dvh] flex-col rounded-b-2xl border-b border-line bg-surface">
        <div className="flex items-center gap-2 px-3 pt-3">
          <input
            ref={focusOnMount}
            type="search"
            value={query}
            placeholder="Search settings"
            aria-label="Search settings"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
          <button type="button" onClick={onClose} className="min-h-12 min-w-12 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 pt-2">
          {query.trim() === '' ? (
            <p className="py-2 text-base text-muted">Type what you want to change, such as text size or voice.</p>
          ) : found.length === 0 ? (
            <p role="status" className="py-2 text-base text-muted">
              No setting matches “{query.trim()}”.
            </p>
          ) : (
            <ul aria-label="Settings found">
              {found.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => {
                      closeAllSheets();
                      openSetting(row.key);
                    }}
                    className="flex min-h-12 w-full flex-col items-start rounded-lg px-2 py-2 text-left active:bg-line"
                  >
                    <span className="text-base font-medium">{row.label}</span>
                    <span className="text-base text-muted">{row.hint}</span>
                    <span className="text-sm text-muted">In Settings › {sectionTitle(row.section)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** The magnifier that opens the search, 48 px square in a header; it keeps its own sheet. `inRow` is the Reader's chips row (src/ReaderChips.tsx), whose chips are 40 px: the
 * magnifier is 44 wide and 40 tall there and stays at the row's right end (sticky) while the chips scroll under it. */
export function SettingsSearchButton({ inRow = false }: { inRow?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Find a setting"
        data-settings-search
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`flex shrink-0 items-center justify-center rounded-lg text-accent active:bg-line ${inRow ? 'sticky right-0 min-w-11 bg-canvas' : 'min-h-12 min-w-12'}`}
      >
        <SearchIcon />
      </button>
      {open ? <SettingsSearchSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
