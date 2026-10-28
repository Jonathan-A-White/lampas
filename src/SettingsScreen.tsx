// src/SettingsScreen.tsx — what he can set, so the reader's front screen stays clear. Settings is a home and pages (mw-3ased2.1): '#/settings' lists the groups
// (src/settings/rows.ts GROUPS: Reading, Greek, The tutor, Listening, Daily, Study resources, Account, Developer) under a search field pinned at the top (it is the only
// settings search: no header has a magnifier, mw-5r3p30.617), and a group opens as a page of its own, '#/settings?group=reading', with a ‹ Settings back arrow. Typing in the
// search lists the rows that match, each saying its group; choosing one opens its page at that row (openSetting, src/settings/link.ts). The rows are not written here:
// src/settings/rows.ts lists every row (name, hint, help, section, what it depends on) and a page draws its group's rows, section by section, each with the control CONTROLS
// (src/settings/controls/, one file per section) names for its key. A row that depends on a setting that is off is not drawn. An address '#/settings?section=resources' opens the
// page holding that section, scrolled to it (a link from elsewhere, such as the reference card's 'Link Logos in Settings'). An address '#/settings?setting=textSize' (src/settings/link.ts,
// docs/links.md) opens the page holding that row, at the row: it is drawn whatever its dependency would hide (rowsAt), scrolled to and marked until his next tap, and a row that
// depends on a setting that is off says to turn that on first. Your Logos library is the first row of Study resources (a link to it, '#/settings?setting=library', opens that page and marks it). docs/layout/settings.md.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useAiAllowed } from './gate/licenceContext';
import { backTo, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { CONTROLS } from './settings/controls';
import { NeedsLicenceRow } from './settings/controls/NeedsLicence';
import { HighlightedSetting } from './settings/controls/highlighted';
import { Section } from './settings/controls/SettingRow';
import { backToSettingsHome, groupIdOf, settingKeyOf } from './settings/link';
import { searchLibrary } from './settings/librarySearch';
import { Found, GroupButton, SettingsSearch } from './settings/SettingsHome';
import { GREEK_LEVELS, greekLevelOf } from './settings/definitions/greekInterest';
import { HEBREW_LEVELS } from './settings/definitions/hebrewInterest';
import { HOME_SECTIONS, SECTIONS, dialOf, groupById, groupOf, isHomeRow, neededFor, orderResourceRows, readValues, rowOf, rowsAt, visibleGroups, visibleRows, type GroupId, type SettingsRow, type Values } from './settings/rows';
import { settingsForTutor } from './settings/tutorSettings';
import { useReportScreen } from './tutor/screenContext';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

/** How long a row that a link opened Settings at is kept in view while the controls above it arrive. */
const KEEP_IN_VIEW_MS = 2500;

/** What a linked row that something else hides says: a Greek or Hebrew row names the dial's step that shows it, a row both share says to raise either dial, any other says to turn on the setting it depends on. */
function neededText(values: Values, row: SettingsRow | undefined, needed: SettingsRow | undefined): string {
  const dial = row && dialOf(row);
  if (!row || (dial !== 'greekInterest' && dial !== 'hebrewInterest' && dial !== 'depth')) return `“${row?.label}” is shown once “${needed?.label}” is on. Turn “${needed?.label}” on first.`;
  // the step is found with both languages chosen, so only the dial's level decides
  const level = (n: number) => String(n);
  const both = { ...values, languages: 'both' };
  if (dial === 'depth') {
    const step = GREEK_LEVELS.find((l) => visibleRows({ ...both, depth: level(l.level) }, '').some((r) => r.key === row.key));
    return `“${row.label}” is shown from “${step?.name ?? 'All in'}” up: choose a language at the top of Settings, then raise “How much Greek?” or “How much Hebrew?”.`;
  }
  const key = dial;
  const lang = key === 'greekInterest' ? 'Greek' : 'Hebrew';
  const steps = key === 'greekInterest' ? GREEK_LEVELS : HEBREW_LEVELS;
  const step = steps.find((l) => visibleRows({ ...both, [key]: level(l.level) }, '').some((r) => r.key === row.key));
  return `“${row.label}” is ${lang}. It is shown from “${step?.name ?? 'All in'}” up: choose ${lang} at the top of Settings, then raise “How much ${lang}?”.`;
}

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
  // the page he is on: the group the address names, else the group of the setting or section it asks for; none is the home
  const sectionGroup = SECTIONS.find((sec) => sec.id === wanted);
  const linkedRow = linked ? rowOf(linked) : undefined;
  const pageId: GroupId | null =
    groupIdOf(address) ?? (linkedRow && !isHomeRow(linkedRow) ? groupOf(linkedRow.section).id : sectionGroup && !HOME_SECTIONS.includes(sectionGroup.id) ? groupOf(sectionGroup.id).id : null);
  const page = pageId ? groupById(pageId) : undefined;
  const scrollRef = useScrollMemory('settings');
  const [query, setQuery] = useState('');
  // a link that names a row of the home (the dial) clears the search that found it, so the home shows the row marked and not the list of answers
  const [linkSeen, setLinkSeen] = useState(linked);
  if (linkSeen !== linked) {
    setLinkSeen(linked);
    if (linked !== null && linkedRow && isHomeRow(linkedRow)) setQuery('');
  }
  const values = useLiveQuery(readValues, []);
  const rows = orderResourceRows(rowsAt(values ?? {}, '', linked), greekLevelOf(values?.greekInterest));
  const needed = values && linked ? neededFor(values, linked) : undefined;
  // a row both languages share depends on no row (the key 'depth' is read, not drawn): it says to raise either dial though there is nothing to turn on first
  const sharedHidden = values && linked && linkedRow && dialOf(linkedRow) === 'depth' && !visibleRows(values, '').some((r) => r.key === linked);
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
  if (!page) {
    const searching = query.trim() !== '';
    const found = searching && values ? visibleRows(values, query) : [];
    // 'Which languages?' is the first thing on the home, and under it the dial of each language chosen (mw-3ased2.2, mw-gdcyf98.2); a search lists matching rows instead
    // (a link to a dial whose language is not chosen draws it all the same, marked, as a link does for any row: rowsAt)
    const dialRows = values ? rows.filter((r) => r.section === 'dial') : [];
    return (
      <>
        <ScreenHeader title="Settings" back={<HeaderButton onClick={() => backTo('home')}>‹ Reader</HeaderButton>} />
        <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
          <div ref={contentRef}>
            <SettingsSearch query={query} onChange={setQuery} />
            {searching ? (
              values ? <Found rows={found} books={searchLibrary(query)} query={query} /> : null
            ) : (
              // the list waits for the saved values: Developer is listed only once Developer mode is found, and it must not flash up before that is known
              values ? (
                <>
                  <HighlightedSetting.Provider value={highlighted}>
                    {dialRows.map((row) => {
                      const Dial = CONTROLS[row.key];
                      return Dial ? <Dial key={row.key} row={row} /> : null;
                    })}
                  </HighlightedSetting.Provider>
                  <ul aria-label="Settings groups">
                    {visibleGroups(values).map((g) => (
                      <GroupButton key={g.id} id={g.id} title={g.title} hint={g.hint} />
                    ))}
                  </ul>
                </>
              ) : null
            )}
          </div>
        </main>
      </>
    );
  }
  const drawnSections = SECTIONS.filter((section) => page.sections.includes(section.id) && rows.some((r) => r.section === section.id));
  return (
    <>
      <ScreenHeader title={page.title} back={<HeaderButton onClick={backToSettingsHome}>‹ Settings</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div ref={contentRef} data-settings-group={page.id}>
          {(needed || sharedHidden) && linked ? (
            <p role="status" data-setting-needs className="mt-3 rounded-lg border border-line px-3 py-2 text-base">
              {neededText(values ?? {}, rowOf(linked), needed)}
            </p>
          ) : null}
          <HighlightedSetting.Provider value={highlighted}>
            {drawnSections.map((section) => (
              <Section key={section.id} id={section.id} title={section.title} hint={section.hint} labelled={section.id === 'resources'}>
                {rows
                  .filter((r) => r.section === section.id)
                  .map((row) => {
                    if (row.ai && !aiAllowed) return <NeedsLicenceRow key={row.key} row={row} />;
                    const Row = CONTROLS[row.key];
                    return Row ? <Row key={row.key} row={row} /> : null;
                  })}
              </Section>
            ))}
          </HighlightedSetting.Provider>
          {drawnSections.length === 0 && values ? (
            <p role="status" className="py-4 text-base text-muted">
              Nothing in {page.title} yet.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
