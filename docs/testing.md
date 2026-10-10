# Testing behind the licence gate

Lampas opens on an Unlock screen until the phone's key holds a `lampas` licence on chain (`src/gate/`).
The gate is not switched off for tests: a test that needs the reader either answers the licence lookup
or starts from a key it knows. This page names the one place the key lives and how a test seeds it.

## The device key's storage (the test seam)

- Place: `window.localStorage`, under the key **`lampas.deviceKey`** (`DEVICE_KEY_STORAGE_KEY` in `src/config.ts`).
- Value: the private key as 64 lower-case hex characters (a number from 1 up to the curve order).
- It lives outside the Dexie database on purpose (`src/data/db.ts` is shared by other stories).
- Made once on first open (`getOrCreateDeviceKey`, `src/services/deviceKey.ts`) and never rewritten while it is
  valid. A stored value that is not a usable key (not hex, zero, past the curve order) is replaced by a new one.
- The Unlock screen shows the matching **public** key (33 bytes, 66 hex chars) in `data-testid="device-key"`;
  that is what Postern's Key screen issues a licence to.

The seam is a storage location, not a bypass: the gate still asks the chain whether that key holds a licence
minted by the issuer. A seeded key with no licence sees Unlock.

### Seeding a known key in Playwright

Write the key before the app boots, then load the page:

```ts
await page.addInitScript((hex) => window.localStorage.setItem('lampas.deviceKey', hex), PRIVATE_KEY_HEX);
await page.goto('/');
await expect(page.getByTestId('device-key')).toHaveText(PUBLIC_KEY_HEX);
```

`tests/e2e/unlocked.ts` has `seedDeviceKey(page, hex)`, and the well-known pair the specs use
(`SEED_PRIVATE_KEY` = 1, `SEED_PUBLIC_KEY` = `0279be66…1798`).

A live test (for example the tutor's) that needs the real reader seeds a key whose licence is on testnet and lets
the real lookup run. A test that must not touch the network uses `openUnlocked(page)`: it seeds the key, plants the
offline-grace memory (`lampas.licenceHeld` = `{"publicKeyHex": …, "at": <ms>}`, good for 24 h) and refuses every
WhatsOnChain request, so the gate opens on its remembered "held" answer.

### Seeding a key in a Gherkin step

```ts
window.localStorage.setItem('lampas.deviceKey', '00'.repeat(31) + '01');
render(<Gate issuer={ISSUER} check={stub}><App /></Gate>);
```

`features/gate.feature` has the scenario ("A key stored through the test seam is the device key"); its steps are in
`features/steps/gate.steps.tsx`. Unit and feature tests give `Gate` a `check` stub and a `now` clock; they never
touch the network. `fetchLicenceStatus` is tested with bsv-kit's `FakeChainReader` (`tests/unit/licence-check.test.ts`); `tests/support/licence-chain.ts` builds the mint, transfer and issuer-revoke transactions it reads.

Opt-in live check, not in the gate: `npm run check:licence -- <public key>` asks testnet what the gate would answer (held, revoked, indexing or none).

## A new question card's settling moment

A question card (the placement's, Review's, the Quick test's) ignores taps for `SETTLE_MS` (300 ms, `src/ui/settle.ts`) after it appears,
so the second tap of a double tap on Next chooses nothing. Tests tap the instant a card is drawn, so `tests/setup.ts` sets `settle.ms` to 0
and `openUnlocked(page)` plants `lampas.settleMs` = `0`; `features/double-tap.feature` and `tests/unit/settle.test.tsx` put the moment back.

## The tutor's tests

- `features/tutor.feature` runs against `tests/support/fake-postern.ts`: signed `/api/challenge`, `/api/me`, `/api/messages`;
  its mill opens the grist with its own key and answers it (`autoReply`, or held until `answer(...)`); `licensed = false`
  answers 401 `no_licence`, `down = true` makes every call fail as an unreachable backend does. Steps stub `fetch` so
  `https://postern.allmymind.org` goes to the fake and `/data/...` to the committed chapter files, and shorten
  `tutorTimings.pollMs`.
- `tests/e2e/tutor.spec.ts` (in `npm run shots`, shots `ask.png` and `answer.png`) routes Postern's origin to the same fake
  from Playwright (`tests/support/playwright-postern.ts`); the app's real signing and sealing run.
- `tests/e2e/tutor-live.spec.ts` is the true end-to-end test, Playwright project `live`, run by `npm run e2e:live` only. It
  tests the **deployed** build: the project's `baseURL` is `LAMPAS_LIVE_URL` or `https://lampas.allmymind.org`, it builds nothing
  and starts no preview server (`LAMPAS_E2E=live` leaves out the config's `webServer`), because Postern's CORS allows only that
  origin and a localhost preview ends 'Could not reach the tutor'. It therefore proves a landing only after the deploy. It
  seeds the device key from `process.env.LAMPAS_TEST_KEY`, or the line `LAMPAS_TEST_KEY=<hex>` in
  `~/.config/mw/lampas-test.env`, through the seam above, lets the real gate look the licence up on testnet, asks about
  Romans 8:28 and waits up to 120 s for an answer that mentions συνεργεῖ or συνεργέω. With no key, or a backend that does not
  answer `/api/challenge`, it prints `SKIP tutor-live: <reason>` and reports skipped, never passed. The key is never printed.
  It needs the mill to know the app (`lampas` in `[grist-apps]`, `POSTERN_APPS` `lampas=lampas`) and spends one grind of fuel.

## Settings (`src/config.ts`)

| Name | Env var | Default |
| --- | --- | --- |
| issuer public key | `VITE_LAMPAS_ISSUER` | the Governor's issuer key `035666d4…44c4` (public); a blank value means the default |
| collection | none | `lampas` |
| chain | `VITE_LAMPAS_CHAIN` | `testnet` (bsv-kit reads testnet only so far) |
| Postern door | `VITE_POSTERN_DOOR` | `https://postern.allmymind.org` |

Vite bakes these in at build time: set the variable for `npm run build`.
