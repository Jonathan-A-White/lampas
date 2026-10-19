// What a paste into a box with a limit lost (mw-5r3p30.601), for src/ui/LimitedField.tsx.

export interface Cut {
  pasted: number;
  fit: number;
  max: number;
}

/** What a paste into a box with `max` characters left of its room cuts: undefined when all of it fits. A selection the paste replaces gives its room back. */
export function cutBy(value: string, selectionStart: number | null, selectionEnd: number | null, pasted: string, max: number): Cut | undefined {
  const replaced = (selectionEnd ?? value.length) - (selectionStart ?? value.length);
  const room = Math.max(0, max - (value.length - replaced));
  return pasted.length > room ? { pasted: pasted.length, fit: room, max } : undefined;
}

/** The sentence the note says. */
export const cutWords = ({ pasted, fit, max }: Cut): string =>
  fit === 0 ? `The box is full at ${max} characters: nothing of the ${pasted} pasted was added.` : `You pasted ${pasted} characters and ${fit} fit (the box takes ${max}): the rest was cut off.`;
