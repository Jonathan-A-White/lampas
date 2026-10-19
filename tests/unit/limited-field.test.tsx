// A short text box with a limit says what a paste lost (mw-5r3p30.601): the browser keeps what fits and says nothing, so the box says 'You pasted N characters and M fit'.
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LimitedInput, LimitedTextarea } from '../../src/ui/LimitedField';
import { cutBy, cutWords } from '../../src/ui/pasteCut';

function Form() {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  return (
    <>
      <LimitedInput aria-label="Name" maxLength={10} value={name} onChange={(e) => setName(e.target.value)} />
      <LimitedTextarea aria-label="Note" maxLength={20} value={note} onChange={(e) => setNote(e.target.value)} />
    </>
  );
}

describe('cutBy', () => {
  it('is nothing while the paste fits, and counts a selection the paste replaces as room', () => {
    expect(cutBy('abc', 3, 3, 'defghij', 10)).toBeUndefined();
    expect(cutBy('abcdefghij', 0, 10, '0123456789', 10)).toBeUndefined();
    expect(cutBy('abcdefghij', 10, 10, 'x', 10)).toEqual({ pasted: 1, fit: 0, max: 10 });
    expect(cutBy('abcde', 5, 5, '0123456789', 10)).toEqual({ pasted: 10, fit: 5, max: 10 });
  });

  it('says it in words', () => {
    expect(cutWords({ pasted: 10, fit: 5, max: 10 })).toBe('You pasted 10 characters and 5 fit (the box takes 10): the rest was cut off.');
    expect(cutWords({ pasted: 3, fit: 0, max: 10 })).toBe('The box is full at 10 characters: nothing of the 3 pasted was added.');
  });
});

describe('LimitedInput and LimitedTextarea', () => {
  it('keep what fits of a long paste and tell him the rest was cut', async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.click(screen.getByRole('textbox', { name: 'Name' }));
    await user.paste('abcdefghijklmnop');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('abcdefghij');
    expect(screen.getByRole('status')).toHaveTextContent('You pasted 16 characters and 10 fit (the box takes 10): the rest was cut off.');
  });

  it('say nothing while a paste fits, and drop the note on the next key', async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.click(screen.getByRole('textbox', { name: 'Note' }));
    await user.paste('short');
    expect(screen.queryByRole('status')).toBeNull();
    await user.paste('x'.repeat(30));
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue(('short' + 'x'.repeat(30)).slice(0, 20));
    expect(screen.getByRole('status')).toHaveTextContent('You pasted 30 characters and 15 fit (the box takes 20)');
    await user.keyboard('{Backspace}');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
