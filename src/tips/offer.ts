// src/tips/offer.ts — the start of a sitting asks the mill for a tip (docs/tips.md): at most once a day, only online, only with Tips On. The summary
// (summary.ts) and the ids already shown go in a 'tips' grist, sent as the tutor sends one (askGrind); an answer with a tip not shown before is kept
// (repositories/tips.ts) and the card under the Reader's header (TipCard.tsx) shows it. PROVISIONAL: once a day.
import { getTips, keepTip, openTip, shownTipIds, dayOf } from '../data/repositories';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, TutorError } from '../services/tutor';
import { usageSummary } from './summary';
import { isTipAnswer, type TipRequest } from './tip';

/** The kind the mill runs the grind under (grinds/tips.json). */
export const TIPS_KIND = 'tips';

/** The local day a grist was last sent for, in localStorage: a scheduling note, set before the send so a second start cannot send again. */
export const TIPS_DAY_KEY = 'lampas.tipsDay';

/** What the start of a sitting did. */
export type Offered =
  /** Tips is Off */
  | 'off'
  /** a grist was sent today already */
  | 'today'
  /** a tip he has not answered is still up: no grist */
  | 'open'
  | 'offline'
  /** a grist went out and a new tip came back */
  | 'shown'
  /** a grist went out and no tip came back (none, or one already shown) */
  | 'none'
  /** nothing could be sent, or no answer came: a later start today may try again if nothing went out */
  | 'failed';

export interface OfferOptions {
  now?: number;
  /** the device key's bytes; the phone's own by default */
  key?: Uint8Array;
  storage?: Storage;
}

let inFlight: Promise<Offered> | null = null;

async function offer(options: OfferOptions): Promise<Offered> {
  const now = options.now ?? Date.now();
  const storage = options.storage ?? window.localStorage;
  if ((await getTips()) === 'off') return 'off';
  const today = dayOf(now);
  if (storage.getItem(TIPS_DAY_KEY) === today) return 'today';
  if (await openTip()) return 'open';
  if (navigator.onLine === false) return 'offline';

  storage.setItem(TIPS_DAY_KEY, today);
  let sent = false;
  try {
    const shown = await shownTipIds();
    const request: TipRequest = { summary: await usageSummary(now), shown };
    const answer = await askGrind(TIPS_KIND, request, isTipAnswer, { key: options.key ?? getDeviceKeyBytes(), onSent: () => (sent = true) });
    // The grind is told never to repeat an id; if it does, the card is not shown.
    return answer.tip && (await keepTip(answer.tip, now)) ? 'shown' : 'none';
  } catch (error) {
    // Nothing went out (no licence, no network, refused): today stays free for a later start. A grist that went out and got no answer spends the day.
    if (!sent || !(error instanceof TutorError)) storage.removeItem(TIPS_DAY_KEY);
    return 'failed';
  }
}

/** Offers today's tip if the rules allow; never throws. One call at a time (a second while one runs gets its result). */
export function offerTip(options: OfferOptions = {}): Promise<Offered> {
  inFlight ??= offer(options)
    .catch((error: unknown) => {
      console.error('could not offer a tip', error);
      return 'failed' as const;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
