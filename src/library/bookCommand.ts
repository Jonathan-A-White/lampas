// src/library/bookCommand.ts — Ask for a book as a command (mw-o7cts8.2, tutor-drives): `ask-for-book` is what the sheet's Send and the tutor's Send (the button the panel
// 'Let the tutor do it' ends with) both run, so the two paths are one: the refusal (a book the catalogue lists or already asked, src/services/bookRequests.ts bookRefusal), then
// askForBook, which keeps the request on the phone and sends it. Its args are BOOK_FORM's fields: the title, the kind by its singular name ('Grammar') and why. A title that is the
// one row of his kept Logos list carries that row's Resource ID, Type, Series and ReferenceSupersets, as a pick from the list does.
import { formCommand, type FormArgs } from '../formHelper/formHelper';
import { squashTitle, type BookAsk, type WaitingBook } from '../data/repositories/bookRequests';
import { listWaitingBooks } from '../data/repositories/bookRequests';
import { unmatchedRows } from '../data/repositories/library';
import type { ExportedRow } from '../data/db';
import { KINDS } from '../resources/catalogue';
import { askForBook, bookRefusal } from '../services/bookRequests';
import { BOOK_FORM } from './bookForm';
import { infoOf } from './kinds';

/** What the command did: the line that refused the book (nothing is kept), or the request it kept (it still waits if `listWaitingBooks` holds its id). */
export type BookResult = { refusal: string } | { kept: WaitingBook };

/** The ask a form's values make: the kind by its singular name turned back into the kind, and the details of the one row of his kept list that has this title. */
async function askOf(values: FormArgs, picked?: ExportedRow | null): Promise<BookAsk> {
  const kind = KINDS.find((k) => infoOf(k).singular === values.kind);
  const rows = (await unmatchedRows()).filter((r) => squashTitle(r.title) === squashTitle(values.title));
  // the row the sheet shows picked, when its title is the one asked for; else the one row of his list with this title
  const row = picked && squashTitle(picked.title) === squashTitle(values.title) ? picked : rows.length === 1 ? rows[0] : undefined;
  return {
    title: values.title,
    ...(row ? { resource: row.resource, type: row.type, series: row.series, refs: row.refs } : {}),
    ...(kind ? { kindWanted: kind } : {}),
    why: values.why ?? '',
  };
}

/** The command, with `onResult` told what it did (the sheet shows that: refused, sent or waiting) and `picked` the row of his list the sheet shows picked, if any. */
export function bookCommand(onResult?: (result: BookResult) => void, picked?: () => ExportedRow | null) {
  return formCommand(BOOK_FORM, {
    name: 'ask-for-book',
    tell: 'asks the makers for a book Lampas does not open yet',
    offer: (values) => `Send: ${[values.title, values.kind].filter(Boolean).join(', ')}?`,
    async send(values) {
      const ask = await askOf(values, picked?.());
      const refusal = await bookRefusal(ask);
      if (refusal) {
        onResult?.({ refusal });
        return { said: refusal };
      }
      const kept = await askForBook(ask);
      onResult?.({ kept });
      const waiting = (await listWaitingBooks()).some((w) => w.id === kept.id);
      return { said: waiting ? `Waiting to send: ${kept.title}` : `Sent to the makers: ${kept.title}` };
    },
  });
}

export const askForBookCommand = bookCommand();
