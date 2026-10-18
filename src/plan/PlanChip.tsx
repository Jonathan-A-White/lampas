// src/plan/PlanChip.tsx — the Plan chip in the Reader's row (mw-umv8sp.5, src/ReaderChips.tsx), in the look of the Due chip. With the Reading plan On and a plan started it says
// 'Next: Leviticus 4' and 'N of 1,189' with a thin bar of how far she is; a tap is Continue and opens the send-off sheet for that chapter (src/plan/SendOff.tsx), which records the
// start before Audible opens. With the plan Off, or On but not started, it reads 'Listen through the Bible' and opens Start a listening plan (StartPlan.tsx). With every chapter done it
// says so and a tap starts a plan again. With no audio Bible chosen (switched Off since) the tap opens Settings, where it is chosen. Not drawn until the plan has been read.
// The chip never shrinks below its text (mw-5r3p30.617): name and count are drawn whole and the row scrolls sideways when the chips outgrow the phone.
import { useState, type ReactNode } from 'react';
import { navigate } from '../nav/route';
import { CHIP, CHIP_ACCENT, CHIP_PLAIN } from '../chipStyle';
import { audioBibleOf } from '../resources/audioBible';
import { audioBibleSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';
import { chapterName } from './chapterName';
import { StartPlan } from './StartPlan';
import { SendOff } from './SendOff';
import type { SendOff as SendOffState } from './useSendOff';
import { usePlan } from './usePlan';
import { useSendOff } from './useSendOff';

const n = (count: number): string => count.toLocaleString('en-US');

/** The chip, the send-off sheet and the start sheet at fixed places: a plan started under the open start sheet changes the chip, and must not remount the sheet (it holds a history entry). */
function Chip({ children, sendOff, sheet }: { children: ReactNode; sendOff: SendOffState; sheet: ReactNode }) {
  return (
    <>
      {children}
      <SendOff send={sendOff} />
      {sheet}
    </>
  );
}

export function PlanChip() {
  const plan = usePlan();
  const audioId = useSetting(audioBibleSetting);
  const sendOff = useSendOff();
  const [starting, setStarting] = useState(false);
  if (!plan || audioId === undefined) return null;
  const { started } = plan;
  const sheet = starting ? <StartPlan onClose={() => setStarting(false)} /> : null;

  if (!started || !started.next) {
    const finished = Boolean(started);
    return (
      <Chip sendOff={sendOff} sheet={sheet}>
        <button
          type="button"
          data-testid="plan-chip"
          aria-label={finished ? `Plan done: ${n(started!.count)} of ${n(started!.total)} chapters` : 'Listen through the Bible'}
          onClick={() => setStarting(true)}
          className={`${CHIP} ${CHIP_PLAIN}`}
        >
          {finished ? `Done: ${n(started!.count)} of ${n(started!.total)}` : 'Listen through the Bible'}
        </button>
      </Chip>
    );
  }

  const { next, count, total } = started;
  const audio = audioBibleOf(audioId);
  const name = chapterName(next);
  const onTap = (): void => (audio ? sendOff.offer({ audio, code: next.code, chapter: next.chapter }) : navigate('settings'));
  return (
    <Chip sendOff={sendOff} sheet={sheet}>
      <button
        type="button"
        data-testid="plan-chip"
        aria-label={`Next: ${name}, ${n(count)} of ${n(total)} chapters done`}
        onClick={onTap}
        className={`${CHIP} ${CHIP_ACCENT} relative overflow-hidden`}
      >
        <span className="flex h-5 gap-x-1.5">
          <span>{`Next: ${name}`}</span>
          <span className="font-normal text-muted">{`${n(count)} of ${n(total)}`}</span>
        </span>
        <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-accent/20">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${(100 * count) / total}%` }} />
        </span>
      </button>
    </Chip>
  );
}
