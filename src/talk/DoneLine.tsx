// src/talk/DoneLine.tsx — what the tutor did through the app, on the Talk sheet (mw-t3xu9a.7, docs/ask-tutor.md 'What you see when the tutor does something'):
//   LookingLine  'Looking at your Logos books': the one line while the tutor's follow-up is out (the answer asked for facts of the app first); said to a screen reader too
//   DoneLine     one command the answer ran: the app's own line for it, with Undo when the command can be undone (the tap runs the undo and the line reads Put back), or for a command
//                that needs his yes (kind confirm) the question put to him and a button named by the command, which runs it only on the tap
import { useEffect, useState } from 'react';
import { updateDone, type TalkTurn, type TurnDone } from '../data/repositories';
import { bibleTalkRegistry } from '../tutor/registry';
import { announce } from '../ui/live';
import { buttonName } from './doneLines';
import { dropUndo, holdUndo, useUndo } from './doneUndo';

/** The line under his question while the tutor looks at something of his first. */
export function LookingLine({ text }: { text: string }) {
  useEffect(() => announce(text), [text]);
  return (
    <p data-talk-looking className="text-base text-muted">
      {text}
    </p>
  );
}

const CHIP = 'min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line disabled:opacity-40';

export function DoneLine({ turn, index, done }: { turn: TalkTurn; index: number; done: TurnDone }) {
  const undo = useUndo(turn.id, index);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const turnId = turn.id;

  const takeUndo = async (): Promise<void> => {
    if (!undo || turnId === undefined) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await undo();
      dropUndo(turnId, index);
      await updateDone(turnId, index, { state: 'undone' });
      announce('Put back');
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'It could not be put back.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (): Promise<void> => {
    if (turnId === undefined) return;
    setBusy(true);
    setProblem(undefined);
    try {
      // the command runs here, on his tap and never before: the registry checks the args again
      const ran = await bibleTalkRegistry().run(done.name, done.args ?? {});
      if (!ran.ok) {
        setProblem(ran.why);
        return;
      }
      if (ran.undo) holdUndo(turnId, index, ran.undo);
      await updateDone(turnId, index, { state: 'ran', said: ran.said });
      announce(ran.said);
    } finally {
      setBusy(false);
    }
  };

  const asking = done.kind === 'confirm' && done.state === undefined;
  return (
    <li data-talk-done={done.name} className="py-1">
      <div className="flex min-h-11 items-center gap-2">
        {done.state === 'undone' ? (
          <span className="min-w-0 flex-1 break-words text-base">
            <span className="text-muted line-through">{done.said}</span> <span className="font-medium">Put back</span>
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 break-words text-base">{done.said}</span>
            {asking ? (
              <button type="button" disabled={busy} onClick={() => void confirm()} className={`${CHIP} border border-accent`}>
                {buttonName(done.name)}
              </button>
            ) : undo ? (
              <button type="button" aria-label={`Undo ${done.said}`} disabled={busy} onClick={() => void takeUndo()} className={CHIP}>
                Undo
              </button>
            ) : null}
          </>
        )}
      </div>
      {problem ? (
        <p role="alert" className="text-base text-bad">
          {problem}
        </p>
      ) : null}
    </li>
  );
}
