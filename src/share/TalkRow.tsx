// src/share/TalkRow.tsx — one kept conversation as a list shows it (mw-5r3p30.696): its place in words and the date of its last turn on the first line, a line of what was
// said under them. Share to Lampas > Choose a talk and the Conversations screen draw their rows with this one, so the two lists never drift apart.
import type { Conversation } from '../data/repositories';
import { dateText, talkLabel } from './talkPlace';

/** The button style of a row: the Share sheet's choices have it too. */
const TALK_ROW = 'flex min-h-14 w-full flex-col justify-center rounded-xl border px-4 py-2 text-left active:bg-line border-line bg-surface';

/** The row of `talk`; `line` is what is said under its name (its first question in the Share sheet, its last question or the line a search found in Conversations). */
export function TalkRow({ talk, line, onPick }: { talk: Pick<Conversation, 'ref' | 'lastWhen'>; line: string; onPick: (ref: string) => void }) {
  return (
    <button type="button" data-recent-talk={talk.ref} onClick={() => onPick(talk.ref)} className={TALK_ROW}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="title-wrap text-lg font-medium">{talkLabel(talk.ref)}</span>{' '}
        <span className="shrink-0 text-sm text-muted">{dateText(talk.lastWhen)}</span>
      </span>{' '}
      <span className="title-wrap text-base text-muted">{line}</span>
    </button>
  );
}
