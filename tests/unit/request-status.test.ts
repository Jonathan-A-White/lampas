import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { applyRequestStatus, keepRequest } from '../../src/data/repositories/requests';
import { readStatus } from '../../src/services/requestStatus';

const TXID = `direct:${'ab'.repeat(32)}`;

describe('reading a request-status record (Postern protocol section 19)', () => {
  it('keeps the fields a landed status carries and drops what it does not know', () => {
    const record = readStatus({ kind: 'request-status', request: TXID, bead: 'mw-x.1', status: 'landed', version: '0.1.86', commit: 'abc', url: 'https://github.com/o/r/commit/abc', ts: 5, extra: 'x' });
    expect(record).toEqual({ request: TXID, bead: 'mw-x.1', status: 'landed', version: '0.1.86', commit: 'abc', url: 'https://github.com/o/r/commit/abc', ts: 5 });
  });

  it('is nothing unless it is a request-status with a request, a known status and a time', () => {
    expect(readStatus({ kind: 'request-status', request: TXID, status: 'celebrated', ts: 1 })).toBeUndefined();
    expect(readStatus({ kind: 'request-status', request: 'x', status: 'filed', ts: 1 })).toBeUndefined();
    expect(readStatus({ kind: 'request-status', request: TXID, status: 'filed' })).toBeUndefined();
    expect(readStatus({ re: TXID, status: 'answered', answer: {} })).toBeUndefined();
    expect(readStatus('filed')).toBeUndefined();
    expect(readStatus(null)).toBeUndefined();
  });

  it('never keeps a link that is not a web link', () => {
    const record = readStatus({ kind: 'request-status', request: TXID, status: 'landed', url: 'javascript:alert(1)', ts: 1 });
    expect(record?.url).toBeUndefined();
  });
});

describe('the two outcomes besides landed (mw-5r3p30.798)', () => {
  beforeEach(async () => {
    await db.open();
    await db.requests.clear();
  });
  afterAll(() => db.close());

  const SENT = { txid: TXID, kind: 'tutor-ask', summary: 'Add a sepia theme', app_version: '0.5.14', sentAt: 1000 };

  it('reads a built-differently record with its reason, bead and version, and keeps them on the row', async () => {
    const record = readStatus({ kind: 'request-status', request: TXID, bead: 'mw-x.1', status: 'built-differently', reason: 'Theme has Sepia now', version: '0.5.9', ts: 5, extra: 'x' });
    expect(record).toEqual({ request: TXID, bead: 'mw-x.1', status: 'built-differently', reason: 'Theme has Sepia now', version: '0.5.9', ts: 5 });
    await keepRequest(SENT);
    expect(await applyRequestStatus(record!)).toBe(true);
    expect(await db.requests.get(TXID)).toEqual({ ...SENT, status: 'built-differently', statusAt: 5, bead: 'mw-x.1', reason: 'Theme has Sepia now', version: '0.5.9' });
  });

  it('reads a moved record with the new bead and reason, and keeps them on the row', async () => {
    const record = readStatus({ kind: 'request-status', request: TXID, bead: 'mw-y.2', status: 'moved', reason: 'Sepia and Night theme', ts: 7 });
    expect(record).toEqual({ request: TXID, bead: 'mw-y.2', status: 'moved', reason: 'Sepia and Night theme', ts: 7 });
    await keepRequest(SENT);
    expect(await applyRequestStatus(record!)).toBe(true);
    expect(await db.requests.get(TXID)).toEqual({ ...SENT, status: 'moved', statusAt: 7, bead: 'mw-y.2', reason: 'Sepia and Night theme' });
  });

  it('cuts the reason at 400 characters and drops a field it does not carry on a moved row', async () => {
    expect(readStatus({ kind: 'request-status', request: TXID, status: 'built-differently', reason: 'r'.repeat(500), ts: 1 })?.reason).toHaveLength(400);
    await keepRequest(SENT);
    await applyRequestStatus(readStatus({ kind: 'request-status', request: TXID, status: 'moved', bead: 'mw-y.2', version: '0.5.9', setting: 'Sepia', ts: 3 })!);
    expect(await db.requests.get(TXID)).toEqual({ ...SENT, status: 'moved', statusAt: 3, bead: 'mw-y.2' });
  });

  it('lets an older record lose to the newer one the row already took', async () => {
    await keepRequest(SENT);
    await applyRequestStatus(readStatus({ kind: 'request-status', request: TXID, bead: 'mw-y.2', status: 'moved', ts: 9 })!);
    expect(await applyRequestStatus(readStatus({ kind: 'request-status', request: TXID, bead: 'mw-x.1', status: 'built-differently', reason: 'old', ts: 4 })!)).toBe(false);
    expect((await db.requests.get(TXID))?.status).toBe('moved');
    // and a later one still moves a moved request on
    expect(await applyRequestStatus(readStatus({ kind: 'request-status', request: TXID, bead: 'mw-y.2', status: 'landed', version: '0.5.20', ts: 11 })!)).toBe(true);
    expect((await db.requests.get(TXID))?.status).toBe('landed');
  });
});
