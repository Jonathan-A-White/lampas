// src/library/TypedBible.tsx — the one escape hatch of the Library (docs/design/library-at-scale.md 12, Q8): on the Bibles page, the Resource ID of a Bible he owns that the catalogue lacks can be typed,
// and then he says which part it is for (PartChoice.tsx: the New Testament, the Old Testament, the Apocrypha, or all three). It writes the same Settings keys Settings > Study resources does, and only
// the part he names; the page's marks (KindPage.tsx) read them back, so Bible in Logos is one fact with one home.
import { useState } from 'react';
import { DEFAULT_LOGOS_BIBLE, isResourceId } from '../resources/logosBible';
import { PartChoice } from './PartChoice';

export function TypedBible() {
  const [typed, setTyped] = useState('');
  const bad = typed.trim() !== '' && !isResourceId(typed);
  return (
    <div className="mt-3">
      <label className="block">
        <span className="block text-base font-medium">Resource ID</span>
        <input
          type="text"
          value={typed}
          aria-describedby="logos-bible-hint"
          aria-invalid={bad}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setTyped(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
        />
      </label>
      <p id="logos-bible-hint" role={bad ? 'alert' : undefined} className="pt-1 text-sm text-muted">
        {bad
          ? `That is not a Resource ID. It looks like ${DEFAULT_LOGOS_BIBLE}.`
          : "Only for a Bible the list lacks. Logos shows a book's Resource ID in its Information pane."}
      </p>
      {isResourceId(typed) ? (
        <div className="pt-2">
          <p className="pb-1 text-base font-medium">Set it for</p>
          <PartChoice name={typed.trim()} resourceId={typed.trim()} onChosen={() => setTyped('')} />
        </div>
      ) : null}
    </div>
  );
}
