// A text box with a hard limit (mw-5r3p30.601): the browser keeps only what fits of a paste past `maxLength` and says nothing, so the box says it: 'N pasted, M fit'.
// A box he writes a long text in (a question, an approach) keeps it whole and counts instead (src/ui/LengthNote.tsx); this is for a short field, a name or a line,
// whose limit is a real one. Every <input> and <textarea> with a maxLength is one of these (tests/unit/question-limits.test.ts fails on a raw one).
import { cutBy, cutWords, type Cut } from './pasteCut';
import { useState, type ClipboardEvent, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';

function useCutNote(max: number) {
  const [cut, setCut] = useState<Cut | undefined>();
  const onPaste = (e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const box = e.currentTarget;
    setCut(cutBy(box.value, box.selectionStart, box.selectionEnd, e.clipboardData.getData('text'), max));
  };
  const note: ReactNode = cut ? (
    <p role="status" data-cut-note className="break-words pt-1 text-sm font-medium text-bad">
      {cutWords(cut)}
    </p>
  ) : null;
  return { onPaste, clear: () => setCut(undefined), note };
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { maxLength: number; ref?: Ref<HTMLInputElement> };
type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { maxLength: number; ref?: Ref<HTMLTextAreaElement> };

export function LimitedInput({ maxLength, onPaste, onKeyDown, onBlur, ...rest }: InputProps) {
  const { onPaste: paste, clear, note } = useCutNote(maxLength);
  return (
    <>
      <input
        {...rest}
        maxLength={maxLength}
        onPaste={(e) => {
          onPaste?.(e);
          paste(e);
        }}
        onKeyDown={(e) => {
          clear();
          onKeyDown?.(e);
        }}
        onBlur={(e) => {
          clear();
          onBlur?.(e);
        }}
      />
      {note}
    </>
  );
}

export function LimitedTextarea({ maxLength, onPaste, onKeyDown, onBlur, ...rest }: AreaProps) {
  const { onPaste: paste, clear, note } = useCutNote(maxLength);
  return (
    <>
      <textarea
        {...rest}
        maxLength={maxLength}
        onPaste={(e) => {
          onPaste?.(e);
          paste(e);
        }}
        onKeyDown={(e) => {
          clear();
          onKeyDown?.(e);
        }}
        onBlur={(e) => {
          clear();
          onBlur?.(e);
        }}
      />
      {note}
    </>
  );
}
