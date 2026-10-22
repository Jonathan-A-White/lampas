// The second door in the places a verse is shown with an Open in Logos (mw-rfjjzd.9, docs/design/library-at-scale.md 3.6): the tutor's verse chip row has 'In another book' beside its chips while a
// Greek text, interlinear or commentary that covers the book is On, and the Old Testament reference card keeps Open in Logos alone while no interlinear covers its book.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setKind, setResourceOn } from '../../src/data/repositories';
import { ElsewhereLine } from '../../src/markdown/ReferenceCard';
import { TutorLinks } from '../../src/TutorLinks';

afterAll(() => db.close());

async function phone(kinds: readonly ('greek-text' | 'commentary')[]): Promise<void> {
  cleanup();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  await setResourceOn('logos', true);
  for (const kind of kinds) await setKind(kind, 'on');
}

describe('the tutor\'s verse chips', () => {
  beforeEach(() => phone(['greek-text']));

  it('have In another book beside the Logos chip, and the button opens the chooser at the verse', async () => {
    render(<TutorLinks links={[{ kind: 'verse', reference: 'Romans 8:28' }]} onLeave={() => undefined} />);
    const group = await screen.findByRole('group', { name: 'Romans 8:28' });
    expect(await within(group).findByRole('link', { name: /Open Romans 8:28 in/ })).toBeTruthy();
    await userEvent.click(await within(group).findByRole('button', { name: 'In another book' }));
    expect(await screen.findByRole('dialog', { name: 'Romans 8:28 in Logos' })).toBeTruthy();
  });

  it('have none while no book that covers the place is On', async () => {
    await phone([]);
    render(<TutorLinks links={[{ kind: 'verse', reference: 'Romans 8:28' }]} onLeave={() => undefined} />);
    const group = await screen.findByRole('group', { name: 'Romans 8:28' });
    await within(group).findByRole('link', { name: /Open Romans 8:28 in/ });
    expect(within(group).queryByRole('button', { name: 'In another book' })).toBeNull();
  });
});

describe('the Old Testament reference card', () => {
  it('keeps Open in Logos, and has no second door while no interlinear covers the book', async () => {
    await phone(['greek-text', 'commentary']);
    render(<ElsewhereLine place={{ book: 'psa', chapter: 23, verse: 1 }} onSettings={() => undefined} />);
    expect(await screen.findByRole('link', { name: /Open in Logos/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'In another book…' })).toBeNull();
  });
});
