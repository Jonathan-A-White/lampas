// src/data/repositories/txCache.ts — the chain's transactions the licence check has read, kept in the meta table
// (key 'tx:<txid>', value the raw hex). A transaction never changes, so a kept one is good for ever and the next
// check reads only what is new. bsv-kit passes over a cache that throws and reads again a copy that is not the
// transaction its txid names, so nothing here needs to be careful.
import type { licence } from 'bsv-kit/bsv';
import { db } from '../db';

const PREFIX = 'tx:';

export const dexieTxCache: licence.TransactionCache = {
  async get(txid) {
    return (await db.meta.get(PREFIX + txid))?.value;
  },
  async set(txid, hex) {
    await db.meta.put({ key: PREFIX + txid, value: hex });
  },
};
