// src/ipa/OptionalEntry.tsx — the one way into the course 'Learn the IPA sounds' (mw-5r3p30.356): an 'Optional' heading and its entries on the Goal screen, below the main path. One for Greek, as it
// has always been, and one for Hebrew while his Hebrew dial is above 0 (mw-gdcyf98.24). The setting IPA lesson (src/settings/definitions/ipaCourse.ts) takes both away while it is Off.
// Nothing else in the app points to the course: no prompt, nudge, badge or tutor push (tests/unit/ipa-course.test.ts reads src/ for it).
import { openIpaCourse } from '../nav/route';
import { ipaCourseSetting } from '../settings/definitions/ipaCourse';
import { useInterestLevels } from '../settings/useInterestLevels';
import { useSetting } from '../settings/store';

const ENTRY = 'mt-1 flex min-h-12 w-full items-center rounded-xl border border-line px-4 py-2 text-left text-lg font-medium text-accent active:bg-line';

export function OptionalEntry() {
  const shown = useSetting(ipaCourseSetting);
  const levels = useInterestLevels();
  // nothing is drawn until the setting is read, nor while it is Off
  if (shown !== 'on') return null;
  return (
    <section aria-label="Optional" className="mt-6 pb-4 text-left">
      <h2 className="text-base font-medium text-muted">Optional</h2>
      <button type="button" data-testid="ipa-entry" onClick={() => openIpaCourse('grc')} className={ENTRY}>
        Learn the IPA sounds
      </button>
      {levels && levels.he >= 1 ? (
        <button type="button" data-testid="ipa-entry-he" onClick={() => openIpaCourse('he')} className={ENTRY}>
          Learn the IPA sounds of Hebrew
        </button>
      ) : null}
    </section>
  );
}
