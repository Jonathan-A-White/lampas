// tests/e2e/live.ts — what the live specs (tests/e2e/*-live.spec.ts, the 'live' Playwright project) share: the test key, the
// check that the backend answers, and how a skip is reported. Nothing here prints the key.
import { test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { POSTERN_DOOR } from '../../src/config';

const ENV_FILE = join(homedir(), '.config', 'mw', 'lampas-test.env');

/** The test key and where it came from, or why there is none. */
export function testKey(): { key: string } | { missing: string } {
  const fromEnv = process.env.LAMPAS_TEST_KEY?.trim();
  if (fromEnv) return { key: fromEnv };
  if (!existsSync(ENV_FILE)) return { missing: `LAMPAS_TEST_KEY is not set and ${ENV_FILE} does not exist` };
  const line = readFileSync(ENV_FILE, 'utf8').split('\n').find((l) => l.startsWith('LAMPAS_TEST_KEY='));
  const key = line?.slice('LAMPAS_TEST_KEY='.length).trim().replace(/^["']|["']$/g, '');
  return key ? { key } : { missing: `LAMPAS_TEST_KEY is not set and ${ENV_FILE} has no LAMPAS_TEST_KEY= line` };
}

/** Why the backend cannot be reached, or undefined when it answers. */
export async function unreachable(): Promise<string | undefined> {
  try {
    const response = await fetch(`${POSTERN_DOOR}/api/challenge`, { signal: AbortSignal.timeout(15_000) });
    return response.ok ? undefined : `${POSTERN_DOOR} answered ${response.status} to /api/challenge`;
  } catch (err) {
    return `${POSTERN_DOOR} cannot be reached: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Greek without its accents and breathings, lower case, so the check does not depend on how the tutor accents a word. */
export const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Skipped before any browser is launched: a skip names its reason and is never a pass. */
export function skipBecause(spec: string, reason: string): void {
  console.log(`SKIP ${spec}: ${reason}`);
  test.skip(true, reason);
}

/** The test key when the live specs can run; otherwise the spec is skipped, naming what was missing, and '' is returned. */
export async function liveKeyOrSkip(spec: string): Promise<string> {
  const found = testKey();
  if ('missing' in found) {
    skipBecause(spec, found.missing);
    return '';
  }
  const down = await unreachable();
  if (down !== undefined) {
    skipBecause(spec, down);
    return '';
  }
  return found.key;
}
