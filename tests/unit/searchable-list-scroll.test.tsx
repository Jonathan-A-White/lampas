// tests/unit/searchable-list-scroll.test.tsx — typing in a SearchableList shows the first matches, not the middle the list opened at (mw-5r3p30.1118): the list's own box
// (bounded) or the page's box (flat) is scrolled back to the top. jsdom has no layout, so scrollTop is set by hand; the picker's own proof is tests/e2e/chapter-picker.spec.ts.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SearchableList } from '../../src/ui/SearchableList';

const items = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}` }));

describe('a SearchableList scrolls to its top when the search changes', () => {
  it('moves its own box when it is bounded', async () => {
    render(<SearchableList label="Things" noun="thing" items={items} />);
    const box = screen.getByTestId('searchable-list-box');
    box.scrollTop = 120;
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Things' }), 'I');
    expect(box.scrollTop).toBe(0);
  });

  it("moves the page's box when it is flat, as the Library's kind pages are", async () => {
    render(
      <main className="screen">
        <SearchableList label="Things" noun="thing" items={items} flat focus="i20" />
      </main>,
    );
    const page = document.querySelector<HTMLElement>('.screen')!;
    page.scrollTop = 400;
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Things' }), 'I');
    expect(page.scrollTop).toBe(0);
  });
});
