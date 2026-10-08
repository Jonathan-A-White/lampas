// Home (the Reader) and the Unlock screen both show the build's version as 'v<version> · <date> · <commit>'.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Unlock } from '../../src/gate/Unlock';
import { BuildVersion } from '../../src/BuildVersion';

afterEach(cleanup);

describe('the version on screen', () => {
  it('Unlock shows v and the build’s version', () => {
    render(<Unlock locked={{ kind: 'none' }} publicKeyHex="02ab" onCheckAgain={vi.fn()} />);
    expect(screen.getByTestId('build-version')).toHaveTextContent(`v${__APP_VERSION__}`);
  });

  it('BuildVersion, which Home shows under the chapter, is v and the build’s version', () => {
    render(<BuildVersion />);
    expect(screen.getByTestId('build-version').textContent).toBe(`v${__APP_VERSION__}`);
  });
});
