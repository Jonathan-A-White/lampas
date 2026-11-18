// src/tips/UsageCounted.tsx — 'What Lampas has counted' (mw-6ww.175.15): the screens he has opened, each with how many times, and the screens he has never opened.
// It is a page of its own, '#/settings?page=counted', behind its row of the Settings home (mw-6ww.175.87, his words: "This should be behind a tap. Not off the main
// settings."; src/settings/rows.ts COUNTED_DOOR, link.ts COUNTED_LINK), with a ‹ Settings back arrow; the home draws the row and not the lists. The header says the
// title once, so the block under it starts at its one line. It reads only the usage store (listUsage) and asks no server: the counts are kept on his phone and shown
// to him (docs/tips.md).
import { useLiveQuery } from 'dexie-react-hooks';
import { listUsage } from '../data/repositories';
import { useScrollMemory } from '../nav/scrollMemory';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { backToSettingsHome } from '../settings/link';
import { COUNTED_DOOR } from '../settings/rows';
import { useReportScreen } from '../tutor/screenContext';
import { screensCounted } from './summary';

/** The page: the header with its title and the way back to the Settings home, and the block in a scroll box of its own. */
export function UsageCountedPage() {
  const scrollRef = useScrollMemory('counted');
  useReportScreen({ name: 'Settings', facts: [{ label: 'Page', value: COUNTED_DOOR.title }] });
  return (
    <>
      {/* slimAction: there is no action, so the long title and the back label share one row at 390 px */}
      <ScreenHeader title={COUNTED_DOOR.title} back={<HeaderButton onClick={backToSettingsHome}>‹ Settings</HeaderButton>} slimAction />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div>
          <UsageCounted />
        </div>
      </main>
    </>
  );
}

/** The block: the one line that says what is counted and where it stays, then the screens opened with their counts and the screens never opened. */
export function UsageCounted() {
  const usage = useLiveQuery(listUsage, []);
  if (usage === undefined) return null;
  const { opened, never } = screensCounted(usage);
  return (
    <div data-usage-counted className="pt-3">
      <p className="text-base text-muted">How often you opened each screen. This stays on this phone.</p>
      <h2 className="mt-3 text-base font-semibold">Opened</h2>
      {opened.length === 0 ? (
        <p className="text-base text-muted">No screen yet.</p>
      ) : (
        <ul aria-label="Opened" className="text-base">
          {opened.map((s) => (
            <li key={s.id} className="py-1">
              {s.label} · {s.count}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-3 text-base font-semibold">Never opened</h2>
      {never.length === 0 ? (
        <p className="text-base text-muted">You have opened every screen.</p>
      ) : (
        <ul aria-label="Never opened" className="text-base">
          {never.map((s) => (
            <li key={s.id} className="py-1">
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
