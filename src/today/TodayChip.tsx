// src/today/TodayChip.tsx — the Today chip in the Reader's row (mw-1fwagb.6, src/ReaderChips.tsx), which replaced the Due and Plan chips: 'Today · 2 of 6' (6 pieces on, 2 ticked
// today) with Tick boxes On, plain 'Today' with them Off; a tap opens Today (#/today). With nothing to show on Today (every piece Off in Settings > Daily) there is no chip.
// Not drawn until the settings and the day are read, so it does not flash a wrong count.
import { useLiveQuery } from 'dexie-react-hooks';
import { CHIP, CHIP_ACCENT } from '../chipStyle';
import { getDay, localDate } from '../data/daily/dailyStore';
import { navigate } from '../nav/route';
import { dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';
import { todayPieces, tickedCount } from './pieces';
import { useToday } from './useToday';

export function TodayChip() {
  const today = useToday();
  const date = localDate(today);
  const review = useSetting(dailyReviewSetting);
  const plan = useSetting(dailyPlanSetting);
  const psalms = useSetting(dailyPsalmsSetting);
  const devotional = useSetting(dailyDevotionalSetting);
  const tickBoxes = useSetting(dailyTicksSetting);
  const day = useLiveQuery(() => getDay(date), [date]);
  if (review === undefined || plan === undefined || psalms === undefined || devotional === undefined || tickBoxes === undefined || day === undefined) return null;
  const pieces = todayPieces({ review, plan, psalms, devotional }, today);
  if (pieces.length === 0) return null;
  const text = tickBoxes === 'on' ? `Today · ${tickedCount(pieces, day.ticked)} of ${pieces.length}` : 'Today';
  return (
    <button type="button" data-testid="today-chip" aria-label={text} onClick={() => navigate('today')} className={`${CHIP} ${CHIP_ACCENT}`}>
      {text}
    </button>
  );
}
