import { decideLxxRealData, realProbe } from './support/lxx-real-data';

// Pin the zone for the whole run, before any worker starts, so clock-format tests pass on a host in any zone.
export default function setup(): void {
  process.env.TZ = 'UTC';
  // Decide once, before the workers, whether the tests that read the real git-ignored Septuagint sources run, and say so in one line of the gate's log (tests/support/lxx-real-data.ts, mw-cv2w9um).
  const real = decideLxxRealData(realProbe());
  process.env.LAMPAS_LXX_REAL_DATA = JSON.stringify(real);
  process.stdout.write(`${real.line}\n`);
}
