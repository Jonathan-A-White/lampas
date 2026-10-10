// src/SettingsScreen.tsx — what he can set, so the reader's front screen stays clear: the Theme and Text size, the layout (verse by verse | paragraph), the section headings, the weave, the voices that read
// English and Greek aloud, how fast each is read, and how Greek is pronounced. Each choice is saved in the settings store (src/data/repositories)
// and told to the bus (src/events/bus.ts); the Study resources (src/resources/) are switched on here; Words and About open from here too.
// The rows are not written here: src/settings/rows.ts lists every row (name, hint, help, section, what it depends on) and this file draws
// them, section by section, each with the control CONTROLS (src/settings/controls/, one file per section) names for its key. The search field at the top filters that list (visibleRows),
// and a row that depends on a setting that is off is not drawn.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { CONTROLS } from './settings/controls';
import { Section } from './settings/controls/SettingRow';
import { SECTIONS, readValues, visibleRows } from './settings/rows';
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

export function SettingsScreen() {
  const scrollRef = useScrollMemory('settings');
  const [query, setQuery] = useState('');
  const values = useLiveQuery(readValues, []);
  const rows = visibleRows(values ?? {}, query);
  // the tutor is told every setting, shown or not (mw-5r3p30.107): he can say what a setting that is off would give
  const forTutor = useLiveQuery(settingsForTutor, []);
  useReportScreen({ name: 'Settings', facts: [], settings: forTutor ?? [] });
  return (
    <>
      <ScreenHeader title="Settings" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div>
          <SettingsSearch query={query} onChange={setQuery} />
          {SECTIONS.map((section) => {
            const mine = rows.filter((r) => r.section === section.id);
            if (mine.length === 0) return null;
            return (
              <Section key={section.id} title={section.title} hint={section.hint} labelled={section.id === 'resources'}>
                {mine.map((row) => {
                  const Row = CONTROLS[row.key];
                  return Row ? <Row key={row.key} row={row} /> : null;
                })}
              </Section>
            );
          })}
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
