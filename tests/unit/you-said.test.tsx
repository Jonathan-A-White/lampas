// tests/unit/you-said.test.tsx — the 'You said' line (src/ui/YouSaid.tsx, mw-5r3p30.308): his own words under the tutor's cleaned question, only for a spoken question
// the tutor changed. The cards that draw it are proven in tests/e2e/verse-ask-voice.spec.ts.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { YouSaid } from '../../src/ui/YouSaid';

afterEach(cleanup);

describe('YouSaid', () => {
  it('shows his words under a cleaned question he spoke', () => {
    render(<YouSaid spoken said="what does technia mean" shown="What does Τεκνία mean?" />);
    expect(screen.getByText('You said: what does technia mean')).toBeTruthy();
  });

  it('shows nothing for a typed question, even one the tutor tidied', () => {
    const { container } = render(<YouSaid said="what does technia mean" shown="What does Τεκνία mean?" />);
    expect(container.textContent).toBe('');
  });

  it('shows nothing when the tutor gave no cleaned question or only changed its capitals and spacing', () => {
    const none = render(<YouSaid spoken said="what does called mean" />);
    expect(none.container.textContent).toBe('');
    const same = render(<YouSaid spoken said="what does  called mean" shown="What does called mean" />);
    expect(same.container.textContent).toBe('');
  });
});
