// src/AboutYouScreen.tsx — About you (mw-1vuvq6.1, #/aboutyou, Settings > About you): what the tutor may know of the student as a person, so its answers
// meet him where he is. Age, pace, ways of learning, background and why, each optional, saved as he types; the notes the tutor has learned, each
// editable and removable; Clear empties the lot. It stays on this phone and goes only to the tutor, in each request (src/data/learnerProfile.ts).
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  PROFILE_AGE_MAX,
  PROFILE_BACKGROUND_MAX,
  PROFILE_NOTE_MAX,
  PROFILE_WHY_MAX,
  PACES,
  WAYS,
  clearProfile,
  deleteProfileNote,
  editProfileNote,
  getProfile,
  saveProfile,
  type Pace,
  type Profile,
  type ProfileNote,
  type Way,
} from './data/repositories/profile';
import { navigate } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

const BUTTON = 'min-h-12 min-w-12 rounded-lg px-3 text-base font-medium text-accent active:bg-line';
const FIELD = 'block min-h-12 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-lg';
const CHOICE = 'inline-flex flex-wrap rounded-xl border border-line p-0.5';

const PACE_LABELS: Record<Pace, string> = { quick: 'Quick', steady: 'Steady', slow: 'Slow' };
const WAY_LABELS: Record<Way, string> = { hearing: 'Hearing', seeing: 'Seeing', reading: 'Reading', doing: 'Doing' };

const SAYS = {
  empty: `A note cannot be empty or longer than ${PROFILE_NOTE_MAX} characters.`,
  already: 'You already have that note.',
  missing: 'That note is gone.',
} as const;

/** One note the tutor learned: its text and when, with Edit and Remove, or, while it is being edited, a field with Save and Cancel. */
function Note({ note }: { note: ProfileNote }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async (): Promise<void> => {
    const result = await editProfileNote(note.text, text);
    if (result === 'saved') {
      setEditing(false);
      setProblem(null);
    } else setProblem(SAYS[result]);
  };
  if (editing) {
    return (
      <li data-profile-note className="border-b border-line py-3">
        <textarea aria-label="Note" rows={2} maxLength={PROFILE_NOTE_MAX} value={text} onChange={(e) => setText(e.target.value)} className={`${FIELD} resize-none`} />
        {problem ? (
          <p role="alert" className="pt-1 text-base text-bad">
            {problem}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { setEditing(false); setText(note.text); setProblem(null); }} className={BUTTON}>
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
    <li data-profile-note className="border-b border-line py-3">
      <p data-note-text className="break-words text-lg">
        {note.text}
      </p>
      <p className="text-base text-muted">Learned {new Date(note.when).toLocaleDateString()}</p>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" aria-label={`Edit: ${note.text}`} onClick={() => setEditing(true)} className={BUTTON}>
          Edit
        </button>
        <button type="button" aria-label={`Remove: ${note.text}`} onClick={() => void deleteProfileNote(note.text)} className={BUTTON}>
          Remove
        </button>
      </div>
    </li>
  );
}

/** The fields, drawn once the profile is read: the text fields keep what he types and save it as he goes, the choices follow what is kept. */
function Form({ profile }: { profile: Profile }) {
  const [age, setAge] = useState(profile.age ?? '');
  const [background, setBackground] = useState(profile.background ?? '');
  const [why, setWhy] = useState(profile.why ?? '');
  const [cleared, setCleared] = useState(0);
  const filled = age.trim() !== '' || background.trim() !== '' || why.trim() !== '' || profile.pace !== undefined || profile.ways.length > 0 || profile.notes.length > 0;
  const toggle = (way: Way): void => void saveProfile({ ways: profile.ways.includes(way) ? profile.ways.filter((w) => w !== way) : [...profile.ways, way] });
  const clear = async (): Promise<void> => {
    await clearProfile();
    setAge('');
    setBackground('');
    setWhy('');
    setCleared((n) => n + 1);
  };
  return (
    <div key={cleared}>
      <div className="py-3">
        <label htmlFor="about-age" className="block pb-1 text-lg font-medium">
          Age
        </label>
        <input
          id="about-age"
          type="text"
          autoComplete="off"
          maxLength={PROFILE_AGE_MAX}
          value={age}
          onChange={(e) => {
            setAge(e.target.value);
            void saveProfile({ age: e.target.value });
          }}
          className={FIELD}
        />
        <p className="pt-1 text-base text-muted">A number or a range, such as 34 or 60s.</p>
      </div>
      <div className="py-3">
        <p className="pb-1 text-lg font-medium">How fast</p>
        <div role="group" aria-label="Pace" className={CHOICE}>
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={profile.pace === p}
              onClick={() => void saveProfile({ pace: profile.pace === p ? null : p })}
              className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${profile.pace === p ? 'bg-accent text-accent-fg' : 'text-fg'}`}
            >
              {PACE_LABELS[p]}
            </button>
          ))}
        </div>
        <p className="pt-1 text-base text-muted">Do you like to go quickly, at a steady pace, or slowly? Tap again to clear it.</p>
      </div>
      <div className="py-3">
        <p className="pb-1 text-lg font-medium">How you learn best</p>
        <div role="group" aria-label="Ways of learning" className={CHOICE}>
          {WAYS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={profile.ways.includes(w)}
              onClick={() => toggle(w)}
              className={`min-h-12 min-w-12 rounded-lg px-4 text-base font-medium ${profile.ways.includes(w) ? 'bg-accent text-accent-fg' : 'text-fg'}`}
            >
              {WAY_LABELS[w]}
            </button>
          ))}
        </div>
        <p className="pt-1 text-base text-muted">Choose any: hearing it, seeing it, reading it, or doing it with your hands.</p>
      </div>
      <div className="py-3">
        <label htmlFor="about-background" className="block pb-1 text-lg font-medium">
          Background
        </label>
        <textarea
          id="about-background"
          rows={3}
          maxLength={PROFILE_BACKGROUND_MAX}
          value={background}
          onChange={(e) => {
            setBackground(e.target.value);
            void saveProfile({ background: e.target.value });
          }}
          className={`${FIELD} resize-none`}
        />
        <p className="pt-1 text-base text-muted">Languages you know, and any Greek or Bible you have had before.</p>
      </div>
      <div className="py-3">
        <label htmlFor="about-why" className="block pb-1 text-lg font-medium">
          Why
        </label>
        <textarea
          id="about-why"
          rows={3}
          maxLength={PROFILE_WHY_MAX}
          value={why}
          onChange={(e) => {
            setWhy(e.target.value);
            void saveProfile({ why: e.target.value });
          }}
          className={`${FIELD} resize-none`}
        />
        <p className="pt-1 text-base text-muted">Why you are learning Greek.</p>
      </div>
      <div className="py-3">
        <p className="pb-1 text-lg font-medium">Notes the tutor has learned</p>
        {profile.notes.length === 0 ? (
          <p data-profile-notes-empty className="text-base text-muted">
            None yet.
          </p>
        ) : (
          <ul aria-label="Notes the tutor has learned">
            {profile.notes.map((note) => (
              <Note key={note.text} note={note} />
            ))}
          </ul>
        )}
      </div>
      <div className="py-3">
        <button
          type="button"
          disabled={!filled}
          onClick={() => void clear()}
          className="min-h-12 min-w-12 rounded-xl border border-line px-5 text-base font-medium text-bad disabled:text-muted"
        >
          Clear
        </button>
        <p className="pt-1 text-base text-muted">Empties everything on this page, the notes too.</p>
      </div>
    </div>
  );
}

export function AboutYouScreen() {
  const profile = useLiveQuery(getProfile, []);
  return (
    <>
      <ScreenHeader title="About you" back={<HeaderButton onClick={() => navigate('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <p className="py-4 text-base text-muted">
          Tell the tutor about you, so its answers meet you where you are. Everything here is optional. It stays on this phone and goes only to the tutor, in
          what you ask it.
        </p>
        {profile === undefined ? null : <Form profile={profile} />}
      </main>
    </>
  );
}
