// src/today/Today.tsx — Today (#/today, mw-1fwagb.5, the grilling mw-6ww.126): the day's pieces in one list, each a tap into its drill or Logos: Review (n due, opens Review), the
// reading plan's next chapter (Read in Logos, Read in Lampas, Listen in Audible), the day's Psalms and Proverbs (src/data/daily/psalmsProverbs.ts, each opens Logos), and today's
// devotional (opens Logos at the day). A piece shows only while its Settings > Daily switch is On AND the settings it rests on are (Read in Logos needs Logos On, Listen in Audible an
// Audio Bible). With Tick boxes On each piece has a box HE ticks (nothing ticks by itself, not even by opening the link); Off, Today is a plain list of links. A link tap is also kept as
// 'opened' for the local date (dailyStore.ts). With nothing On, Today explains what it could hold, each with a link to the Settings row that turns it on; once he changes a Daily row
// that explanation is not shown again (an empty Today then names only where to choose). The day is the LOCAL date, read again when the app comes back to the front.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { devotionalForDay, tickedDevotionals } from '../data/daily/devotionals';
import { getDay, getExplained, localDate, markOpened, noteExplained, setTicked } from '../data/daily/dailyStore';
import { dailyReadings } from '../data/daily/psalmsProverbs';
import { countDue, getLogosBible, getStudyResources } from '../data/repositories';
import { useLatestLiveQuery } from '../data/useLatestLiveQuery';
import { bookOf } from '../data/books';
import { navigate, openReader } from '../nav/route';
import { useScrollMemory } from '../nav/scrollMemory';
import { chapterName } from '../plan/chapterName';
import { SendOff } from '../plan/SendOff';
import { StartPlan } from '../plan/StartPlan';
import { usePlan } from '../plan/usePlan';
import { useSendOff } from '../plan/useSendOff';
import { devotionalLink } from '../resources/logosDevotional';
import { chapterLink, verseLink } from '../resources/logosBible';
import { audibleChapterLabel, audibleListen, audioBibleOf } from '../resources/audioBible';
import { armFallback } from '../resources/openApp';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, audioBibleSetting, devotionalDrawSetting, devotionalSetting } from '../settings/definitions';
import { openSetting } from '../settings/link';
import { useSetting } from '../settings/store';
import { useReportScreen } from '../tutor/screenContext';
import { useToday } from './useToday';

const LINK = 'flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-lg px-3 py-2 text-left active:bg-line';
const ACTION = 'flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line';
const HEADING = 'px-1 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-muted';

interface Ticks {
  /** whether the pieces have a box at all (Tick boxes On) */
  on: boolean;
  ticked: readonly string[];
  date: string;
}

/** One piece: its box (with Tick boxes On) and what it holds. The box is his alone to tick. */
function Piece({ id, label, ticks, children }: { id: string; label: string; ticks: Ticks; children: ReactNode }) {
  const done = ticks.ticked.includes(id);
  return (
    <li data-piece={id} className="flex items-stretch gap-1 py-1">
      {ticks.on ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Done: ${label}`}
          onClick={() => void setTicked(ticks.date, id, !done)}
          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg active:bg-line"
        >
          <span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-md border-2 text-base ${done ? 'border-accent bg-accent text-accent-fg' : 'border-line'}`}>
            {done ? '✓' : ''}
          </span>
        </button>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col justify-center">{children}</div>
    </li>
  );
}

const List = ({ children }: { children: ReactNode }) => <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-1">{children}</ul>;

function ReviewPiece({ ticks }: { ticks: Ticks }) {
  const due = useLatestLiveQuery(() => countDue());
  if (due === undefined) return null;
  const open = (): void => {
    void markOpened(ticks.date, 'review');
    navigate('review');
  };
  return (
    <section aria-label="Review">
      <h2 className={HEADING}>Review</h2>
      <List>
        <Piece id="review" label="Review" ticks={ticks}>
          <button type="button" onClick={open} className={LINK}>
            <span className="text-lg font-medium text-accent">{due === 0 ? 'Nothing due' : `${due} due`}</span>
            <span className="text-sm text-muted">{due === 0 ? 'Open Review anyway' : 'Open Review'}</span>
          </button>
        </Piece>
      </List>
    </section>
  );
}

function PlanPiece({ ticks, date }: { ticks: Ticks; date: string }) {
  const plan = usePlan();
  const resources = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const audioId = useSetting(audioBibleSetting);
  const sendOff = useSendOff();
  const [starting, setStarting] = useState(false);
  if (!plan || !resources || bible === undefined || audioId === undefined) return null;
  const { started } = plan;
  const next = started?.next;
  let body: ReactNode;
  if (!next) {
    body = (
      <Piece id="plan" label="Reading plan" ticks={ticks}>
        <p className="px-3 text-base text-muted">{started ? 'Your plan is finished.' : 'No reading plan is started.'}</p>
        <button type="button" onClick={() => setStarting(true)} className={`${ACTION} mx-1 my-1 self-start`}>
          Start a plan
        </button>
      </Piece>
    );
  } else {
    const name = chapterName(next);
    const logosOn = resources.on.includes('logos');
    const logos = logosOn ? verseLink(next.code, next.chapter, undefined, bible) : undefined;
    const audio = audioBibleOf(audioId);
    const inLampas = bookOf(next.code) !== undefined;
    const listen = audio && audibleChapterLabel(next.code, next.chapter) !== undefined ? audio : undefined;
    const opened = (): void => void markOpened(date, 'plan');
    body = (
      <Piece id="plan" label={name} ticks={ticks}>
        <p className="px-3 text-lg font-medium">{`Next: ${name}`}</p>
        <p className="px-3 text-sm text-muted">{`${started!.count.toLocaleString('en-US')} of ${started!.total.toLocaleString('en-US')} chapters done`}</p>
        <div className="flex flex-wrap gap-2 px-2 pb-1 pt-2">
          {logos ? (
            <a href={logos.url} data-fallback={logos.fallback} onClick={() => { opened(); armFallback(logos.fallback); }} className={ACTION}>
              Read in Logos
            </a>
          ) : null}
          {inLampas ? (
            <button type="button" onClick={() => { opened(); openReader({ book: next.code, chapter: next.chapter }); }} className={ACTION}>
              Read in Lampas
            </button>
          ) : null}
          {listen ? (
            <a
              href={audibleListen(listen, next.code, next.chapter).href}
              aria-label={`Listen in Audible: ${listen.name}, ${audibleChapterLabel(next.code, next.chapter)}`}
              onClick={(e) => { opened(); sendOff.tap(e, { audio: listen, code: next.code, chapter: next.chapter }); }}
              className={ACTION}
            >
              Listen in Audible
            </a>
          ) : null}
        </div>
        {logos || inLampas || listen ? null : (
          <div className="flex flex-wrap gap-2 px-2 pb-1 pt-1">
            <button type="button" onClick={() => openSetting('resource.logos')} className={ACTION}>
              Turn on Logos to read it
            </button>
            <button type="button" onClick={() => openSetting('audioBible')} className={ACTION}>
              Choose an Audio Bible
            </button>
          </div>
        )}
      </Piece>
    );
  }
  return (
    <section aria-label="Reading plan">
      <h2 className={HEADING}>Reading plan</h2>
      <List>{body}</List>
      <SendOff send={sendOff} />
      {starting ? <StartPlan onClose={() => setStarting(false)} /> : null}
    </section>
  );
}

const passageName = (code: string, chapter: number): string => `${code === 'psa' ? 'Psalm' : 'Proverbs'} ${chapter}`;

function PsalmsPiece({ ticks, today }: { ticks: Ticks; today: Date }) {
  const bible = useLiveQuery(getLogosBible, []);
  if (bible === undefined) return null;
  return (
    <section aria-label="Psalms and Proverbs">
      <h2 className={HEADING}>Psalms and Proverbs</h2>
      <List>
        {dailyReadings(today).map((reading) => {
          const id = `${reading.code}.${reading.chapter}`;
          const name = passageName(reading.code, reading.chapter);
          const link = chapterLink(reading.code, reading.chapter, bible);
          return (
            <Piece key={id} id={id} label={name} ticks={ticks}>
              {link ? (
                <a href={link.url} data-fallback={link.fallback} onClick={() => { void markOpened(ticks.date, id); armFallback(link.fallback); }} className={LINK}>
                  <span className="text-lg font-medium text-accent">{name}</span>
                  <span className="text-sm text-muted">Open in Logos</span>
                </a>
              ) : (
                <p className="px-3 py-2 text-lg">{name}</p>
              )}
            </Piece>
          );
        })}
      </List>
    </section>
  );
}

function DevotionalPiece({ ticks, today }: { ticks: Ticks; today: Date }) {
  const choice = useSetting(devotionalSetting);
  const draw = useSetting(devotionalDrawSetting);
  if (choice === undefined || draw === undefined) return null;
  const devotional = devotionalForDay(choice, tickedDevotionals(draw), today);
  const link = devotionalLink(devotional.id, today);
  return (
    <section aria-label="Devotional">
      <h2 className={HEADING}>Devotional</h2>
      <List>
        <Piece id="devotional" label={devotional.title} ticks={ticks}>
          <a href={link.url} data-fallback={link.fallback} onClick={() => { void markOpened(ticks.date, 'devotional'); armFallback(link.fallback); }} className={LINK}>
            <span className="text-lg font-medium text-accent">{devotional.title}</span>
            <span className="text-sm text-muted">{devotional.author ? `${devotional.author} · Open in Logos` : 'Open in Logos'}</span>
          </a>
        </Piece>
      </List>
    </section>
  );
}

/** What Today could hold, each with the Settings row that turns it on. */
const COULD_HOLD: readonly { key: string; name: string; text: string }[] = [
  { key: 'dailyReview', name: 'Review', text: 'the words and ideas that are due' },
  { key: 'dailyPlan', name: 'Reading plan', text: "the reading plan's chapter for the day" },
  { key: 'dailyPsalms', name: 'Psalms and Proverbs', text: "the day's Psalms and Proverbs, opened in Logos" },
  { key: 'dailyDevotional', name: 'Devotional', text: 'one devotional for the day, opened in Logos' },
];

/** With nothing switched on: the first time, a kind explanation of what Today could hold; once he has changed a Daily row, only where to choose. */
function Nothing() {
  const explained = useLiveQuery(async () => ({ at: await getExplained() }), []);
  useEffect(() => {
    if (explained && explained.at === undefined) void noteExplained();
  }, [explained]);
  if (!explained) return null;
  if (explained.at === 'done') {
    return (
      <section data-testid="today-empty" aria-label="Nothing on Today" className="px-1 pt-6">
        <p className="text-lg">Nothing is switched on for Today.</p>
        <button type="button" onClick={() => openSetting('dailyReview')} className={`${ACTION} mt-3`}>
          Choose in Settings
        </button>
      </section>
    );
  }
  return (
    <section data-testid="today-explained" aria-label="What Today could hold" className="px-1 pt-6">
      <p className="text-lg font-medium">Today is empty for now.</p>
      <p className="pt-1 text-base text-muted">It can gather the day in one place, and you choose what goes on it. Turn on any of these:</p>
      <ul className="divide-y divide-line pt-3">
        {COULD_HOLD.map((piece) => (
          <li key={piece.key} className="py-2">
            <p className="text-base font-medium">{piece.name}</p>
            <p className="text-base text-muted">{piece.text}</p>
            <button type="button" onClick={() => openSetting(piece.key)} className={`${ACTION} mt-1`}>
              {`Turn on ${piece.name} in Settings`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Today() {
  const today = useToday();
  const date = localDate(today);
  const review = useSetting(dailyReviewSetting);
  const plan = useSetting(dailyPlanSetting);
  const psalms = useSetting(dailyPsalmsSetting);
  const devotional = useSetting(dailyDevotionalSetting);
  const tickBoxes = useSetting(dailyTicksSetting);
  const day = useLiveQuery(() => getDay(date), [date]);
  const scrollRef = useScrollMemory('today');
  const shown = [review, plan, psalms, devotional];
  const ready = !shown.includes(undefined) && tickBoxes !== undefined && day !== undefined;
  const none = ready && shown.every((s) => s === 'off');
  useReportScreen({ name: 'Today', facts: ready ? [{ label: 'On Today', value: COULD_HOLD.filter((_, i) => shown[i] === 'on').map((p) => p.name).join(', ') || 'nothing' }] : [] });
  const ticks: Ticks = { on: tickBoxes === 'on', ticked: day?.ticked ?? [], date };
  return (
    <>
      <ScreenHeader title="Today" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} action={<HeaderButton onClick={() => openSetting('dailyReview')}>Settings</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-3">
        <div>
          {!ready ? null : none ? <Nothing /> : null}
          {ready && review === 'on' ? <ReviewPiece ticks={ticks} /> : null}
          {ready && plan === 'on' ? <PlanPiece ticks={ticks} date={date} /> : null}
          {ready && psalms === 'on' ? <PsalmsPiece ticks={ticks} today={today} /> : null}
          {ready && devotional === 'on' ? <DevotionalPiece ticks={ticks} today={today} /> : null}
        </div>
      </main>
    </>
  );
}
