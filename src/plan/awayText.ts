// src/plan/awayText.ts — how long she was away, in words, for the return sheet (src/plan/WhereDidYouGetTo.tsx).

const MINUTE = 60_000;

/** 'about 40 minutes', 'about 2 hours and 10 minutes': how long she was away, to the minute. */
export function awayText(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE));
  if (minutes < 60) return `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return rest === 0 ? `about ${h}` : `about ${h} and ${rest} ${rest === 1 ? 'minute' : 'minutes'}`;
}
