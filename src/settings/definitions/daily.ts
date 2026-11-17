// Daily (Settings > Daily): which pieces Today holds (Review, Memorize, Plan chapter, Psalms and Proverbs, Devotional; all On to start), which devotional it shows (one of the
// 37 in src/data/daily/devotionals.ts that are On in Your Logos library, or Random among those), and whether each piece has a box he ticks himself (On to start, PROVISIONAL). Today itself
// is a later story (mw-1fwagb.5); these are the settings it reads.
import { ALL_TICKED, DEFAULT_DEVOTIONAL, DEVOTIONALS, MORNING_REPHIL, MORNING_REPHIL_ID, NONE_TICKED, RANDOM, tickedDevotionals, tickedText } from '../../data/daily/devotionals';
import { DEFAULT_ORDER, type EpisodeOrder } from '../../data/daily/morningRephil';
import { devotionalDraw, setDevotionalDraw } from '../../data/repositories/library';
import { defineSetting, type Allowed, type Dependency, type SectionId } from '../define';

export type DailySwitch = 'on' | 'off';

const ON_OFF = {
  kind: 'choice',
  values: [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
  ],
} as const;

/** A piece that exists only to open Logos (the devotional) is drawn, and shown on Today, only while Logos is On (mw-rfjjzd.23). The day's Psalms and Proverbs read in Lampas (mw-5r3p30.1007), so Logos does not govern them. */
const LOGOS_ON: Dependency = { key: 'resource.logos', shown: (value) => value === 'on' };

const piece = (key: string, label: string, hint: string, help: string, dependsOn?: Dependency) =>
  defineSetting<DailySwitch>({ key, default: 'on', allowed: ON_OFF, section: 'daily', label, hint, help, dependsOn });

export const dailyReviewSetting = piece(
  'dailyReview',
  'Review',
  'Today holds your due cards.',
  'Whether Today holds your due words and ideas.',
);

export const dailyMemorizeSetting = piece(
  'dailyMemorize',
  'Memorize',
  'Today holds verses due to recall.',
  'Whether Today holds the verses due to recall.',
);

export const dailyPlanSetting = piece(
  'dailyPlan',
  'Plan chapter',
  "Today holds the plan's chapter.",
  "Whether Today holds the reading plan's chapter, to read in Logos.",
);

export const dailyPsalmsSetting = piece(
  'dailyPsalms',
  'Psalms and Proverbs',
  "Today holds the day's Psalms and Proverbs.",
  "Whether Today holds the day's Psalms and Proverbs.",
);

export const dailyDevotionalSetting = piece(
  'dailyDevotional',
  'Devotional',
  'Today holds a devotional.',
  'Whether Today holds a devotional (Logos).',
  LOGOS_ON,
);

export const devotionalSetting = defineSetting<string>({
  key: 'devotional',
  default: DEFAULT_DEVOTIONAL,
  allowed: {
    kind: 'choice',
    values: [{ value: RANDOM, label: 'Random' }, ...DEVOTIONALS.map((d) => ({ value: d.id, label: d.title })), { value: MORNING_REPHIL_ID, label: MORNING_REPHIL.title }],
  },
  section: 'daily',
  label: 'Which devotional',
  hint: 'The one Today shows, or Random.',
  help: `The devotional Today shows, one of the ${DEVOTIONALS.length} in your Logos library or Morning RePhil; Morning and Evening (${DEFAULT_DEVOTIONAL}) to start.`,
  dependsOn: LOGOS_ON,
});

export const devotionalDrawSetting = defineSetting<string>({
  key: 'devotionalDraw',
  default: ALL_TICKED,
  allowed: {
    kind: 'text',
    valid: (value) => value === ALL_TICKED || value === NONE_TICKED || value.split(',').every((id) => tickedDevotionals(id).length === 1),
    example: `${DEFAULT_DEVOTIONAL},LLS:20.10.2`,
    note: `'${ALL_TICKED}', '${NONE_TICKED}' or Logos ids joined by commas`,
  },
  parse: (raw) => (typeof raw === 'string' && raw !== '' ? tickedText(tickedDevotionals(raw)) : ALL_TICKED),
  // the draw is the devotionals on his shelf (library.ts)
  store: { read: devotionalDraw, write: setDevotionalDraw },
  section: 'daily',
  label: 'In the draw',
  hint: 'The devotionals Random draws from.',
  help: 'Random draws from the devotionals On in Your Logos library; none On shows Morning and Evening.',
  dependsOn: { key: 'devotional', shown: (value) => value === RANDOM },
});

export const morningRephilOrderSetting = defineSetting<EpisodeOrder>({
  key: 'morningRephilOrder',
  default: DEFAULT_ORDER,
  allowed: {
    kind: 'choice',
    values: [
      { value: 'oldest', label: 'Oldest first' },
      { value: 'newest', label: 'Newest first' },
    ],
  },
  section: 'daily',
  label: 'Morning RePhil order',
  hint: 'Oldest or newest episode first.',
  help: 'Next Morning RePhil episode: the oldest not yet played, or the newest.',
  dependsOn: { key: 'devotional', shown: (value) => value === RANDOM || value === MORNING_REPHIL_ID },
});

export const dailyTicksSetting = piece(
  'dailyTicks',
  'Tick boxes',
  'Each piece has a tick box.',
  'Whether each Today piece has a box you tick yourself. Off: plain links.',
);

/** The value of Today's devotional that draws another one for the day (any devotional's Logos id names that one). */
export const ANOTHER = 'another';

/**
 * Today's devotional (mw-5r3p30.680): the devotional Today shows on the day, while Which devotional is Random. Not saved as a setting: its value is the day's
 * pick kept by src/data/daily/dailyStore.ts (setDevotionalPick, and pickAnotherDevotional for 'another', the ONE function the Another tap also uses), so it is
 * declared here as the metadata its registry entry and its row are made from, not through defineSetting.
 */
export const todaysDevotionalSetting: {
  key: string;
  section: SectionId;
  label: string;
  hint: string;
  help: string;
  allowed: Allowed;
  dependsOn: Dependency;
} = {
  key: 'todaysDevotional',
  section: 'daily',
  label: "Today's devotional",
  hint: "Change only today's devotional.",
  help: `The devotional Today shows for the rest of today, while Which devotional is Random: "${ANOTHER}" draws a different one for today (the Another button on Today does the same), and a devotional's Logos resource id shows that one today. It shows only while Which devotional is Random.`,
  allowed: { kind: 'choice', values: [{ value: ANOTHER, label: 'Another' }, ...DEVOTIONALS.map((d) => ({ value: d.id, label: d.title })), { value: MORNING_REPHIL_ID, label: MORNING_REPHIL.title }] },
  dependsOn: { key: 'devotional', shown: (value) => value === RANDOM },
};
