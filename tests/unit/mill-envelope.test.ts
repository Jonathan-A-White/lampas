// The sealed plaintext of a grist (src/services/mill.ts scriptOf): `grist` names the talk the grist is a turn of when the caller gives one (mw-pxji7y.3) and
// nothing when not, so today's envelope is byte for byte what it was.
import { PrivateKey, Utils } from '@bsv/sdk';
import { door } from 'bsv-kit/bsv';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POSTERN_DOOR } from '../../src/config';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { sendTimedGrist, timedDoor } from '../../src/services/mill';
import { MILL_KEY_HEX, makeFakePostern, type FakePostern } from '../support/fake-postern';

const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0d', 'hex'));
const mill = PrivateKey.fromHex(MILL_KEY_HEX).toPublicKey().toString();

let postern: FakePostern;
beforeEach(() => {
  setCurrentLicence('licensed');
  postern = makeFakePostern();
  postern.autoReply = { status: 'answered', answer: {} };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
});
afterAll(() => vi.unstubAllGlobals());

const send = (extra: { talk?: string } = {}) =>
  sendTimedGrist({ door: timedDoor(new door.Door({ baseUrl: POSTERN_DOOR, key })), key, mill, app: 'lampas', kind: 'bible-talk', v: '1', input: { question: 'Hi' }, files: [], ...extra });

describe('the sealed plaintext of a grist', () => {
  it('carries grist.talk when the caller gives one', async () => {
    await send({ talk: 'rom.8@1790000000000' });
    expect(postern.received[0].grist).toEqual({ app: 'lampas', kind: 'bible-talk', v: '1', talk: 'rom.8@1790000000000' });
  });

  it('carries nothing of the sort when the caller gives none or an empty one', async () => {
    await send();
    await send({ talk: '' });
    for (const received of postern.received) {
      expect(received.grist).toEqual({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect('talk' in received.grist).toBe(false);
    }
  });

  it('is, without a talk, the very plaintext it was: header, input and attachments in that order', async () => {
    await send();
    expect(JSON.stringify(postern.received[0])).toBe('{"grist":{"app":"lampas","kind":"bible-talk","v":"1"},"input":{"question":"Hi"},"attachments":[]}');
  });
});
