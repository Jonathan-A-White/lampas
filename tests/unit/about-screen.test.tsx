import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { About } from '../../src/About';
import { parseAttribution, plainText } from '../../src/attribution';
import { screenContextNow } from '../../src/tutor/screenContext';
import { suggestionsFor } from '../../src/tutor/screen';

afterEach(cleanup);

describe('the About screen and ATTRIBUTION.md', () => {
  it('shows every entry of ATTRIBUTION.md word for word, so the two cannot drift', () => {
    const doc = parseAttribution(readFileSync('ATTRIBUTION.md', 'utf8'));
    render(<About />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(doc.entries.map(plainText));
    expect(screen.getByText(plainText(doc.intro))).toBeVisible();
  });

  it('leaves the credits with the Ask the tutor control, so the tutor can explain what each is for', () => {
    render(<About />);
    const context = screenContextNow();
    expect(context?.name).toBe('About');
    const said = context?.credits?.map((c) => `${c.name}: ${c.use} (${c.licence}) ${c.link}`).join('\n') ?? '';
    for (const name of ['React', 'Dexie', 'WhatsOnChain', 'Gentium Plus', 'Beads', 'TBESG']) expect(said).toContain(name);
    expect(suggestionsFor('About')).toContain('What does each of these do for Lampas?');
  });
});
