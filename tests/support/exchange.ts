// tests/support/exchange.ts — what the feature steps share about Copy on an exchange (src/share/exchange.ts): the phone's clipboard as a
// recording stub and the Markdown a copied exchange must be, written out here by hand so a change to the format fails the scenario.
import { LINK_ORIGIN } from '../../src/config';

const LINK_OF: Readonly<Record<string, string>> = {
  'Romans 8:28': 'Rom.8.28',
  'Romans 8': 'Rom.8',
  'Romans 8:1-11': 'Rom.8.1-11',
};

/** The Markdown Copy must put on the clipboard: the reference as a link, '**Q:**' and the question, then the answer. */
export function exchangeMarkdown(reference: string, question: string, answer: string): string {
  const link = LINK_OF[reference];
  if (!link) throw new Error(`no link known for ${reference}`);
  return `[${reference}](${LINK_ORIGIN}/#/?ref=${link})\n\n**Q:** ${question}\n\n${answer}`;
}

/** Replaces the phone's clipboard with one that records what it is given; `copied` is that record, newest last. */
export function stubClipboard(): { copied: string[] } {
  const record = { copied: [] as string[] };
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (record.copied.push(text), Promise.resolve()) },
  });
  return record;
}
