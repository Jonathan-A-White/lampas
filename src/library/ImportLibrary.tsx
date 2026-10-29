// src/library/ImportLibrary.tsx — Import your library (#/library?import, docs/design/library-at-scale.md 5.1 to 5.4): he chooses the list Logos saved as a spreadsheet, it is read and matched on the phone,
// and the screen shows counts, not 4,795 rows: how many books were read, how many open from Lampas (by kind, with the pins and his Bible), how many Lampas cannot use yet and why (a page of
// plain lines), and one button, 'Turn on N books'. It is the words Import's shape (src/ImportScreen.tsx): a preview, counts, one button. Nothing is sent unless he taps 'Ask the makers about these' (mw-rfjjzd.14,
// docs/design/library-at-scale.md 6.2): one request for the whole list, the counts by Logos type and the usable books as library.csv, and no second one until the catalogue changes or 30 days pass.
import { useAlive } from 'pwa-kit/alive';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { applyImport, dropShares, planImport, setLogosBible, waitingShare, type ImportPlan } from '../data/repositories';
import { useAiAllowed } from '../gate/licenceContext';
import { backTo, libraryOf, navigate, useAddress } from '../nav/route';
import { KINDS, type Kind } from '../resources/catalogue';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { askAboutLibrary, libraryRefusal } from '../services/bookRequests';
import { FAILURE_TITLES, TutorError, type TutorFailure } from '../services/tutor';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { isCsvFile } from '../share/target';
import { readText } from '../ui/readText';
import { isListed } from './matchExport';
import { readExport } from './parseExport';
import { lineText, reasonLines } from './reasons';
import { usableRows, type ListedRow } from './usableRows';

const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';
const PRIMARY = 'min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg disabled:opacity-40';
const ACCEPT = '.csv,text/csv,text/comma-separated-values,application/vnd.ms-excel';

/** One book and many of a kind, as a sentence names them. */
const NOUNS: Record<Kind, readonly [string, string]> = {
  lexicon: ['lexicon', 'lexicons'],
  grammar: ['grammar', 'grammars'],
  'greek-text': ['Greek text', 'Greek texts'],
  interlinear: ['interlinear', 'interlinears'],
  commentary: ['commentary', 'commentaries'],
  bible: ['Bible', 'Bibles'],
  devotional: ['devotional', 'devotionals'],
};

const count = (n: number, one: string, many: string): string => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
const nameList = (names: readonly string[]): string => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

type Stage = { kind: 'choose'; problem?: string } | { kind: 'reading' } | { kind: 'result'; plan: ImportPlan } | { kind: 'reasons'; plan: ImportPlan } | { kind: 'saving'; plan: ImportPlan };

/** What the list holds, as one line by kind: '19 lexicons · 9 grammars · 55 Bibles (LSB chosen)'. */
function byKind(plan: ImportPlan): string {
  const listed = plan.result.matched.filter(isListed);
  const chosen = plan.turning.find((t) => t.entry.kind === 'bible')?.entry.short;
  return KINDS.flatMap((kind) => {
    const n = listed.filter((m) => m.kind === kind).length;
    if (n === 0) return [];
    const line = count(n, ...NOUNS[kind]);
    return [kind === 'bible' && chosen ? `${line} (${chosen} chosen)` : line];
  }).join(' · ');
}

export function ImportLibrary() {
  const input = useRef<HTMLInputElement>(null);
  // a list shared to Lampas (src/share/target.ts) is parked in the phone's store: it is read as if he had chosen it
  const shareId = libraryOf(useAddress()).share;
  const [stage, setStage] = useState<Stage>(shareId ? { kind: 'reading' } : { kind: 'choose' });
  const alive = useAlive();
  useReportScreen({ name: SCREEN_NAMES.library, facts: [{ label: 'Page', value: 'Import your library from a Logos list (Save as Spreadsheet); nothing is sent' }] });

  /** The list's text read and matched: the result, or the choose page with what went wrong. */
  const load = async (text: () => Promise<string>): Promise<Stage> => {
    try {
      const rows = readExport(await text());
      if (rows.length === 0) throw new Error('This list has no books in it.');
      return { kind: 'result', plan: await planImport(rows) };
    } catch (error) {
      return { kind: 'choose', problem: error instanceof Error ? error.message : 'This file could not be read.' };
    }
  };

  const pick = async (file: File | undefined): Promise<void> => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setStage({ kind: 'reading' });
    const next = await load(() => readText(file));
    if (alive()) setStage(next);
  };

  useEffect(() => {
    if (!shareId) return;
    void load(async () => {
      const shared = (await waitingShare(shareId))?.files.find(isCsvFile);
      if (!shared) throw new Error('The list you shared is no longer on this phone. Choose it again.');
      return readText(new File([shared.bytes], shared.name, { type: shared.type }));
    }).then((next) => alive() && setStage(next));
    // read once per shared list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const turnOn = async (plan: ImportPlan): Promise<void> => {
    setStage({ kind: 'saving', plan });
    await applyImport(plan);
    if (shareId) await dropShares();
    // the Bible chosen here is the Bible in Logos for all three parts (as it is when he chooses one on the Bibles page)
    const bible = plan.turning.find((t) => t.entry.kind === 'bible');
    if (bible) await setLogosBible(bible.entry.resource);
    if (alive()) navigate('library', { replace: true });
  };

  if (stage.kind === 'reasons') return <Reasons plan={stage.plan} back={() => setStage({ kind: 'result', plan: stage.plan })} />;

  const plan = stage.kind === 'result' || stage.kind === 'saving' ? stage.plan : undefined;
  return (
    <>
      <ScreenHeader title="Import your library" back={<HeaderButton onClick={() => backTo('library')}>‹ Library</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-3">
        {plan ? <Result plan={plan} onReasons={() => setStage({ kind: 'reasons', plan })} /> : <Choose reading={stage.kind === 'reading'} problem={stage.kind === 'choose' ? stage.problem : undefined} onChoose={() => input.current?.click()} />}
        <input ref={input} type="file" accept={ACCEPT} aria-label="Logos list file" tabIndex={-1} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
      </main>
      {plan ? (
        <footer className="shrink-0 border-t border-line px-3 pt-3 pb-[calc(0.75rem+var(--lp-bar-inset))]">
          <button type="button" disabled={stage.kind === 'saving'} onClick={() => void turnOn(plan)} className={PRIMARY}>
            {plan.turning.length === 0 ? 'Keep this list' : `Turn on ${count(plan.turning.length, 'book', 'books')}`}
          </button>
        </footer>
      ) : null}
    </>
  );
}

function Choose({ reading, problem, onChoose }: { reading: boolean; problem?: string; onChoose: () => void }) {
  return (
    <>
      <p className="text-base">
        On your computer, open Logos, choose <strong>Library</strong>, then <strong>Save as Spreadsheet</strong>. That makes a file ending in .csv. Send it to this phone (email it to yourself, or put it in Drive) and choose it here.
      </p>
      <p className="mt-2 text-base text-muted">Your list stays on this phone. Nothing is sent.</p>
      <button type="button" disabled={reading} onClick={onChoose} className={`${BUTTON} mt-3 w-full`}>
        {reading ? 'Reading your list…' : 'Choose your Logos list'}
      </button>
      {problem ? (
        <p role="alert" className="mt-3 text-base text-accent">
          {problem}
        </p>
      ) : null}
    </>
  );
}

function Result({ plan, onReasons }: { plan: ImportPlan; onReasons: () => void }) {
  const open = plan.result.matched.length - plan.waiting;
  const pinned = plan.turning.filter((t) => t.state === 'pinned').map((t) => t.entry.short.split(',')[0]);
  const left = plan.result.unmatched.length;
  return (
    <div data-testid="import-result">
      <p data-testid="import-read" className="text-base font-medium">
        {count(plan.rows.length, 'book', 'books')} read from your Logos list.
      </p>
      <section className="mt-3">
        <p data-testid="import-open" className="text-lg font-medium">
          {open.toLocaleString('en')} open from Lampas
        </p>
        {open > 0 ? (
          <p data-testid="import-kinds" className="text-base">
            {byKind(plan)}
          </p>
        ) : null}
        {plan.turning.length > 0 ? (
          <p className="mt-1 text-base text-muted">
            All of these turn on{plan.turning.length < open ? ' (one Bible at a time)' : ''}.{' '}
            {pinned.length > 0 ? `${nameList(pinned)} ${pinned.length === 1 ? 'is' : 'are'} pinned; change any in Your Logos library.` : ''}
          </p>
        ) : null}
        {plan.kept > 0 ? (
          <p data-testid="import-kept" className="mt-1 text-base text-muted">
            {count(plan.kept, 'book is', 'books are')} already on your shelf or set by you, and stay as you have them.
          </p>
        ) : null}
        {plan.waiting > 0 ? (
          <p data-testid="import-waiting" className="mt-1 text-base text-muted">
            {count(plan.waiting, 'more is', 'more are')} of a kind Lampas opens, but this version does not list {plan.waiting === 1 ? 'it' : 'them'} yet: an update will.
          </p>
        ) : null}
      </section>
      {left > 0 ? (
        <section className="mt-4">
          <p data-testid="import-left" className="text-lg font-medium">
            {left.toLocaleString('en')} Lampas cannot use yet
          </p>
          <button type="button" onClick={onReasons} className={`${BUTTON} mt-1`}>
            What they are ›
          </button>
        </section>
      ) : null}
      <AskMakers plan={plan} />
      <p className="mt-4 pb-3 text-base text-muted">Your list stays on this phone. Nothing is sent unless you ask the makers.</p>
    </div>
  );
}

/** The books of the list that Lampas does not open, as the phone keeps them. */
const unmatchedOf = (plan: ImportPlan): ListedRow[] =>
  plan.result.unmatched.map(({ row }) => ({ resource: row.resource, type: row.type, title: row.title, series: row.series, languages: row.languages, refs: row.supersets }));

type Asking = { name: 'idle' } | { name: 'sending' } | { name: 'failed'; failure: TutorFailure; detail: string };

/** 'Ask the makers about these': one request of kind library for the whole list, once. While the last one stands (same catalogue, under 30 days) the card's line is shown instead of the button. */
function AskMakers({ plan }: { plan: ImportPlan }) {
  const ai = useAiAllowed();
  const alive = useAlive();
  const rows = useMemo(() => unmatchedOf(plan), [plan]);
  const usable = useMemo(() => usableRows(rows).length, [rows]);
  const refusal = useLiveQuery(async () => (await libraryRefusal()) ?? null, []);
  const [asking, setAsking] = useState<Asking>({ name: 'idle' });
  if (!ai || usable === 0 || refusal === undefined) return null;
  if (refusal !== null) {
    return (
      <p data-testid="library-asked" className="mt-3 text-base">
        {refusal}
      </p>
    );
  }
  const send = async (): Promise<void> => {
    setAsking({ name: 'sending' });
    try {
      await askAboutLibrary(rows, plan.rows.length);
      if (alive()) setAsking({ name: 'idle' });
    } catch (err) {
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      if (alive()) setAsking({ name: 'failed', failure: error.failure, detail: error.message });
    }
  };
  return (
    <section className="mt-3">
      <p data-testid="library-sends" className="text-sm text-muted">
        Sends how many books you have of each kind, and the titles of the {usable.toLocaleString('en')} Lampas could use (never manuscripts), to the makers, once. Nothing else leaves this phone.
      </p>
      <button type="button" disabled={asking.name === 'sending'} onClick={() => void send()} className={`${BUTTON} mt-2`}>
        {asking.name === 'sending' ? 'Sending…' : asking.name === 'failed' ? 'Try again' : 'Ask the makers about these'}
      </button>
      {asking.name === 'failed' ? (
        <div role="alert" className="mt-2 space-y-1">
          <p className="text-base font-semibold text-bad">{FAILURE_TITLES[asking.failure]}</p>
          <p className="break-words text-sm text-muted">{asking.detail}</p>
        </div>
      ) : null}
    </section>
  );
}

function Reasons({ plan, back }: { plan: ImportPlan; back: () => void }) {
  const lines = reasonLines(plan.result.unmatched.map((u) => u.reason));
  return (
    <>
      <ScreenHeader title="What Lampas cannot use yet" back={<HeaderButton onClick={back}>‹ Your list</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-3">
        <p className="text-base">{count(plan.result.unmatched.length, 'book', 'books')} of your list, and why.</p>
        <ul data-testid="import-reasons" className="mt-2 divide-y divide-line rounded-lg border border-line">
          {lines.map((line) => (
            <li key={line.key} className="px-3 py-2 text-base">
              {lineText(line)}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
