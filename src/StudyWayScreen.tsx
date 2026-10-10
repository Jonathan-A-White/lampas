// src/StudyWayScreen.tsx — My study way (mw-5r3p30.76, #/studyway, Settings > My study way; the page's name is PROVISIONAL, the Governor to confirm):
// the lines the reader kept about how the tutor quizzes him. Each line can be edited or deleted; they go in every quiz request, and the tutor
// lets them override its default method. They are added in a quiz Talk, by Keep this (src/Talk.tsx); the page only reads, edits and deletes.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { deleteStudyWayLine, editStudyWayLine, listStudyWay, STUDY_WAY_LINE_MAX, STUDY_WAY_MAX } from './data/repositories';
import { navigate } from './nav/route';
import { usePageActions } from './PageActions';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

const BUTTON = 'min-h-12 min-w-12 rounded-lg px-3 text-base font-medium text-accent active:bg-line';

const SAYS = {
  empty: 'A line cannot be empty or longer than 100 characters.',
  already: 'You already have that line.',
  missing: 'That line is gone.',
} as const;

/** One kept line: its text with Edit and Delete, or, while it is being edited, a field with Save and Cancel. */
function Line({ line }: { line: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(line);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async (): Promise<void> => {
    const result = await editStudyWayLine(line, text);
    if (result === 'saved') {
      setEditing(false);
      setProblem(null);
    } else setProblem(SAYS[result]);
  };
  if (editing) {
    return (
      <li data-study-way-line className="border-b border-line py-3">
        <textarea
          aria-label="Study way line"
          rows={2}
          maxLength={STUDY_WAY_LINE_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg"
        />
        {problem ? (
          <p role="alert" className="pt-1 text-base text-bad">
            {problem}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { setEditing(false); setText(line); setProblem(null); }} className={BUTTON}>
            Cancel
          </button>
          <button type="button" onClick={() => void save()} className="min-h-12 min-w-12 rounded-xl bg-accent px-5 text-base font-medium text-accent-fg">
            Save
          </button>
        </div>
      </li>
    );
  }
  return (
    <li data-study-way-line className="border-b border-line py-3">
      <p data-line-text data-read-block className="break-words text-lg">
        {line}
      </p>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" aria-label={`Edit: ${line}`} onClick={() => setEditing(true)} className={BUTTON}>
          Edit
        </button>
        <button type="button" aria-label={`Delete: ${line}`} onClick={() => void deleteStudyWayLine(line)} className={BUTTON}>
          Delete
        </button>
      </div>
    </li>
  );
}

export function StudyWayScreen() {
  const lines = useLiveQuery(listStudyWay, []);
  const { buttons, notice } = usePageActions('#/studyway', 'My study way');
  return (
    <>
      <ScreenHeader title="My study way" back={<HeaderButton onClick={() => navigate('settings')}>‹ Settings</HeaderButton>} action={buttons} />
      {notice}
      <main className="screen min-h-0 flex-1 px-4">
        <div>
          <p data-read-block className="py-4 text-base text-muted">
            How you want the tutor to quiz you. Every quiz is sent these lines, and where one conflicts with the tutor&apos;s usual method, yours wins. To add one,
            tell the tutor in a quiz how you want it different; when it proposes a line, tap Keep this. Up to {STUDY_WAY_MAX} lines. They stay on this phone and
            go only to the tutor, in a quiz.
          </p>
          {lines === undefined ? null : lines.length === 0 ? (
            <p data-study-way-empty data-read-block className="py-4 text-lg">
              Nothing kept yet. In a quiz, say how you want it different, such as “shorter quizzes” or “skip the map”.
            </p>
          ) : (
            <ul aria-label="Your study way">
              {lines.map((line) => (
                <Line key={line} line={line} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
