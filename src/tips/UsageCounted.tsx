// src/tips/UsageCounted.tsx — 'What Lampas has counted' on the Settings home (mw-6ww.175.15): the screens he has opened, each with how many times, and the
// screens he has never opened. It reads only the usage store (listUsage) and asks no server: the counts are kept on his phone and shown to him (docs/tips.md).
import { useLiveQuery } from 'dexie-react-hooks';
import { listUsage } from '../data/repositories';
import { screensCounted } from './summary';

export function UsageCounted() {
  const usage = useLiveQuery(listUsage, []);
  if (usage === undefined) return null;
  const { opened, never } = screensCounted(usage);
  return (
    <section aria-labelledby="usage-counted" data-usage-counted className="mt-6 pb-4">
      <h2 id="usage-counted" className="text-lg font-semibold">
        What Lampas has counted
      </h2>
      <p className="mt-1 text-base text-muted">How often you opened each screen. This stays on this phone.</p>
      <h3 className="mt-3 text-base font-semibold">Opened</h3>
      {opened.length === 0 ? (
        <p className="text-base text-muted">No screen yet.</p>
      ) : (
        <ul aria-label="Opened" className="text-base">
          {opened.map((s) => (
            <li key={s.id} className="py-1">
              {s.label} · {s.count}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-3 text-base font-semibold">Never opened</h3>
      {never.length === 0 ? (
        <p className="text-base text-muted">You have opened every screen.</p>
      ) : (
        <ul aria-label="Never opened" className="text-base">
          {never.map((s) => (
            <li key={s.id} className="py-1">
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
