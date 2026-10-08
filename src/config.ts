// src/config.ts — the one place the licence gate and the tutor read their settings. Each can be set at
// build time (VITE_LAMPAS_*); the defaults below are what `npm run build` bakes in when nothing is set.

/** The collection a Lampas licence is minted in. */
export const COLLECTION = 'lampas';

/**
 * The issuer's public key (66 hex chars): only a licence minted by a transaction this key signed counts.
 * It is the Governor's Postern key, the one on Postern's Key screen. Empty until set: the gate then stays
 * shut and says so, rather than trusting a guess. Set VITE_LAMPAS_ISSUER for the build to fill it.
 */
export const DEFAULT_ISSUER = '';
export const ISSUER: string = (import.meta.env.VITE_LAMPAS_ISSUER ?? DEFAULT_ISSUER).trim().toLowerCase();

/** The chain the licence is read from. Testnet until the Governor says mainnet (VITE_LAMPAS_CHAIN=mainnet). */
export type Chain = 'testnet' | 'mainnet';
export const CHAIN: Chain = import.meta.env.VITE_LAMPAS_CHAIN === 'mainnet' ? 'mainnet' : 'testnet';

/** The Postern door the tutor talks to (SpellForge's backendUrl). */
export const POSTERN_DOOR: string = import.meta.env.VITE_POSTERN_DOOR ?? 'https://postern.allmymind.org';

/**
 * Where the device key (a 32-byte private key as 64 hex chars) lives: localStorage, outside the Dexie
 * database. It is also the test seam (docs/testing.md): a test may write a known key here before boot.
 */
export const DEVICE_KEY_STORAGE_KEY = 'lampas.deviceKey';

/** Where the last 'held' answer is remembered, for the offline grace. */
export const LICENCE_CACHE_STORAGE_KEY = 'lampas.licenceHeld';

/** How long a 'held' answer keeps the reader open when the chain cannot be reached. */
export const LICENCE_GRACE_MS = 24 * 60 * 60 * 1000;
