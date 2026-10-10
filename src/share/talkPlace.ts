// src/share/talkPlace.ts — what a conversation's key (src/data/repositories/talks.ts talkRef, screenRef) says it is about, so the Share screen can name it
// ('Romans 8:28', 'Quiz on Romans 8:1-11', 'Ask the tutor: Goal') and open it. Pure: no store, no fetch.
import { bookOf, titleOf } from '../data/books';
import { SCREEN_NAMES, slugOf } from '../tutor/screen';

/** The key of a talk of its own, started from the Share screen's New talk: 'talk.<ms>'. It is about no text and no screen. */
export const FREE_TALK_PREFIX = 'talk.';

export type TalkPlace =
  | { kind: 'bible'; book: string; chapter: number; /** '28' or '1-11'; null for the chapter */ unit: string | null; quiz: boolean }
  | { kind: 'screen'; name: string }
  | { kind: 'free'; at: number };

/** A new talk's key. */
export const newTalkRef = (now = Date.now()): string => `${FREE_TALK_PREFIX}${now}`;

/** What `ref` is about; null for a key this app does not make. */
export function placeOf(ref: string): TalkPlace | null {
  if (ref.startsWith(FREE_TALK_PREFIX)) {
    const at = Number(ref.slice(FREE_TALK_PREFIX.length));
    return Number.isFinite(at) ? { kind: 'free', at } : null;
  }
  if (ref.startsWith('screen.')) {
    const slug = ref.slice('screen.'.length);
    const name = Object.values(SCREEN_NAMES).find((n) => slugOf(n) === slug);
    return name ? { kind: 'screen', name } : null;
  }
  const quiz = ref.endsWith(':quiz');
  const [book, chapter, unit, ...more] = (quiz ? ref.slice(0, -':quiz'.length) : ref).split('.');
  if (more.length > 0 || !bookOf(book) || !/^[1-9]\d{0,2}$/.test(chapter ?? '')) return null;
  if (unit !== undefined && !/^[1-9]\d{0,2}(-[1-9]\d{0,2})?$/.test(unit)) return null;
  return { kind: 'bible', book, chapter: Number(chapter), unit: unit ?? null, quiz };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The date as the lists show it, on the phone's calendar: '10 Oct'. (Not Intl: the short month's spelling varies with the browser's data.) */
export function dateText(when: number): string {
  const day = new Date(when);
  return `${day.getDate()} ${MONTHS[day.getMonth()]}`;
}

/** What the talk is called in the lists. */
export function talkLabel(ref: string): string {
  const place = placeOf(ref);
  if (!place) return ref;
  if (place.kind === 'free') return `Talk of ${dateText(place.at)}`;
  if (place.kind === 'screen') return `Ask the tutor: ${place.name}`;
  const where = place.unit ? `${titleOf(place.book, place.chapter)}:${place.unit}` : titleOf(place.book, place.chapter);
  return place.quiz ? `Quiz on ${where}` : where;
}

/** How long ago `when` was, for 'Continue: Romans 8:28 · 2 hours ago'. */
export function timeAgo(when: number, now = Date.now()): string {
  const minutes = Math.floor(Math.max(0, now - when) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return dateText(when);
}
