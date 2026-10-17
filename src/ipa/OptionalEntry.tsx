// src/ipa/OptionalEntry.tsx — the one way into the course 'Learn the IPA sounds' (mw-5r3p30.356): an 'Optional' heading and one entry on the Goal screen, below the main path.
// Nothing else in the app points to the course: no prompt, nudge, badge or tutor push (tests/unit/ipa-course.test.ts reads src/ for it).
import { navigate } from '../nav/route';

export function OptionalEntry() {
  return (
    <section aria-label="Optional" className="mt-6 pb-4 text-left">
      <h2 className="text-base font-medium text-muted">Optional</h2>
      <button
        type="button"
        data-testid="ipa-entry"
        onClick={() => navigate('ipa')}
        className="mt-1 flex min-h-12 w-full items-center rounded-xl border border-line px-4 py-2 text-left text-lg font-medium text-accent active:bg-line"
      >
        Learn the IPA sounds
      </button>
    </section>
  );
}
