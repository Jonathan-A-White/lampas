// src/reader/VariantLessonsOffer.tsx — the quiet card under the Reader's chips row (mw-9ji6ek0.19) that offers the five lessons on variant readings the first time Variants is On
// (by the chip or in Settings): 'New to variant readings? Five short lessons explain them.', Read the lessons (opens them) and Not now. Either answer puts it away for good;
// Not now also turns Settings > Reading > Variants > Offer the lessons Off, and the card's foot says where the lessons are found. Turning that On shows the card once more.
// Drawn only while Variants is not Off and Offer the lessons is On; PROVISIONAL: not gated by Tips.
import { useLiveQuery } from 'dexie-react-hooks';
import { answerVariantLessonsOffer, getVariantLessonsOfferAnswered } from '../data/repositories';
import { navigate } from '../nav/route';
import { variantLessonsOfferSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';

export function VariantLessonsOffer({ variantsOn }: { variantsOn: boolean }) {
  const offer = useSetting(variantLessonsOfferSetting);
  const answered = useLiveQuery(getVariantLessonsOfferAnswered, []);
  if (!variantsOn || offer !== 'on' || answered !== false) return null;
  const answer = (read: boolean) => {
    void answerVariantLessonsOffer(read);
    if (read) navigate('lessons');
  };
  return (
    <aside role="note" data-testid="variant-lessons-offer" className="shrink-0 border-b border-line px-3 py-2">
      <p className="text-base">New to variant readings? Five short lessons explain them.</p>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => answer(true)} className="min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
          Read the lessons
        </button>
        <button type="button" onClick={() => answer(false)} className="min-h-11 rounded-lg px-3 text-base font-medium text-muted active:bg-line">
          Not now
        </button>
      </div>
      <p className="text-sm text-muted">You can find them in Settings &gt; Reading &gt; Variants.</p>
    </aside>
  );
}
