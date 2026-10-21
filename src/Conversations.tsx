// src/Conversations.tsx — Conversations (mw-5r3p30.696, #/conversations, reached from Settings > More): every tutor conversation kept on the phone, the one with the newest
// last turn first, each as Share to Lampas > Choose a talk draws it (src/share/TalkRow.tsx) with the first line of its last question. One search field filters them by any
// words of their questions and answers, on the phone (data/repositories/talks.ts searchConversations), and the row then shows the matching line. A tap opens the conversation
// in the Talk sheet over a scope made from its key (src/share/talkScope.ts, src/share/ShareTalk.tsx), with its turns shown and ready for the next question; closing the sheet
// returns to the list as it was. Read only: nothing is deleted or renamed here.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { listConversations, searchConversations } from './data/repositories';
import { backTo } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { TalkHost } from './share/ShareTalk';
import { placeOf } from './share/talkPlace';
import { useTalkScope } from './share/talkScope';
import { firstLine, TalkRow } from './share/TalkRow';
import { focusOnMount } from './ui/focus';

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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const searching = query.trim() !== '';
  // the rows with the line under each: a search's matching line, else the first line of the last question; a key this app does not make cannot be opened, so it is not listed
  const rows = useLiveQuery(
    async () => {
      const found = searching ? await searchConversations(query) : (await listConversations()).map((c) => ({ ...c, line: firstLine(c.lastQuestion) }));
      return found.filter((c) => placeOf(c.ref) !== null);
    },
    [query],
  );
  return (
    <>
      <ScreenHeader title="Conversations" back={<HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <div className="sticky top-0 z-10 -mx-4 bg-canvas px-4 pb-2 pt-3">
          <input
            type="search"
            value={query}
            placeholder="Search your conversations"
            aria-label="Search conversations"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
        </div>
        {rows === undefined ? null : rows.length === 0 ? (
          <p data-conversations-empty className="py-4 text-lg">
            {searching ? 'No conversation has those words in a question or an answer.' : 'No conversations yet. Each talk you have with the tutor is kept here.'}
          </p>
        ) : (
          <ul aria-label="Conversations" className="space-y-2 pb-4">
            {rows.map((row) => (
              <li key={row.ref}>
                <TalkRow talk={row} line={row.line} onPick={setOpen} />
              </li>
            ))}
          </ul>
        )}
      </main>
      {open ? <OpenConversation open={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
