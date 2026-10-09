// src/resources/topic.ts — the English topic a lexicon gloss can stand for in a topical wordbook (Lexham Theological Wordbook), docs/resources.md.

/** The English topic a gloss can stand for in a topical wordbook: a plain noun-like gloss ('condemnation', 'early morning'), never 'to preach' or 'implanted/ingrafted'. Empty when it cannot. */
export const topicOf = (gloss: string): string | undefined => (/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(gloss) && !/^(to|be|not) /i.test(gloss) ? gloss : undefined);
