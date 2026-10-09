// mw-5r3p30.83: vitest sends each console line from the worker to the main process over rpc. A line written after the
// last test of a file (an unawaited Dexie write failing once the file closed the db, a late timer) can still be in
// flight when the worker closes, and a loaded host then fails the whole run with
// 'EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending' although every test passed.
// With the interception off, console writes go straight to the stream and no rpc call can be pending at teardown.
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('console output at worker teardown', () => {
  it('is not sent over the worker rpc', () => {
    // read as text: importing the config pulls esbuild into jsdom, which refuses to run there
    expect(readFileSync('vitest.config.ts', 'utf-8')).toMatch(/^\s*disableConsoleIntercept: true,/m);
  });
});

// The straggler: logs after this file has finished, as the app's best-effort writes do (console.error in a catch).
// Under load, with the interception on, this file alone made the run fail with the teardown error.
afterAll(() => {
  for (const ms of [1, 5, 20, 50, 100]) setTimeout(() => console.error(`late log after the last test (${ms} ms)`), ms);
});
