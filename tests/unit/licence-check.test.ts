import { LockingScript, OP, PrivateKey, Transaction, UnlockingScript, Utils } from '@bsv/sdk';
import { licence } from 'bsv-kit/bsv';
import { describe, expect, it } from 'vitest';
import { fetchLicenceStatus, LicenceConfigError } from '../../src/services/licenceCheck';

const HOLDER = PrivateKey.fromHex('11'.repeat(32));
const HOLDER_PUB = HOLDER.toPublicKey().toString();
const HOLDER_ADDRESS = HOLDER.toPublicKey().toAddress('testnet');
const ISSUER = PrivateKey.fromHex('22'.repeat(32)).toPublicKey().toString();
const STRANGER = PrivateKey.fromHex('33'.repeat(32)).toPublicKey().toString();
const MINT = 'b'.repeat(64);

/** A type-M or TR record transaction whose one input pushes `signerPublicKey` in its unlocking script. */
function recordTx(recordType: 'M' | 'TR', payload: object, signerPublicKey: string): string {
  const script = new LockingScript()
    .writeOpCode(OP.OP_FALSE)
    .writeOpCode(OP.OP_RETURN)
    .writeBin(Utils.toArray('nftgate', 'utf8'))
    .writeBin([0x02])
    .writeBin(Utils.toArray(recordType, 'utf8'))
    .writeBin([0x00])
    .writeBin(Utils.toArray(JSON.stringify(payload), 'utf8'));
  const tx = new Transaction();
  tx.addInput({
    sourceTXID: '00'.repeat(32),
    sourceOutputIndex: 0,
    unlockingScript: new UnlockingScript().writeBin([0x30, 0x01]).writeBin(Utils.toArray(signerPublicKey, 'hex')),
  });
  tx.addOutput({ lockingScript: script, satoshis: 0 });
  return tx.toHex();
}

const mint = (signer: string) => recordTx('M', { collection: 'lampas', holder: HOLDER_ADDRESS }, signer);

describe('fetchLicenceStatus', () => {
  it('is held for a mint the issuer signed', async () => {
    const reader = new licence.FakeChainReader();
    reader.addTransaction(HOLDER_ADDRESS, MINT, mint(ISSUER));
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, reader })).state).toBe('held');
  });

  it('is none for a mint someone else signed', async () => {
    const reader = new licence.FakeChainReader();
    reader.addTransaction(HOLDER_ADDRESS, MINT, mint(STRANGER));
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, reader })).state).toBe('none');
  });

  it('is revoked when the issuer’s mint was moved away', async () => {
    const reader = new licence.FakeChainReader();
    reader.addTransaction(HOLDER_ADDRESS, MINT, mint(ISSUER));
    reader.addTransaction(HOLDER_ADDRESS, 'd'.repeat(64), recordTx('TR', { origin: `${MINT}:0`, to: 'mzElsewhere' }, ISSUER));
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, reader })).state).toBe('revoked');
  });

  it('is none for a key with no history, and ignores another collection', async () => {
    const reader = new licence.FakeChainReader();
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, reader })).state).toBe('none');
    reader.addTransaction(HOLDER_ADDRESS, MINT, recordTx('M', { collection: 'postern', holder: HOLDER_ADDRESS }, ISSUER));
    expect((await fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, reader })).state).toBe('none');
  });

  it('throws when the chain cannot be reached', async () => {
    const reader = new licence.FakeChainReader();
    reader.offline = true;
    await expect(fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, reader })).rejects.toThrow();
  });

  it('refuses to check with no issuer set, or on mainnet', async () => {
    await expect(fetchLicenceStatus(HOLDER_PUB, { issuer: '' })).rejects.toBeInstanceOf(LicenceConfigError);
    await expect(fetchLicenceStatus(HOLDER_PUB, { issuer: ISSUER, chain: 'mainnet' })).rejects.toBeInstanceOf(LicenceConfigError);
  });
});
