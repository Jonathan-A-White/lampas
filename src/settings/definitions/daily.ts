// Daily (Settings > Daily): which pieces Today holds (Review, Plan chapter, Psalms and Proverbs, Devotional; all On to start), which devotional it shows (one of the
// 37 in src/data/daily/devotionals.ts, or Random among those ticked), and whether each piece has a box he ticks himself (On to start, PROVISIONAL). Today itself
// is a later story (mw-1fwagb.5); these are the settings it reads.
import { ALL_TICKED, DEFAULT_DEVOTIONAL, DEVOTIONALS, NONE_TICKED, RANDOM, tickedDevotionals, tickedText } from '../../data/daily/devotionals';
import { defineSetting } from '../define';

export type DailySwitch = 'on' | 'off';

const ON_OFF = {
  kind: 'choice',
  values: [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
  ],
} as const;

const piece = (key: string, label: string, hint: string, help: string) =>
  defineSetting<DailySwitch>({ key, default: 'on', allowed: ON_OFF, section: 'daily', label, hint, help });

export const dailyReviewSetting = piece(
  'dailyReview',
  'Review',
  'Today holds your due cards.',
  'Whether Today holds a Review piece: the words and ideas that are due. On by default.',
);

export const dailyPlanSetting = piece(
  'dailyPlan',
  'Plan chapter',
  "Today holds your reading plan's chapter.",
  "Whether Today holds the reading plan's chapter for the day, to read in Logos or listen to in your audio Bible. On by default; with no plan started there is nothing to show.",
);

export const dailyPsalmsSetting = piece(
  'dailyPsalms',
  'Psalms and Proverbs',
  "Today holds the day's Psalms and Proverbs.",
  "Whether Today holds the day's Psalms and Proverbs: on day N of the month, Psalms N, N+30, N+60, N+90 and N+120 (those up to 150) and Proverbs N, each opened in Logos. On by default.",
);

export const dailyDevotionalSetting = piece(
  'dailyDevotional',
  'Devotional',
  'Today holds one devotional for the day.',
  'Whether Today holds a devotional, opened in Logos at the day. Which one is the choice below. On by default.',
);

export const devotionalSetting = defineSetting<string>({
  key: 'devotional',
  default: DEFAULT_DEVOTIONAL,
  allowed: {
    kind: 'choice',
    values: [{ value: RANDOM, label: 'Random' }, ...DEVOTIONALS.map((d) => ({ value: d.id, label: d.title }))],
  },
  section: 'daily',
  label: 'Which devotional',
  hint: 'The one Today shows, or Random: a different one each day.',
  help: `The devotional Today shows, one of the ${DEVOTIONALS.length} in your Logos library, named by its Logos resource id; Morning and Evening (${DEFAULT_DEVOTIONAL}) to start. Random shows a different one each day, drawn from those ticked below; the same one all day.`,
});

export const devotionalDrawSetting = defineSetting<string>({
  key: 'devotionalDraw',
  default: ALL_TICKED,
  allowed: {
    kind: 'text',
    valid: (value) => value === ALL_TICKED || value === NONE_TICKED || value.split(',').every((id) => tickedDevotionals(id).length === 1),
    example: `${DEFAULT_DEVOTIONAL},LLS:20.10.2`,
    note: `'${ALL_TICKED}' for every devotional, '${NONE_TICKED}' for none, or the Logos resource ids of the ones in the draw joined by commas (at most 80 characters, so a talked change can name only a few)`,
  },
  parse: (raw) => (typeof raw === 'string' && raw !== '' ? tickedText(tickedDevotionals(raw)) : ALL_TICKED),
  section: 'daily',
  label: 'In the draw',
  hint: 'The devotionals Random draws from.',
  help: 'Tick the devotionals Random may show. All are ticked to start. With none ticked, Random shows Morning and Evening. It shows only while Which devotional is Random.',
  dependsOn: { key: 'devotional', shown: (value) => value === RANDOM },
});

export const dailyTicksSetting = piece(
  'dailyTicks',
  'Tick boxes',
  'Each piece has a box you tick yourself.',
  'Whether each piece on Today has a box you tick yourself when you have done it. Nothing ticks by itself. Off makes Today a plain list of links. On by default.',
);
