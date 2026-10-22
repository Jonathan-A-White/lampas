// src/library/TypedBible.tsx — the one escape hatch of the Library (docs/design/library-at-scale.md 12, Q8): on the Bibles page, the Resource ID of a Bible he owns that the catalogue lacks can be typed,
// and Old Testament chapters then open in it. A typed ID is kept as soon as it is well formed. Choosing a Bible of the list writes the same setting (KindPage.tsx), so Bible in Logos is one fact.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { getLogosBible, setLogosBible } from '../data/repositories';
import { entryOf } from '../resources/catalogue';
import { DEFAULT_LOGOS_BIBLE, isResourceId } from '../resources/logosBible';

export function TypedBible() {
  const saved = useLiveQuery(getLogosBible, []);
  const [typed, setTyped] = useState('');
  // the field follows the saved Bible when it changes elsewhere (choosing one of the list), but not when it is his own typing coming back a moment later: the saved text
  // arrives one keystroke behind, so every text he has written is remembered and none of them moves the field
  const written = useRef(new Set<string>());
  useEffect(() => {
    if (saved !== undefined && !written.current.has(saved)) setTyped(saved);
  }, [saved]);
  if (saved === undefined) return null;
  const bad = typed.trim() !== '' && !isResourceId(typed);
  return (
    <div className="mt-3">
      <p className="text-base">
        Old Testament chapters open in <span className="font-medium">{entryOf(saved)?.short ?? saved}</span>.
      </p>
      <label className="mt-2 block">
        <span className="block text-base font-medium">Resource ID</span>
        <input
          type="text"
          value={typed}
          aria-describedby="logos-bible-hint"
          aria-invalid={bad}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setTyped(e.target.value);
            if (isResourceId(e.target.value)) {
              written.current.add(e.target.value.trim());
              void setLogosBible(e.target.value);
            }
          }}
          className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
        />
      </label>
      <p id="logos-bible-hint" role={bad ? 'alert' : undefined} className="pt-1 text-sm text-muted">
        {bad
          ? `That is not a Resource ID. It looks like ${DEFAULT_LOGOS_BIBLE}.`
          : "Only for a Bible the list lacks. Logos shows a book's Resource ID in its Information pane."}
      </p>
    </div>
  );
}
