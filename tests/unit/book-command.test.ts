// The ask-for-book command (src/library/bookCommand.ts, mw-o7cts8.2): the one path the sheet's Send and the tutor's Send both run. Its args
// are built from BOOK_FORM; run keeps the request on the phone (or refuses it with bookRefusal's line and keeps nothing).
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { listWaitingBooks } from '../../src/data/repositories/bookRequests';
import { askedLineOf } from '../../src/services/bookRequests';
import { askForBookCommand } from '../../src/library/bookCommand';
import { BOOK_FORM } from '../../src/library/bookForm';
import { infoOf } from '../../src/library/kinds';
import { KINDS } from '../../src/resources/catalogue';
import { MAX_BOOK_CHARS, MAX_FEEDBACK_CHARS } from '../../src/services/feedback';
import { argsOf } from '../../src/formHelper/formHelper';

beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.requests.clear(), db.exportRows.clear()]);
  // offline: the request is kept and waits, which is what these tests look at
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});

describe('the ask-for-book command', () => {
  it('is named for the tutor, takes the form fields as args and asks him before it runs', () => {
    expect(askForBookCommand.name).toBe('ask-for-book');
    expect(askForBookCommand.kind).toBe('confirm');
    expect(askForBookCommand.tell).toBe('asks the makers for a book Lampas does not open yet');
    expect(askForBookCommand.offer?.({ title: 'Lenski, Romans', kind: 'Commentary' })).toBe('Send: Lenski, Romans, Commentary?');
    expect(askForBookCommand.offer?.({ title: 'Lenski, Romans' })).toBe('Send: Lenski, Romans?');
  });

  it('requires the title, bounds it, gives kind the kinds as its enum and bounds why', () => {
    const args = askForBookCommand.args!;
    expect(args.required).toEqual(['title']);
    expect(args.additionalProperties).toBe(false);
    expect(args.properties?.title).toMatchObject({ type: 'string', maxLength: MAX_BOOK_CHARS });
    expect(args.properties?.kind).toMatchObject({ type: 'string', enum: KINDS.map((k) => infoOf(k).singular) });
    expect(args.properties?.why).toMatchObject({ type: 'string', maxLength: MAX_FEEDBACK_CHARS });
  });

  it('keeps one waiting book with the kind he wanted, and says so', async () => {
    const result = await askForBookCommand.run({ title: 'Mounce, Basics of Biblical Greek', kind: 'Grammar', why: 'To read beside the Greek.' });
    expect(result.said).not.toBe('');
    const waiting = await listWaitingBooks();
    expect(waiting).toHaveLength(1);
    expect(waiting[0]).toMatchObject({ title: 'Mounce, Basics of Biblical Greek', kindWanted: 'grammar', why: 'To read beside the Greek.' });
  });

  it("returns bookRefusal's line and keeps nothing for a title already asked", async () => {
    await askForBookCommand.run({ title: 'Lenski, Romans' });
    const again = await askForBookCommand.run({ title: 'lenski romans' });
    expect(again.said).toMatch(/^You asked for this on /);
    expect(again.said).toBe(askedLineOf(Date.now()));
    expect(await listWaitingBooks()).toHaveLength(1);
  });

  it('puts a book of his kept list on the request when the title is the one row of his list', async () => {
    await db.exportRows.put({ resource: 'LLS:HENDRIKSENROM', type: 'text.monograph.commentary.bible', title: 'Exposition of Paul’s Epistle to the Romans', series: 'New Testament Commentary', refs: 'bible.66.1.1', matched: false, languages: 'en' });
    await askForBookCommand.run({ title: 'Exposition of Paul’s Epistle to the Romans' });
    const [kept] = await listWaitingBooks();
    expect(kept).toMatchObject({ resource: 'LLS:HENDRIKSENROM', series: 'New Testament Commentary' });
  });
});

describe('what the form’s own Send passes', () => {
  it('leaves an empty why out, and an unset kind', () => {
    expect(argsOf(BOOK_FORM, { title: ' Lenski, Romans ', kind: '', why: '  ' })).toEqual({ title: 'Lenski, Romans' });
    expect(argsOf(BOOK_FORM, { title: 'A', kind: 'Grammar', why: 'B' })).toEqual({ title: 'A', kind: 'Grammar', why: 'B' });
  });
});
