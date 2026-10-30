// mw-5r3p30.884: Your requests after a landed record the phone never applied, and two asks that each keep their own words.
import { PrivateKey, Utils } from '@bsv/sdk';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { getRequestsCursor, keepRequest, listRequests, recordOf } from '../../src/data/repositories/requests';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { pullStatuses } from '../../src/services/requestStatus';
import { sendToMakers } from '../../src/talk/makers';
import { statusWording } from '../../src/data/requestWording';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

const PHONE_KEY = '00'.repeat(31) + '02';
const PHONE_PUBLIC = PrivateKey.fromHex(PHONE_KEY).toPublicKey().toString();
const key = Uint8Array.from(Utils.toArray(PHONE_KEY, 'hex'));
const TXID = `direct:${'ab'.repeat(32)}`;
let postern: FakePostern;

beforeEach(async () => {
  setCurrentLicence('licensed');
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  postern = makeFakePostern();
  postern.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
  await db.open();
  await Promise.all([db.settings.clear(), db.requests.clear()]);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => db.close());

const record = (status: string, ts: number, more: Record<string, unknown> = {}) => ({ kind: 'request-status', request: TXID, bead: 'mw-5r3p30.678', status, ts, ...more });

describe('a landed record on a later page than the cursor started at', () => {
  const LANDED = { version: '0.1.372', commit: 'ff6fd6ace477f85fea682d46d1e2bc8393756fb0' };
  const held = () => keepRequest({ txid: TXID, kind: 'tutor-ask', summary: 'Go to John 18:2', app_version: '0.1.369', sentAt: 1_792_500_000_000 });
  const shown = async () => statusWording(recordOf((await listRequests())[0]), () => 'Oct 20');

  it('moves a filed row on to Adopted in its version', async () => {
    await held();
    postern.sendStatus(PHONE_PUBLIC, record('filed', 1_792_510_000_000));
    await pullStatuses({ key });
    expect(await shown()).toBe('Filed as a story · Oct 20, waiting its turn');
    const cursor = await getRequestsCursor();
    postern.sendStatus(PHONE_PUBLIC, record('landed', 1_792_523_806_542, LANDED));
    await pullStatuses({ key });
    expect(postern.sinces.at(-1)).toBeGreaterThanOrEqual(cursor);
    expect(await shown()).toBe('Adopted in 0.1.372 · Oct 20');
  });

  it('still reads Adopted when the filed record the row already took is stamped later than the landed one', async () => {
    await held();
    postern.sendStatus(PHONE_PUBLIC, record('filed', 1_792_530_000_000));
    await pullStatuses({ key });
    postern.sendStatus(PHONE_PUBLIC, record('landed', 1_792_523_806_542, LANDED));
    await pullStatuses({ key });
    expect(await shown()).toBe('Adopted in 0.1.372 · Oct 20');
  });

  it('keeps Adopted when the mill sends filed again after it, stamped later', async () => {
    await held();
    postern.sendStatus(PHONE_PUBLIC, record('landed', 1_792_523_806_542, LANDED));
    await pullStatuses({ key });
    postern.sendStatus(PHONE_PUBLIC, record('filed', 1_792_530_000_000));
    await pullStatuses({ key });
    expect(await shown()).toBe('Adopted in 0.1.372 · Oct 20');
    postern.sendStatus(PHONE_PUBLIC, record('building', 1_792_540_000_000));
    await pullStatuses({ key });
    expect(await shown()).toBe('Adopted in 0.1.372 · Oct 20');
  });

  it('lets a request moved on to another story still go on to its own landing', async () => {
    await held();
    postern.sendStatus(PHONE_PUBLIC, record('moved', 1_792_520_000_000, { bead: 'mw-y.2', reason: 'Fold' }));
    postern.sendStatus(PHONE_PUBLIC, record('landed', 1_792_523_806_542, LANDED));
    await pullStatuses({ key });
    expect((await listRequests())[0].status).toBe('landed');
  });
});

describe('two asks to the makers each keep their own words', () => {
  it('files the second ask under its own grist id with its own words and summary', async () => {
    await sendToMakers({ text: 'Go to John 18:2 in the Choose a book box', summary: 'He wants Go to John 18:2 in the Choose a book box.', screen: 'Choose a book', reference: 'Choose a book' });
    await sendToMakers({ text: 'See above', summary: 'See above', screen: 'Verse view', reference: 'Genesis 10:19' });
    const rows = await listRequests();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.words).sort()).toEqual(['Go to John 18:2 in the Choose a book box', 'See above']);
    for (const row of rows) expect(row.txid).toBe(postern.txids[postern.received.findIndex((g) => (g.input as { text?: string }).text === row.words)]);
  });

  it('keeps each ask to its own row when both are sent at once', async () => {
    await Promise.all([
      sendToMakers({ text: 'First ask', summary: 'He wants the first.', screen: 'Reader', reference: 'John 18' }),
      sendToMakers({ text: 'Second ask', summary: 'He wants the second.', screen: 'Reader', reference: 'John 18' }),
    ]);
    const rows = await listRequests();
    expect(rows.map((r) => [r.words, r.summary]).sort()).toEqual([['First ask', 'He wants the first.'], ['Second ask', 'He wants the second.']]);
  });
});
