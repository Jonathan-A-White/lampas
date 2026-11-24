// src/today/TodayChip.tsx — the Today chip in the Reader's row (mw-1fwagb.6, src/ReaderChips.tsx), which replaced the Due and Plan chips: 'Today · 2 of 6' (6 pieces on, 2 ticked
// today) with Tick boxes On, plain 'Today' with them Off; a tap opens Today (#/today). With nothing to show on Today (every piece Off in Settings > Daily) there is no chip.
// Not drawn until the settings and the day are read, so it does not flash a wrong count.
import { useLiveQuery } from 'dexie-react-hooks';
import { CHIP, CHIP_ACCENT } from '../chipStyle';
import { DEFAULT_BACKUP, tickedDevotionals } from '../data/daily/devotionals';
import { getDay, getHeard, localDate } from '../data/daily/dailyStore';
import { useEpisodes } from './useEpisodes';
import { DEFAULT_ORDER, devotionalToday } from '../data/daily/morningRephil';
import { navigate } from '../nav/route';
import { dailyDevotionalSetting, dailyMemorizeSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting, morningRephilBackupSetting, morningRephilOrderSetting } from '../settings/definitions/daily';
import { useSetting } from '../settings/store';
import { todayPieces, tickedCount } from './pieces';
import { useDrawSources } from '../settings/devotionalSources';
import { useToday } from './useToday';

export function TodayChip() {
  const today = useToday();
  const date = localDate(today);
  const review = useSetting(dailyReviewSetting);
  const memorize = useSetting(dailyMemorizeSetting);
  const plan = useSetting(dailyPlanSetting);
  const psalms = useSetting(dailyPsalmsSetting);
  const devotional = useSetting(dailyDevotionalSetting);
  const tickBoxes = useSetting(dailyTicksSetting);
  const choice = useSetting(devotionalSetting);
  const draw = useSetting(devotionalDrawSetting);
  const order = useSetting(morningRephilOrderSetting) ?? DEFAULT_ORDER;
  const backup = useSetting(morningRephilBackupSetting) ?? DEFAULT_BACKUP;
  const sources = useDrawSources();
  const episodes = useEpisodes();
  const day = useLiveQuery(() => getDay(date), [date]);
  const heard = useLiveQuery(getHeard, []);
  if (choice === undefined || draw === undefined || sources === undefined || heard === undefined) return null;
  if (review === undefined || memorize === undefined || plan === undefined || psalms === undefined || devotional === undefined || tickBoxes === undefined || day === undefined) return null;
  // Today draws no devotional with Logos Off and a Logos book chosen, so the chip does not count one (mw-r9xo1pj.6)
  const drawn = devotionalToday({ choice, ticked: tickedDevotionals(draw), date: today, pick: day.devotional, kept: day.rephil, heard, order, backup, logosOn: sources.logos, rephilOn: sources.rephil, list: episodes }) !== undefined;
  const pieces = todayPieces({ review, plan, psalms, devotional, memorize }, today, drawn);
  if (pieces.length === 0) return null;
  const text = tickBoxes === 'on' ? `Today · ${tickedCount(pieces, day.ticked)} of ${pieces.length}` : 'Today';
  return (
    <button type="button" data-testid="today-chip" aria-label={text} onClick={() => navigate('today')} className={`${CHIP} ${CHIP_ACCENT}`}>
      {text}
    </button>
  );
}
