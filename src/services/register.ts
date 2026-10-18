// src/services/register.ts — the client of Postern's self-registration (mw-cvwm1u.4): POST /api/register/start proves an email and a phone with
// a code each, POST /api/register/confirm takes the two codes and has the site issuer license this phone's key. Open endpoints (no signed
// proof: the person has no licence yet), so a plain fetch, not the licence-gated mill client. The backend answers a refusal as {error}, in
// words meant for the person; they are shown as sent. Nothing here keeps the email or the phone: they go to the backend and no further.
import { door } from 'bsv-kit/bsv';
import { POSTERN_DOOR } from '../config';
import { getDeviceKeyBytes } from './deviceKey';

export interface RegisterDevice {
  key: string;
  name: string;
  addedAt: string;
  /** When the backend last saw the device use its licence, if it says. */
  lastSeen?: string;
  licenceTxid?: string;
}

export interface RegisterResult {
  personId: string;
  devices: RegisterDevice[];
  issued: boolean;
}

interface Options {
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** A registration the backend refused, or could not be asked. `message` is what to show the person. */
export class RegisterError extends Error {
  readonly status: number;
  /** The registration cannot go on (its codes are used up or it expired): the person sends new codes. */
  readonly startOver: boolean;
  constructor(message: string, status: number, startOver = false) {
    super(message);
    this.name = 'RegisterError';
    this.status = status;
    this.startOver = startOver;
  }
}

/**
 * Every string Postern's register code answers as {error} (server/internal/register register.go, issue.go, twilio.go and api/register.go), each
 * shown as sent, so the person reads the backend's own words. A new one the backend adds is shown the same way; this list is what the sweeps
 * of mw-cvwm1u.4 and mw-cvwm1u.5 (My devices: the signed person, rename and remove calls) found, and tests/unit/register.test.ts holds it.
 */
export const BACKEND_MESSAGES: readonly string[] = [
  'registration closed',
  'this registration has expired; start again',
  'that email is already registered',
  'This licence already has 3 devices. Remove one first.',
  'this device already belongs to another licence',
  'registration is busy; try again in a few minutes',
  'the verification service could not be reached; try again',
  'that email or phone could not be sent a code',
  'that code is not right',
  'that does not look like an email address',
  'type the phone with its country code, like +14155550101',
  'deviceKey must be a compressed public key: 66 hex characters starting 02 or 03',
  'licensed by hand: ask the Governor',
  'the licence could not be issued just now; try again in a minute',
  'the licence could not be revoked just now; try again in a minute',
  'only a device on this licence can remove one of its devices',
  'that device is not on this licence',
  'too many tries; wait a while and try again',
  'the request body is not the JSON this expects',
  'only the mill, or a device of that person, may ask after a key',
  'too many requests; try again in a minute',
  'too many codes have gone to that email or phone; wait an hour and try again',
  'registration is busy; try again in an hour',
  'registration failed',
];

const UNREACHABLE = 'Can’t reach Lampas’s server. Check the connection and try again.';
const NOT_ANSWERING = 'Lampas’s server isn’t answering. Try again in a few minutes.';
/** Rename is PATCH /api/register/device; a backend that has no such route answers 405 (not JSON), and there is nothing of the backend's own to show. */
const CANNOT_RENAME = 'Lampas’s server can’t rename a device yet.';

/** The JSON the backend answered, or null when it was not JSON (a proxy's page for a backend that is down). */
async function bodyOf(response: Response): Promise<{ error?: unknown; triesLeft?: unknown } | null> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null ? body : null;
  } catch {
    return null;
  }
}

async function post(path: string, body: object, options: Options): Promise<unknown> {
  const send = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  let response: Response;
  try {
    response = await send(`${options.baseUrl ?? POSTERN_DOOR}/api/register/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new RegisterError(UNREACHABLE, 0);
  }
  const parsed = await bodyOf(response);
  if (response.ok) return parsed ?? {};
  const said = typeof parsed?.error === 'string' ? parsed.error.trim() : '';
  if (!said) throw new RegisterError(response.status >= 500 || response.status === 404 ? NOT_ANSWERING : `Something went wrong (${response.status}). Try again.`, response.status);
  const triesLeft = typeof parsed?.triesLeft === 'number' ? parsed.triesLeft : undefined;
  if (triesLeft === undefined) throw new RegisterError(said, response.status, response.status === 410);
  if (triesLeft <= 0) throw new RegisterError(`${said}; those codes are used up. Send new ones.`, response.status, true);
  throw new RegisterError(`${said} (${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left)`, response.status);
}

/** Has the backend send a code to the email and one to the phone; answers the registration id confirmRegistration takes. */
export async function startRegistration(input: { email: string; phone: string; deviceKey: string }, options: Options = {}): Promise<string> {
  const body = (await post('start', input, options)) as { registrationId?: unknown };
  if (typeof body.registrationId !== 'string' || !body.registrationId) throw new RegisterError(NOT_ANSWERING, 200);
  return body.registrationId;
}

/** Checks the two codes; on success the site issuer has licensed the key the registration began with. */
export async function confirmRegistration(input: { registrationId: string; emailCode: string; phoneCode: string }, options: Options = {}): Promise<RegisterResult> {
  const body = (await post('confirm', input, options)) as Partial<RegisterResult>;
  return { personId: body.personId ?? '', devices: body.devices ?? [], issued: body.issued === true };
}

/** The person's devices, for My devices (mw-cvwm1u.5). */
export interface MyDevices {
  personId: string;
  devices: RegisterDevice[];
}

/** Every call of My devices is signed by this phone's own key (Postern2, through bsv-kit's Door): the backend answers a person's devices to a device of that person only. */
function signedDoor(options: Options): InstanceType<typeof door.Door> {
  return new door.Door({ baseUrl: options.baseUrl ?? POSTERN_DOOR, key: getDeviceKeyBytes(), ...(options.fetch ? { fetch: options.fetch } : {}) });
}

/** Sends one signed call and reads its JSON; a refusal is the backend's own {error} words, as for the open calls above. */
async function signed(path: string, init: RequestInit, options: Options): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await signedDoor(options).fetch(path, init);
  } catch (error) {
    // The door's own refusals (a proof the backend did not accept, a backend that cannot be reached) already speak plainly.
    if (error instanceof door.RefusedError) throw new RegisterError(error.message, 401);
    if (error instanceof door.BackendUnreachableError) throw new RegisterError(error.message, 0);
    throw new RegisterError(UNREACHABLE, 0);
  }
  const parsed = await bodyOf(response);
  if (response.ok) return (parsed ?? {}) as Record<string, unknown>;
  const said = typeof parsed?.error === 'string' ? parsed.error.trim() : '';
  if (said) throw new RegisterError(said, response.status);
  if (response.status === 405) throw new RegisterError(CANNOT_RENAME, 405);
  throw new RegisterError(response.status >= 500 || response.status === 404 ? NOT_ANSWERING : `Something went wrong (${response.status}). Try again.`, response.status);
}

const isDevice = (value: unknown): value is RegisterDevice =>
  typeof value === 'object' && value !== null && typeof (value as RegisterDevice).key === 'string' && typeof (value as RegisterDevice).name === 'string';

/** The devices of the person this phone's key belongs to: GET /api/register/person?key=<mine>. An answer that lists only keys (no names yet) names them 'Device 1', 'Device 2'. */
export async function listDevices(deviceKey: string, options: Options = {}): Promise<MyDevices> {
  const body = await signed(`/register/person?key=${encodeURIComponent(deviceKey)}`, {}, options);
  const personId = typeof body.personId === 'string' ? body.personId : '';
  if (body.known === false || !personId) throw new RegisterError('This phone is not on a registered licence.', 404);
  const named = Array.isArray(body.devices) ? body.devices.filter(isDevice) : [];
  if (named.length > 0) return { personId, devices: named };
  const keys = Array.isArray(body.keys) ? body.keys.filter((key): key is string => typeof key === 'string') : [];
  return { personId, devices: keys.map((key, at) => ({ key, name: `Device ${at + 1}`, addedAt: '' })) };
}

/** Names a device of the licence: PATCH /api/register/device {deviceKey, name}. */
export async function renameDevice(deviceKey: string, name: string, options: Options = {}): Promise<void> {
  await signed('/register/device', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceKey, name }) }, options);
}

/** Removes a device from the licence: DELETE /api/register/device {deviceKey, personId}. The site issuer revokes that key's licence and the slot is free. */
export async function removeDevice(personId: string, deviceKey: string, options: Options = {}): Promise<void> {
  await signed('/register/device', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceKey, personId }) }, options);
}
