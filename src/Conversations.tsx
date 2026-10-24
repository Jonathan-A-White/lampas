// src/Conversations.tsx — Conversations (mw-5r3p30.696, #/conversations, reached from Settings > More): every tutor conversation kept on the phone, the one with the newest
// last turn first, each as Share to Lampas > Choose a talk draws it (src/share/TalkRow.tsx) with the first line of its last question. The list and its one search field are
// voice-kit's TalkList over the kept talks (bibleTalks, mw-o480n1.9): the field filters them by any words of their questions and answers, on the phone (conversationSearch),
// and the row then shows the line of the newest pair that matched. A tap opens the conversation in the Talk sheet over a scope made from its key (src/share/talkScope.ts,
// src/share/ShareTalk.tsx), with its turns shown and ready for the next question; closing the sheet returns to the list as it was. Read only: nothing is deleted or renamed here.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { TalkList, type TalkListRow } from 'voice-kit/talks/react';
import { bibleTalks, conversationSearch, countTurns, type BibleTurnFields, type ConversationFields } from './data/repositories';
import { backTo } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { TalkHost } from './share/ShareTalk';
import { firstLine, placeOf } from './share/talkPlace';
import { useTalkScope } from './share/talkScope';
import { TalkRow } from './share/TalkRow';
import { focusOnMount } from './ui/focus';

const LABELS = {
  empty: 'No conversations yet. Each talk you have with the tutor is kept here.',
  noMatches: 'No conversation has those words in a question or an answer.',
  placeholder: 'Search your conversations',
  searchLabel: 'Search conversations',
  listLabel: 'Conversations',
};

const CLASS_NAMES = {
  searchWrap: 'sticky top-0 z-10 -mx-4 bg-canvas px-4 pb-2 pt-3',
  search: 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg',
  list: 'space-y-2 pb-4',
};

/** The line under a row: a search's newest matching pair's line, else the first line of the conversation's last question. */
function lineOf(row: TalkListRow<BibleTurnFields>): string {
  const matches = row.hit?.matches.filter((match) => match.in === 'turn');
  const found = matches?.[matches.length - 1];
  return found ? found.snippet : firstLine((row.summary.fields as ConversationFields).lastQuestion);
}

/** The Talk sheet over the conversation `open`, or what stands in its place while its chapter loads or when it cannot be had. */
function OpenConversation({ open, onClose }: { open: string; onClose: () => void }) {
  const scope = useTalkScope(open);
  if (scope?.status === 'ready') return <TalkHost scope={scope.scope} talkRef={open} book={scope.book} chapter={scope.chapter} onClose={onClose} />;
  if (scope?.status !== 'failed') return null;
  return (
    <div role="alert" className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-6">
      <div className="max-w-sm rounded-xl bg-surface p-4 text-center">
        <p className="text-lg">{`${scope.title} is not on this phone yet, and you are offline.`}</p>
        <button type="button" onClick={scope.retry} className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg">
          Try again
        </button>
        <button type="button" ref={focusOnMount} onClick={onClose} className="mt-3 block min-h-12 w-full rounded-xl border border-line text-lg font-medium">
          Close
        </button>
      </div>
    </div>
  );
}

export function Conversations() {
  const [open, setOpen] = useState<string | null>(null);
  // a turn sent from the opened sheet adds a row to the kept talks, which reads the list again as it always did
  const kept = useLiveQuery(countTurns, []);
  return (
    <>
      <ScreenHeader title="Conversations" back={<HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <TalkList
          store={bibleTalks}
          onOpen={setOpen}
          search={conversationSearch}
          refreshKey={kept}
          // a key this app does not make cannot be opened, so it is not listed
          filter={(row) => placeOf(row.id) !== null}
          renderRow={(row, pick) => <TalkRow talk={{ ref: row.id, lastWhen: row.updatedAt }} line={lineOf(row)} onPick={pick} />}
          renderNote={(kind, text) => (
            <p data-conversations-empty={kind === 'failed' ? undefined : ''} role={kind === 'failed' ? 'alert' : undefined} className="py-4 text-lg">
              {text}
            </p>
          )}
          labels={LABELS}
          classNames={CLASS_NAMES}
        />
      </main>
      {open ? <OpenConversation open={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
