// src/MemoryScreen.tsx — Memory (mw-yrmkdf.1, #/memory, Settings > Memory): the notes Lampas keeps about the reader on this phone (src/data/repositories/memory.ts).
// The index he can write, with the notes section the app keeps under it; the named notes, each with when it was changed and by whom, which he can edit or
// delete (the page never adds one); Export (one file) and Import (a file, read and shown first, then put in place of what is kept once he says so).
// Nothing here is sent to the tutor yet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { downloadSeam } from './audio/clip';
import {
  MEMORY_INDEX_BODY_MAX,
  MEMORY_NOTE_MAX,
  exportMemory,
  getIndex,
  listNotes,
  putNote,
  readMemoryFile,
  removeNote,
  replaceMemory,
  setIndex,
  type MemoryBy,
  type MemoryFile,
  type MemoryNote,
} from './data/repositories/memory';
import { backTo } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

const BUTTON = 'min-h-12 min-w-12 rounded-lg px-3 text-base font-medium text-accent active:bg-line';
const PRIMARY = 'min-h-12 min-w-12 rounded-xl bg-accent px-5 text-base font-medium text-accent-fg';
const OUTLINE = 'min-h-12 min-w-12 rounded-xl border border-line px-5 text-base font-medium';
const FIELD = 'block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg';

const WHO: Record<MemoryBy, string> = { me: 'you', tutor: 'the tutor' };
const SAYS = {
  'bad-name': 'That name is not one a note can have.',
  empty: 'A note cannot be empty.',
  'too-long': `A note can be at most ${MEMORY_NOTE_MAX} characters.`,
  full: 'There is no room for another note.',
} as const;

const changed = (note: { when: number; by: MemoryBy }): string => `Changed ${new Date(note.when).toLocaleDateString()} by ${WHO[note.by]}`;
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** One note: its name, text and who changed it when, with Edit and Delete; Edit shows a field with Save and Cancel, Delete asks once more. */
function Note({ note }: { note: MemoryNote }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [text, setText] = useState(note.text);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async (): Promise<void> => {
    const result = await putNote(note.name, text, 'me');
    if (result === 'saved') {
      setMode('view');
      setProblem(null);
    } else setProblem(SAYS[result]);
  };
  if (mode === 'edit') {
    return (
      <li data-memory-note className="border-b border-line py-3">
        <p data-note-name className="break-words text-lg font-medium">
          {note.name}
        </p>
        <textarea aria-label={`Note: ${note.name}`} rows={4} maxLength={MEMORY_NOTE_MAX} value={text} onChange={(e) => setText(e.target.value)} className={FIELD} />
        {problem ? (
          <p role="alert" className="pt-1 text-base text-bad">
            {problem}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { setMode('view'); setText(note.text); setProblem(null); }} className={BUTTON}>
            Cancel
          </button>
          <button type="button" onClick={() => void save()} className={PRIMARY}>
            Save
          </button>
        </div>
      </li>
    );
  }
  return (
    <li data-memory-note className="border-b border-line py-3">
      <p data-note-name className="break-words text-lg font-medium">
        {note.name}
      </p>
      <p data-note-text className="whitespace-pre-line break-words text-lg">
        {note.text}
      </p>
      <p data-note-changed className="text-base text-muted">
        {changed(note)}
      </p>
      {mode === 'delete' ? (
        <div className="pt-1">
          <p className="text-base">Delete this note?</p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setMode('view')} className={BUTTON}>
              Keep it
            </button>
            <button type="button" aria-label={`Yes, delete: ${note.name}`} onClick={() => void removeNote(note.name)} className={`${OUTLINE} text-bad`}>
              Yes, delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" aria-label={`Edit: ${note.name}`} onClick={() => setMode('edit')} className={BUTTON}>
            Edit
          </button>
          <button type="button" aria-label={`Delete: ${note.name}`} onClick={() => setMode('delete')} className={BUTTON}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/** The index he writes, saved as he types, with the notes section the app keeps under it. */
function Index({ body, notes, when, by }: { body: string; notes: string; when?: number; by?: MemoryBy }) {
  const [text, setText] = useState(body);
  return (
    <section className="py-3">
      <label htmlFor="memory-index" className="block pb-1 text-lg font-medium">
        Index
      </label>
      <textarea
        id="memory-index"
        rows={6}
        maxLength={MEMORY_INDEX_BODY_MAX}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          void setIndex(e.target.value, 'me');
        }}
        className={FIELD}
      />
      <p className="pt-1 text-base text-muted">
        What the tutor should always remember about you. Up to {MEMORY_INDEX_BODY_MAX} characters.
        {when !== undefined && by !== undefined ? ` ${changed({ when, by })}.` : ''}
      </p>
      {notes === '' ? null : (
        <>
          <p className="pt-3 text-base text-muted">Lampas adds this list from your notes:</p>
          <p data-memory-notes-section className="whitespace-pre-line break-words rounded-lg bg-line/40 px-3 py-2 text-base">
            {notes}
          </p>
        </>
      )}
    </section>
  );
}

/** What a memory file holds, in words: 'the index and 2 notes: book:Romans, word:λόγος'. */
function describeFile(file: MemoryFile): string {
  const names = file.notes.map((n) => n.name);
  const notes = names.length === 0 ? 'no notes' : `${plural(names.length, 'note', 'notes')}: ${names.join(', ')}`;
  return file.index ? `the index and ${notes}` : notes;
}

const fileName = (): string => `lampas-memory-${new Date().toISOString().slice(0, 10)}.json`;

function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

type Picked = { kind: 'none' } | { kind: 'bad' } | { kind: 'file'; file: MemoryFile } | { kind: 'done'; what: string };

/** Export and Import: a download of the whole memory, and a file picked, read and shown before it replaces what is kept. */
function Transfer({ onReplaced }: { onReplaced: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked>({ kind: 'none' });
  const [saved, setSaved] = useState<string | null>(null);
  const exportFile = async (): Promise<void> => {
    const name = fileName();
    downloadSeam.save(name, new Blob([await exportMemory()], { type: 'application/json' }));
    setSaved(name);
  };
  const pick = async (file: File | undefined): Promise<void> => {
    if (input.current) input.current.value = '';
    if (!file) return;
    const read = readMemoryFile(await readText(file));
    setPicked(read ? { kind: 'file', file: read } : { kind: 'bad' });
  };
  const replace = async (file: MemoryFile): Promise<void> => {
    await replaceMemory(file);
    onReplaced();
    setPicked({ kind: 'done', what: describeFile(file) });
  };
  return (
    <section className="py-3">
      <p className="pb-1 text-lg font-medium">Keep a copy</p>
      <p className="pb-2 text-base text-muted">Export saves the index and all the notes as one file. Import puts a file like that back, in place of what is here now.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void exportFile()} className={OUTLINE}>
          Export
        </button>
        <button type="button" onClick={() => input.current?.click()} className={OUTLINE}>
          Import
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          aria-label="Memory file"
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      {saved ? (
        <p role="status" data-memory-saved className="pt-2 text-base">
          Saved {saved}.
        </p>
      ) : null}
      {picked.kind === 'bad' ? (
        <p role="alert" className="pt-2 text-base text-bad">
          That file is not a Lampas memory.
        </p>
      ) : null}
      {picked.kind === 'file' ? (
        <div className="pt-2">
          <p data-memory-read className="text-base">
            The file holds {describeFile(picked.file)}.
          </p>
          <p className="text-base text-muted">Replacing puts these in place of everything in your memory now.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPicked({ kind: 'none' })} className={BUTTON}>
              Cancel
            </button>
            <button type="button" onClick={() => void replace(picked.file)} className={PRIMARY}>
              Replace my memory
            </button>
          </div>
        </div>
      ) : null}
      {picked.kind === 'done' ? (
        <p role="status" className="pt-2 text-base">
          Your memory now holds {picked.what}.
        </p>
      ) : null}
    </section>
  );
}

export function MemoryScreen() {
  const kept = useLiveQuery(async () => ({ index: await getIndex(), notes: await listNotes() }), []);
  // an import puts new text in the index: the field starts again from what is kept
  const [replaced, setReplaced] = useState(0);
  return (
    <>
      <ScreenHeader title="Memory" back={<HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <p className="py-4 text-base text-muted">
          What Lampas keeps about you, on this phone only: an index, and notes about a book, a word or a subject. You can change or delete any of it.
        </p>
        {kept === undefined ? null : (
          <>
            <Index key={replaced} body={kept.index.body} notes={kept.index.notes} when={kept.index.when} by={kept.index.by} />
            <section className="py-3">
              <p className="pb-1 text-lg font-medium">Notes</p>
              {kept.notes.length === 0 ? (
                <p data-memory-notes-empty className="text-base text-muted">
                  None yet.
                </p>
              ) : (
                <ul aria-label="Notes">
                  {kept.notes.map((note) => (
                    <Note key={note.name} note={note} />
                  ))}
                </ul>
              )}
            </section>
            <Transfer onReplaced={() => setReplaced((n) => n + 1)} />
          </>
        )}
      </main>
    </>
  );
}
