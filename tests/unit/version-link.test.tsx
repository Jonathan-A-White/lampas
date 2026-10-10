// The version in About is a link to CHANGELOG.md on GitHub for a public repo, and not a link for a private one
// (bsv-kit/whats-new's versionLink says null; About's own list is then the whole answer).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VersionLink } from '../../src/whatsNew/VersionLink';

afterEach(cleanup);

describe('VersionLink', () => {
  it('links a public repo to the version’s heading in CHANGELOG.md', () => {
    render(<VersionLink repo="me/app" isPublic version="0.5.10" />);
    const link = screen.getByTestId('version-link');
    expect(link).toHaveAttribute('href', 'https://github.com/me/app/blob/main/CHANGELOG.md#0510');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('draws nothing for a private repo', () => {
    render(<VersionLink repo="me/app" isPublic={false} version="0.5.10" />);
    expect(screen.queryByTestId('version-link')).toBeNull();
  });
});
