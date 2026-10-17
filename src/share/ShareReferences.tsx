// src/share/ShareReferences.tsx — the Bible references in the words that were shared to Lampas (mw-s1dc0n.1): 'Bible references (N)', each one a link that opens
// the Reader on the verse (a range at its first verse). In the order of the page by default, so he can go through them as he reads; the switch above the list
// puts them in Bible order, grouped under each book, and the choice is kept on the phone for the next share. The references of a shared picture (the find-refs grist,
// src/share/findRefs.ts, mw-s1dc0n.2) join the same list: while the grist reads, 'Finding Bible references...'; a failure is one line with 'Try again'.
import { useMemo, useState } from 'react';
import { ReferenceLink } from '../markdown/ReferenceCard';
import { inWords, referenceUrl } from '../nav/links';
import { openHash } from '../nav/route';
import { findReferences, groupedByBook, listReferences, type FoundReference, type ListedReference, type RefsOrder } from '../nav/refsInText';
import type { PictureRefs } from './findRefs';

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

const LINK_CLASS = 'flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-lg font-medium text-accent active:bg-line';

/** What a reference is called on its card: in words ('Genesis 1:28', 'Psalm 23', a range 'Genesis 1:28-30'), as the tutor's cards head it. */
function headingOf(r: ListedReference): string {
  const words = inWords(r.ref).replace(/^Psalms /, 'Psalm ');
  return r.lastVerse === undefined ? words : `${words}-${r.lastVerse}`;
}

/** What a link shows: the words as printed, and how many times the text names it. */
function Printed({ r }: { r: ListedReference }) {
  return (
    <>
      <span className="min-w-0 break-words">{r.printed}</span>
      {r.count > 1 ? (
        <>
          {' '}
          <span className="shrink-0 text-base text-muted">{`×${r.count}`}</span>
        </>
      ) : null}
    </>
  );
}

/** The link to the verse. A plain tap opens the Reader through the address (a Back step, so Back returns to the list; not a change of `location.hash`, whose popstate the open sheet would take for Back and cancel the share); anything else (a long press, a new tab)
 *  has the https link. A reference to the Old Testament, which Lampas does not hold, opens the card the tutor's references open ('Not in Lampas yet', with Open in Logos when
 *  Logos is on) and the list stays where it is. */
function RefLink({ r }: { r: ListedReference }) {
  const href = referenceUrl(r.book, r.chapter, r.verse);
  if (r.testament === 'ot') {
    return (
      <ReferenceLink
        written={r.printed}
        old={{ heading: headingOf(r), place: { book: r.book, chapter: r.chapter, ...(r.verse === undefined ? {} : { verse: r.verse }) } }}
        href={href}
        className={LINK_CLASS}
        data={{ 'data-share-ref': r.ref }}
      >
        <Printed r={r} />
      </ReferenceLink>
    );
  }
  return (
    <a
      href={href}
      data-share-ref={r.ref}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openHash(referenceUrl(r.book, r.chapter, r.verse, r.printed).replace(/^[^#]*/, ''));
      }}
      className={LINK_CLASS}
    >
      <Printed r={r} />
    </a>
  );
}

/** The section for what was shared: the references in its words `text` and, for a picture, what the grist found in it (`picture`, with `retry` for a failure). */
export function ShareReferences({ text, picture, retry }: { text?: string; picture?: PictureRefs; retry?: () => void }) {
  const [order, setOrder] = useState<RefsOrder>(savedOrder);
  const found = useMemo<FoundReference[]>(() => [...findReferences(text ?? ''), ...(picture?.status === 'done' ? picture.found : [])], [text, picture]);
  const listed = useMemo(() => listReferences(found, order), [found, order]);
  if (picture?.status === 'reading') {
    return (
      <section data-share-refs aria-label="Bible references">
        <p role="status" className="text-base text-muted">
          Finding Bible references...
        </p>
      </section>
    );
  }
  if (picture?.status === 'failed') {
    return (
      <section data-share-refs aria-label="Bible references" className="space-y-2">
        <p role="alert" className="text-base">
          {picture.line}
        </p>
        <button type="button" onClick={retry} className="min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium text-accent">
          Try again
        </button>
      </section>
    );
  }
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
