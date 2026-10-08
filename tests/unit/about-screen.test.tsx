import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { About } from '../../src/About';
import { parseAttribution, plainText } from '../../src/attribution';

afterEach(cleanup);

describe('the About screen and ATTRIBUTION.md', () => {
  it('shows every entry of ATTRIBUTION.md word for word, so the two cannot drift', () => {
    const doc = parseAttribution(readFileSync('ATTRIBUTION.md', 'utf8'));
    render(<About />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(doc.entries.map(plainText));
    expect(screen.getByText(plainText(doc.intro))).toBeVisible();
  });
});
