// src/SettingsScreen.tsx — what he can set, so the reader's front screen stays clear: the Theme and Text size, the layout (verse by verse | paragraph), Reading (Scroll | Turn pages, src/reader/usePages.ts), the section headings, the weave, the voices that read
// English and Greek aloud, how fast each is read, and how Greek is pronounced. Each choice is saved in the settings store (src/data/repositories)
// and told to the bus (src/events/bus.ts); the Study resources (src/resources/) are switched on here; Words and About open from here too.
// The rows are not written here: src/settings/rows.ts lists every row (name, hint, help, section, what it depends on) and this file draws
// them, section by section, each with the control CONTROLS (src/settings/controls/, one file per section) names for its key. The search field at the top filters that list (visibleRows),
// and a row that depends on a setting that is off is not drawn. An address '#/settings?section=resources' opens Settings scrolled to that section (a link from elsewhere, such as
// the reference card's 'Link Logos in Settings'). An address '#/settings?setting=textSize' (src/settings/link.ts, docs/links.md) opens it at one row: the row is drawn whatever the search or its
// dependency would hide (rowsAt), scrolled to and marked until his next tap, and a row that depends on a setting that is off says to turn that on first.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useAiAllowed } from './gate/licenceContext';
import { navigate, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { CONTROLS } from './settings/controls';
import { NeedsLicenceRow } from './settings/controls/NeedsLicence';
import { HighlightedSetting } from './settings/controls/highlighted';
import { Section } from './settings/controls/SettingRow';
import { settingKeyOf } from './settings/link';
import { SECTIONS, neededFor, readValues, rowOf, rowsAt } from './settings/rows';
import { settingsForTutor } from './settings/tutorSettings';
import { useReportScreen } from './tutor/screenContext';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

/** The search field at the top: it filters the rows by name and hint as he types. */
function SettingsSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div className="pt-3">
      <input
        type="search"
        value={query}
        placeholder="Search settings"
        aria-label="Search settings"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      />
    </div>
  );
}

/** How long a row that a link opened Settings at is kept in view while the controls above it arrive. */
const KEEP_IN_VIEW_MS = 2500;

/** The section id an address asks for ('#/settings?section=resources'), or null. */
function sectionOf(hash: string): string | null {
  const q = hash.indexOf('?');
  return new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('section');
}

export function SettingsScreen() {
  const address = useAddress();
  const wanted = sectionOf(address);
  // a link to one setting (src/settings/link.ts) marks its row until his next tap
  const linked = settingKeyOf(address);
  const [tapped, setTapped] = useState<string | null>(null);
  const highlighted = linked !== null && linked !== tapped ? linked : null;
  useEffect(() => {
    if (highlighted === null) return;
    const clear = () => setTapped(highlighted);
    document.addEventListener('pointerdown', clear, true);
    return () => document.removeEventListener('pointerdown', clear, true);
  }, [highlighted]);
  const contentRef = useRef<HTMLDivElement>(null);
  // the controls above the row draw one by one (each reads its saved value first), which moves the row down: keep it in view while they arrive, until his tap or KEEP_IN_VIEW_MS
  useEffect(() => {
    const content = contentRef.current;
    if (highlighted === null || !content || typeof ResizeObserver === 'undefined') return;
    const bring = () => content.querySelector(`[data-setting="${CSS.escape(highlighted)}"]`)?.scrollIntoView({ block: 'center' });
    const observer = new ResizeObserver(bring);
    observer.observe(content);
    const stop = setTimeout(() => observer.disconnect(), KEEP_IN_VIEW_MS);
    return () => {
      clearTimeout(stop);
      observer.disconnect();
    };
  }, [highlighted]);
  const scrollRef = useScrollMemory('settings');
  const [query, setQuery] = useState('');
  const values = useLiveQuery(readValues, []);
  const rows = rowsAt(values ?? {}, query, linked);
  const needed = values && linked ? neededFor(values, linked) : undefined;
  // with no licence each AI option is drawn off and greyed with 'Needs a licence', a link to the Licence page (mw-8m9dyu.3)
  const aiAllowed = useAiAllowed();
  // the tutor is told every setting, shown or not (mw-5r3p30.107): he can say what a setting that is off would give
  const forTutor = useLiveQuery(settingsForTutor, []);
  useReportScreen({ name: 'Settings', facts: [], settings: forTutor ?? [] });
  const drawn = values !== undefined;
  useEffect(() => {
    if (!wanted || !drawn) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-section]')).find((el) => el.dataset.section === wanted);
    target?.scrollIntoView({ block: 'start' });
  }, [wanted, drawn]);
  return (
    <>
      <ScreenHeader title="Settings" search={false} back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div ref={contentRef}>
          <SettingsSearch query={query} onChange={setQuery} />
          {needed && linked ? (
            <p role="status" data-setting-needs className="mt-3 rounded-lg border border-line px-3 py-2 text-base">
              “{rowOf(linked)?.label}” is shown once “{needed.label}” is on. Turn “{needed.label}” on first.
            </p>
          ) : null}
          <HighlightedSetting.Provider value={highlighted}>
            {SECTIONS.map((section) => {
              const mine = rows.filter((r) => r.section === section.id);
              if (mine.length === 0) return null;
              return (
                <Section key={section.id} id={section.id} title={section.title} hint={section.hint} labelled={section.id === 'resources'}>
                  {mine.map((row) => {
                    if (row.ai && !aiAllowed) return <NeedsLicenceRow key={row.key} row={row} />;
                    const Row = CONTROLS[row.key];
                    return Row ? <Row key={row.key} row={row} /> : null;
                  })}
                </Section>
              );
            })}
          </HighlightedSetting.Provider>
          {rows.length === 0 && values ? (
            <p role="status" className="py-4 text-base text-muted">
              Nothing in Settings matches “{query.trim()}”.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
