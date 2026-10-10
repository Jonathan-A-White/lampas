import { licence } from 'bsv-kit/bsv';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { dexieTxCache } from '../../src/data/repositories/txCache';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { addMintWithRealId, HOLDER_PUB, ISSUER_PUB, newChain } from '../support/licence-chain';

/** Counts the transaction reads a check makes of the chain (single and bulk). */
function counting(reader: licence.FakeChainReader): { reader: licence.ChainReader; txReads: () => number } {
  let reads = 0;
  const wrapped: licence.ChainReader = {
    getAddressHistory: (a) => reader.getAddressHistory(a),
    getUnconfirmedAddressHistory: (a) => reader.getUnconfirmedAddressHistory(a),
    getTransactionHex: (t) => {
      reads += 1;
      return reader.getTransactionHex(t);
    },
    getTransactionHexes: (t) => {
      reads += t.length;
      return reader.getTransactionHexes!(t);
    },
  };
  return { reader: wrapped, txReads: () => reads };
}

describe('the licence check keeps the chain’s transactions on the phone', () => {
  beforeEach(async () => {
    await db.meta.clear();
  });

  it('keeps a transaction under its txid and gives it back', async () => {
    expect(await dexieTxCache.get('ab'.repeat(32))).toBeUndefined();
    await dexieTxCache.set('ab'.repeat(32), '0100');
    expect(await dexieTxCache.get('ab'.repeat(32))).toBe('0100');
  });

  it('reads no transaction from the chain on the second check, and still answers held', async () => {
    const chain = newChain();
    addMintWithRealId(chain);
    const first = counting(chain);
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER_PUB, reader: first.reader })).state).toBe('held');
    expect(first.txReads()).toBeGreaterThan(0);
    expect(await db.meta.count()).toBeGreaterThan(0);

    const second = counting(chain);
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER_PUB, reader: second.reader })).state).toBe('held');
    expect(second.txReads()).toBe(0);
  });
});
