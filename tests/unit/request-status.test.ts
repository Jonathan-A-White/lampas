import { describe, expect, it } from 'vitest';
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
