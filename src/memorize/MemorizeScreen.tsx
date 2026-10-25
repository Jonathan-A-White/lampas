// src/memorize/MemorizeScreen.tsx — the Memorize route (#/memorize, docs/layout/memorize.md): a MemorizeSession when the address names one (#/memorize/<ref>/<lang>), else the home (mw-fu7dqf.11):
// 'Due today' with a row for each verse and language that is due and its Start (and Start all: the sessions one after another, which the session's Next verse carries on), then 'Your verses'
// by the verse lists that hold them and 'Picked alone', each row with its reference, its marks (ProgressMark) and Stop memorizing. Nothing memorized says how to pick verses.
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { listVerseLists } from '../data/repositories';
import { closeMemorize, memorizeSessionOf, openMemorizeSession, useAddress } from '../nav/route';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { announce } from '../ui/live';
import { nameOf, unmemorizeVerse } from './commands';
import { langName, MEMORIZE_LANGS } from './languages';
import { MemorizeSession } from './MemorizeSession';
import { groupVerses } from './progress';
import { ProgressMark } from './ProgressMark';
import { useProgress, type VerseProgress } from './useProgress';

const BUTTON = 'min-h-12 shrink-0 rounded-xl border border-line px-4 text-base font-medium';
/** The name of a reference as the lists print it ('Romans 8:28'). */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function DueRow({ row }: { row: VerseProgress }) {
  const name = nameOf(row.ref);
  return (
    <li data-due={`${row.lang}:${row.ref}`} className="flex items-center gap-3 border-b border-line py-2">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium">
          {name} <span className="font-normal text-muted">· {langName(row.lang)}</span>
        </p>
        <ProgressMark progress={row.progress} className="mt-1" />
      </div>
      <button type="button" onClick={() => openMemorizeSession(row.ref, row.lang)} aria-label={`Start ${name} in ${langName(row.lang)}`} className={`${BUTTON} bg-accent text-accent-fg`}>
        Start
      </button>
    </li>
  );
}

function VerseRow({ canonical, rows }: { canonical: string; rows: VerseProgress[] }) {
  const name = nameOf(canonical);
  const stop = () => void unmemorizeVerse({ ref: canonical }).then(({ said }) => announce(said)).catch((error) => console.error('could not stop memorizing', error));
  return (
    <li data-verse-row={canonical} className="flex items-start gap-3 border-b border-line py-2">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium">{name}</p>
        <div className="mt-1 flex flex-col gap-1">
          {rows.map((row) => (
            <ProgressMark key={row.lang} progress={row.progress} lang={row.lang} />
          ))}
        </div>
      </div>
      <button type="button" onClick={stop} aria-label={`Stop memorizing ${name}`} className={`${BUTTON} text-bad`}>
        Stop memorizing
      </button>
    </li>
  );
}

function MemorizeHome() {
  const found = useProgress();
  const lists = useLiveQuery(listVerseLists, []);
  const due = found?.filter((row) => row.dueNow) ?? [];
  const refs = [...new Set(found?.map((row) => row.ref))];
  useReportScreen({
    name: SCREEN_NAMES.memorize,
    facts: found ? [{ label: 'Due today', value: String(due.length) }, { label: 'Verses memorized', value: String(refs.length) }] : [],
  });
  const back = <HeaderButton onClick={closeMemorize}>‹ Back</HeaderButton>;
  if (found === undefined || lists === undefined) return <ScreenHeader title={SCREEN_NAMES.memorize} back={back} />;
  const groups = groupVerses(refs, lists);
  return (
    <>
      <ScreenHeader title={SCREEN_NAMES.memorize} back={back} />
      <main className="screen min-h-0 flex-1 px-4">
        {refs.length === 0 ? (
          <div className="mt-3">
            <p className="text-base">No verses memorized yet.</p>
            <p className="mt-1 text-base text-muted">Open a verse list and turn on Memorize this list, or Memorize on one verse, and it comes here.</p>
            <a href="#/lists" className={`${BUTTON} mt-3 inline-flex items-center text-accent`}>
              Verse lists
            </a>
          </div>
        ) : (
          <>
            <Section title="Due today">
              {due.length === 0 ? (
                <p className="mt-1 text-base text-muted">Nothing due today</p>
              ) : (
                <>
                  <button type="button" onClick={() => openMemorizeSession(due[0].ref, due[0].lang)} className={`${BUTTON} mt-2 bg-accent text-accent-fg`}>
                    Start all
                  </button>
                  <ul className="mt-1">
                    {due.map((row) => (
                      <DueRow key={`${row.lang}:${row.ref}`} row={row} />
                    ))}
                  </ul>
                </>
              )}
            </Section>
            <Section title="Your verses">
              {groups.map((group) => (
                <section key={group.key} aria-label={group.name} data-group={group.key} className="mt-2">
                  <h3 className="text-base font-semibold text-muted">{group.name}</h3>
                  <ul>
                    {group.refs.map((ref) => (
                      <VerseRow key={ref} canonical={ref} rows={found.filter((row) => row.ref === ref).sort((a, b) => MEMORIZE_LANGS.indexOf(a.lang) - MEMORIZE_LANGS.indexOf(b.lang))} />
                    ))}
                  </ul>
                </section>
              ))}
            </Section>
          </>
        )}
        <div className="h-[var(--lp-end-inset)]" aria-hidden="true" />
      </main>
    </>
  );
}

export function MemorizeScreen() {
  const session = memorizeSessionOf(useAddress());
  return session ? <MemorizeSession key={`${session.lang}:${session.ref}`} refName={session.ref} lang={session.lang} /> : <MemorizeHome />;
}
