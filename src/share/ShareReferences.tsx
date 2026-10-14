// src/share/ShareReferences.tsx — the Bible references in the words that were shared to Lampas (mw-s1dc0n.1): 'Bible references (N)', each one a link that opens
// the Reader on the verse (a range at its first verse). In the order of the page by default, so he can go through them as he reads; the switch above the list
// puts them in Bible order, grouped under each book, and the choice is kept on the phone for the next share.
import { useMemo, useState } from 'react';
import { referenceUrl } from '../nav/links';
import { openHash } from '../nav/route';
import { findReferences, groupedByBook, listReferences, type ListedReference, type RefsOrder } from '../nav/refsInText';

const KEY = 'lampas.shareRefsOrder';
const ORDERS: readonly { id: RefsOrder; label: string }[] = [
  { id: 'page', label: 'Page order' },
  { id: 'bible', label: 'Bible order' },
];

function savedOrder(): RefsOrder {
  try {
    return localStorage.getItem(KEY) === 'bible' ? 'bible' : 'page';
  } catch {
    return 'page';
  }
}

function keepOrder(order: RefsOrder): void {
  try {
    localStorage.setItem(KEY, order);
  } catch {
    // Storage refused: the next share opens in page order again.
  }
}

/** The link to the verse. A plain tap opens the Reader through the address (a Back step, so Back returns to the list; not a change of `location.hash`, whose popstate the open sheet would take for Back and cancel the share); anything else (a long press, a new tab)
 *  has the https link. */
function RefLink({ r }: { r: ListedReference }) {
  const href = referenceUrl(r.book, r.chapter, r.verse);
  return (
    <a
      href={href}
      data-share-ref={r.ref}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openHash(href.slice(href.indexOf('#')));
      }}
      className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-lg font-medium text-accent active:bg-line"
    >
      <span className="min-w-0 break-words">{r.printed}</span>
      {r.count > 1 ? (
        <>
          {' '}
          <span className="shrink-0 text-base text-muted">{`×${r.count}`}</span>
        </>
      ) : null}
    </a>
  );
}

/** The section for the shared words `text`. */
export function ShareReferences({ text }: { text: string }) {
  const [order, setOrder] = useState<RefsOrder>(savedOrder);
  const found = useMemo(() => findReferences(text), [text]);
  const listed = useMemo(() => listReferences(found, order), [found, order]);
  if (listed.length === 0) {
    return (
      <section data-share-refs aria-label="Bible references">
        <p className="text-base text-muted">No Bible references found</p>
      </section>
    );
  }
  return (
    <section data-share-refs aria-labelledby="share-refs-title" className="space-y-2">
      <h3 id="share-refs-title" className="text-lg font-semibold">{`Bible references (${listed.length})`}</h3>
      <div role="group" aria-label="Order of the references" className="grid grid-cols-2 gap-1 rounded-xl border border-line p-1">
        {ORDERS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={order === o.id}
            onClick={() => {
              setOrder(o.id);
              keepOrder(o.id);
            }}
            className={`min-h-11 rounded-lg px-3 text-base font-medium ${order === o.id ? 'bg-accent text-accent-fg' : 'text-muted active:bg-line'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {order === 'page' ? (
        <ul className="space-y-2">
          {listed.map((r) => (
            <li key={`${r.ref}-${r.lastVerse ?? ''}`}>
              <RefLink r={r} />
            </li>
          ))}
        </ul>
      ) : (
        groupedByBook(listed).map((g) => (
          <div key={g.book} role="group" aria-label={g.name} className="space-y-2">
            <h4 className="pt-1 text-base font-semibold text-muted">{g.name}</h4>
            <ul className="space-y-2">
              {g.refs.map((r) => (
                <li key={`${r.ref}-${r.lastVerse ?? ''}`}>
                  <RefLink r={r} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
