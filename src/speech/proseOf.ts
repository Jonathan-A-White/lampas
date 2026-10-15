// src/speech/proseOf.ts — the parts of a block of prose as the one text ReadAloud (src/speech/ReadAloud.tsx) reads.

/** The parts of a block (its heading, its paragraphs) as one text: a part without a stop of its own gets one, so the voice pauses between them. */
export const proseOf = (parts: readonly (string | null | undefined)[]): string =>
  parts
    .map((part) => (part ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .reduce((said, part) => (!said ? part : /[.!?:;,…]["”’)]?$/.test(said) ? `${said} ${part}` : `${said}. ${part}`), '');
