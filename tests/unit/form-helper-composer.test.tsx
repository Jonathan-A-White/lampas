// tests/unit/form-helper-composer.test.tsx — 'Let the tutor do it' answers through voice-kit's Composer (mw-5r3p30.761): the hold-to-talk bar, Attach a picture, Take a photo and
// typing, in place of its own textarea and picker. A picture added in the Composer reaches the form exactly as the form's own picker's did (the form's `onPictures` is given the
// Files); a form with no place for a picture refuses one in the Composer's own line. The tutor is faked at askTalk; the rest is features/form-helper.feature.
import 'fake-indexeddb/auto';
import { readFileSync, readdirSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APPROACH_FORM } from '../../src/formHelper/approachForm';
import { FormHelper, START_LABEL } from '../../src/formHelper/FormHelper';
import { BOOK_FORM } from '../../src/library/bookForm';
import { stubRecognizer } from '../support/fake-recognizer';

const asked = vi.hoisted(() => ({ requests: [] as { message: string }[] }));
vi.mock('../../src/services/deviceKey', () => ({ getDeviceKeyBytes: () => new Uint8Array(32) }));
vi.mock('../../src/services/talk', async (original) => ({
  ...(await original<typeof import('../../src/services/talk')>()),
  askTalk: async (request: { message?: string; question?: string }) => {
    asked.requests.push({ message: request.message ?? request.question ?? '' });
    return { answer: 'Do you have a screenshot or a photo of it?', words: [], form_ask: 'pictures' };
  },
}));

const user = userEvent.setup();
const helper = () => screen.getByRole('region', { name: 'The tutor is helping with this form' });
const attachInput = (): HTMLInputElement => helper().querySelector<HTMLInputElement>('input[type="file"]:not([capture])') as HTMLInputElement;

async function open(props: Partial<React.ComponentProps<typeof FormHelper>> = {}): Promise<void> {
  asked.requests = [];
  render(<FormHelper form={APPROACH_FORM} values={{}} onFill={() => undefined} {...props} />);
  await user.click(screen.getByRole('button', { name: START_LABEL }));
  await within(await screen.findByRole('region', { name: 'The tutor is helping with this form' })).findByText('Do you have a screenshot or a photo of it?');
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the form helper answers through the shared Composer', () => {
  it('shows the hold-to-talk bar, Attach a picture and Take a photo, and no textarea until he chooses to type', async () => {
    stubRecognizer();
    await open({ form: BOOK_FORM });
    expect(within(helper()).getByRole('button', { name: /^(Hold|Tap) to answer/ })).toBeInTheDocument();
    expect(within(helper()).getByRole('button', { name: 'Attach a picture' })).toBeInTheDocument();
    expect(within(helper()).getByRole('button', { name: 'Take a photo' })).toBeInTheDocument();
    await user.click(within(helper()).getByRole('button', { name: 'Type an answer' }));
    expect(within(helper()).getByRole('textbox', { name: 'Your answer' })).toBeInTheDocument();
  });

  it('typing an answer and tapping Reply tells the tutor', async () => {
    await open();
    await user.type(within(helper()).getByRole('textbox', { name: 'Your answer' }), 'Anna Example');
    await user.click(within(helper()).getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(asked.requests.map((r) => r.message)).toContain('Anna Example'));
  });

  it('gives the form the Files of a picture attached in the Composer, as its own picker did', async () => {
    const onPictures = vi.fn();
    await open({ onPictures });
    await user.upload(attachInput(), new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' }));
    await user.click(within(helper()).getByRole('button', { name: 'Reply' }));
    await waitFor(() => expect(onPictures).toHaveBeenCalledTimes(1));
    const files = onPictures.mock.calls[0][0] as File[];
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect([files[0].name, files[0].type, files[0].size]).toEqual(['shot.png', 'image/png', 3]);
  });

  it('refuses a picture, in the Composer, when the form has no place for one', async () => {
    await open({ form: BOOK_FORM });
    await user.upload(attachInput(), new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' }));
    expect(await within(helper()).findByText(/no place for a picture/i)).toBeInTheDocument();
  });

  it('has no textarea of its own left in src/formHelper/', () => {
    for (const file of readdirSync('src/formHelper')) {
      expect(readFileSync(`src/formHelper/${file}`, 'utf8'), file).not.toMatch(/<textarea|<input[^>]*type="file"/);
    }
  });
});
