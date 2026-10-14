// src/data/rusty.ts (mw-1vuvq6.6): which SOLID words and ideas have gone rusty, for the `rusty` field the tutor grinds are sent. Pure, from fixtures.
import { describe, expect, it } from 'vitest';
import { DAY, type Review } from '../../src/data/schedule';
import { RUSTY_MAX, RUSTY_OVERDUE_DAYS, RUSTY_SLIP_DAYS, WELCOME_BACK_ITEMS, overdueOf, rustyOf, type RustyCandidate } from '../../src/data/rusty';

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);
const ago = (days: number) => NOW - days * DAY;

/** A solid item at the 14-day step, last seen `seen` days ago and due `due` days from now unless `over` says otherwise. */
function candidate(id: string, over: Partial<Review> & { seen?: number; kind?: 'word' | 'idea' } = {}): RustyCandidate {
  const { seen = 10, kind = 'word', ...row } = over;
  const review: Review = { kind: kind === 'word' ? 'word' : 'grammar', id, step: 3, due: ago(seen) + 14 * DAY, lastWhen: ago(seen), lapses: 0, rights: 0, ...row };
  return { kind, id, title: id, review };
}

describe('rusty items', () => {
  it('has the provisional thresholds in one place', () => {
    expect(RUSTY_SLIP_DAYS).toBe(7);
    expect(RUSTY_OVERDUE_DAYS).toBe(7);
    expect(RUSTY_MAX).toBe(8);
  });

  it('a solid word with a lapse in its last 3 reviews is rusty, and says how often this week', () => {
    const slipped = candidate('λόγος', {
      seen: 1,
      lapses: 2,
      recent: [
        { when: ago(4), right: false },
        { when: ago(2), right: true },
        { when: ago(1), right: false },
      ],
    });
    expect(rustyOf([slipped], NOW)).toEqual([{ kind: 'word', id: 'λόγος', title: 'λόγος', why: 'slipped twice this week' }]);
  });

  it('a lapse older than a week still counts while it is among the last 3 reviews', () => {
    const old = candidate('θεός', { seen: 3, recent: [{ when: ago(20), right: false }, { when: ago(10), right: true }, { when: ago(3), right: true }] });
    expect(rustyOf([old], NOW)).toEqual([{ kind: 'word', id: 'θεός', title: 'θεός', why: 'slipped lately' }]);
  });

  it('a solid idea unseen for 21 days is rusty: not seen for 3 weeks', () => {
    const idea = candidate('case-genitive', { kind: 'idea', seen: 21 });
    expect(rustyOf([idea], NOW)).toEqual([{ kind: 'idea', id: 'case-genitive', title: 'case-genitive', why: 'not seen for 3 weeks' }]);
  });

  it('an item reviewed right yesterday is not rusty', () => {
    const fresh = candidate('ἀγάπη', { seen: 1, rights: 1, recent: [{ when: ago(1), right: true }] });
    expect(rustyOf([fresh], NOW)).toEqual([]);
  });

  it('an item not yet due, however long since it was seen, is not rusty (a 30-day step is meant to be rare)', () => {
    const rare = candidate('πίστις', { seen: 21, step: 4, due: NOW + 9 * DAY });
    expect(rustyOf([rare], NOW)).toEqual([]);
  });

  it('an item only just past due is not rusty either: it is overdue by under a week', () => {
    expect(rustyOf([candidate('ἔργον', { seen: 18 })], NOW)).toEqual([]);
    expect(rustyOf([candidate('ἔργον', { seen: 22 })], NOW)).toHaveLength(1);
  });

  it('says a week for a single week and weeks after that', () => {
    expect(rustyOf([candidate('a', { seen: 14, due: ago(8) })], NOW)[0].why).toBe('not seen for 2 weeks');
    expect(rustyOf([candidate('a', { seen: 7, due: ago(7) })], NOW)[0].why).toBe('not seen for a week');
  });

  it('has the most slips first, then the longest unseen; at most 8', () => {
    const twice = candidate('twice', { seen: 1, recent: [{ when: ago(2), right: false }, { when: ago(1), right: false }] });
    const once = candidate('once', { seen: 1, recent: [{ when: ago(1), right: false }] });
    const weeks = Array.from({ length: 9 }, (_, i) => candidate(`away-${i}`, { seen: 22 + i }));
    const out = rustyOf([...weeks, once, twice], NOW);
    expect(out).toHaveLength(RUSTY_MAX);
    expect(out.slice(0, 2).map((r) => r.id)).toEqual(['twice', 'once']);
    expect(out[2].id).toBe('away-8');
    expect(out[7].id).toBe('away-3');
  });

  it('keeps the title and the kind it was given', () => {
    const idea = { ...candidate('case-genitive', { kind: 'idea', seen: 30 }), title: 'The genitive case' };
    expect(rustyOf([idea], NOW)[0]).toMatchObject({ kind: 'idea', id: 'case-genitive', title: 'The genitive case' });
  });
});

describe('overdue solid items, for Welcome back', () => {
  it('lists the most overdue first, at most WELCOME_BACK_ITEMS, and leaves out what is not due', () => {
    const rows = [
      candidate('late-5', { due: ago(5) }),
      candidate('late-20', { due: ago(20) }),
      candidate('later', { due: NOW + DAY }),
      candidate('late-9', { kind: 'idea', due: ago(9) }),
      ...Array.from({ length: 6 }, (_, i) => candidate(`late-${30 + i}`, { due: ago(30 + i) })),
    ];
    const out = overdueOf(rows, NOW);
    expect(out).toHaveLength(WELCOME_BACK_ITEMS);
    expect(out.map((o) => o.id)).toEqual(['late-35', 'late-34', 'late-33', 'late-32', 'late-31']);
    expect(overdueOf(rows.slice(0, 4), NOW).map((o) => o.id)).toEqual(['late-20', 'late-9', 'late-5']);
  });
});
