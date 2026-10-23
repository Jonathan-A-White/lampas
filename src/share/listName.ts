// src/share/listName.ts — the name Save as a list offers (mw-9q8wp1.2). Pure.
const NAME_MAX = 60;

/** The name offered for the list: the first line of the shared words (the shared title is the first thing the worker keeps), cut short; the date when there are no words or the first line is a link. */
export function suggestedListName(text: string | undefined, now: number = Date.now()): string {
  const first = (text ?? '').split('\n')[0].trim();
  if (first !== '' && !/^https?:\/\//i.test(first)) return first.length > NAME_MAX ? `${first.slice(0, NAME_MAX - 1).trimEnd()}…` : first;
  return new Date(now).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
