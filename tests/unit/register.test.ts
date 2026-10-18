import { afterEach, describe, expect, it, vi } from 'vitest';
import { BACKEND_MESSAGES, confirmRegistration, RegisterError, startRegistration } from '../../src/services/register';

const KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

function reply(status: number, body: unknown): typeof fetch {
  return vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe('startRegistration', () => {
  it('posts the email, phone and this phone’s key to the backend and answers the registration id', async () => {
    const fetcher = reply(200, { registrationId: 'abc' });
    const id = await startRegistration({ email: 'a@b.co', phone: '+14155550101', deviceKey: KEY }, { baseUrl: 'https://door.test', fetch: fetcher });
    expect(id).toBe('abc');
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(url).toBe('https://door.test/api/register/start');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'a@b.co', phone: '+14155550101', deviceKey: KEY });
  });

  it('throws the backend’s own words with its status', async () => {
    const error = await startRegistration({ email: 'a@b.co', phone: '+1', deviceKey: KEY }, { fetch: reply(503, { error: 'registration closed' }) }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RegisterError);
    expect((error as RegisterError).message).toBe('registration closed');
    expect((error as RegisterError).status).toBe(503);
  });

  it('says it cannot reach the server when the network fails', async () => {
    const down = vi.fn(async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    const error = (await startRegistration({ email: 'a@b.co', phone: '+1', deviceKey: KEY }, { fetch: down }).catch((e: unknown) => e)) as RegisterError;
    expect(error.message).toBe('Can’t reach Lampas’s server. Check the connection and try again.');
    expect(error.status).toBe(0);
  });

  it('says the server is not answering for a proxy’s page that is not JSON', async () => {
    const error = (await startRegistration({ email: 'a@b.co', phone: '+1', deviceKey: KEY }, { fetch: reply(502, '<html>Bad gateway</html>') }).catch((e: unknown) => e)) as RegisterError;
    expect(error.message).toBe('Lampas’s server isn’t answering. Try again in a few minutes.');
  });
});

describe('confirmRegistration', () => {
  it('posts the id and the two codes and answers the person’s devices', async () => {
    const fetcher = reply(200, { personId: 'p1', devices: [{ key: KEY, name: 'Pixel', addedAt: '2026-10-18T00:00:00Z' }], issued: true });
    const result = await confirmRegistration({ registrationId: 'abc', emailCode: '123456', phoneCode: '654321' }, { baseUrl: 'https://door.test', fetch: fetcher });
    expect(result.personId).toBe('p1');
    expect(result.devices).toHaveLength(1);
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(url).toBe('https://door.test/api/register/confirm');
    expect(JSON.parse(String(init?.body))).toEqual({ registrationId: 'abc', emailCode: '123456', phoneCode: '654321' });
  });

  it('says how many tries are left after a wrong code', async () => {
    const error = (await confirmRegistration({ registrationId: 'abc', emailCode: '1', phoneCode: '2' }, { fetch: reply(400, { error: 'that code is not right', triesLeft: 3 }) }).catch((e: unknown) => e)) as RegisterError;
    expect(error.message).toBe('that code is not right (3 tries left)');
    expect(error.startOver).toBe(false);
  });

  it('says 1 try, and starts over when none are left or the registration is gone', async () => {
    const one = (await confirmRegistration({ registrationId: 'abc', emailCode: '1', phoneCode: '2' }, { fetch: reply(400, { error: 'that code is not right', triesLeft: 1 }) }).catch((e: unknown) => e)) as RegisterError;
    expect(one.message).toBe('that code is not right (1 try left)');
    const none = (await confirmRegistration({ registrationId: 'abc', emailCode: '1', phoneCode: '2' }, { fetch: reply(400, { error: 'that code is not right', triesLeft: 0 }) }).catch((e: unknown) => e)) as RegisterError;
    expect(none.message).toBe('that code is not right; those codes are used up. Send new ones.');
    expect(none.startOver).toBe(true);
    const gone = (await confirmRegistration({ registrationId: 'abc', emailCode: '1', phoneCode: '2' }, { fetch: reply(410, { error: 'this registration has expired; start again' }) }).catch((e: unknown) => e)) as RegisterError;
    expect(gone.startOver).toBe(true);
  });

  it('keeps the licence-by-hand and the 3-device refusals verbatim', async () => {
    const full = (await confirmRegistration({ registrationId: 'abc', emailCode: '1', phoneCode: '2' }, { fetch: reply(409, { error: 'This licence already has 3 devices. Remove one first.' }) }).catch((e: unknown) => e)) as RegisterError;
    expect(full.message).toBe('This licence already has 3 devices. Remove one first.');
    expect(full.startOver).toBe(false);
  });
});

// mw-cvwm1u.4 sweep: every string Postern's register and site-issue code can answer has a shown form (the backend's own words, verbatim).
describe('every message the backend can answer', () => {
  it('is shown as the backend sent it', async () => {
    for (const message of BACKEND_MESSAGES) {
      const error = (await startRegistration({ email: 'a@b.co', phone: '+1', deviceKey: KEY }, { fetch: reply(400, { error: message }) }).catch((e: unknown) => e)) as RegisterError;
      expect(error.message).toBe(message);
    }
  });

  it('lists the strings of register.go, issue.go, twilio.go and the handlers', () => {
    expect(BACKEND_MESSAGES).toEqual(
      expect.arrayContaining([
        'registration closed',
        'that email is already registered',
        'This licence already has 3 devices. Remove one first.',
        'this device already belongs to another licence',
        'registration is busy; try again in a few minutes',
        'the verification service could not be reached; try again',
        'that email or phone could not be sent a code',
        'licensed by hand: ask the Governor',
        'the licence could not be issued just now; try again in a minute',
        'too many tries; wait a while and try again',
        'this registration has expired; start again',
        'that does not look like an email address',
        'type the phone with its country code, like +14155550101',
      ]),
    );
  });
});
