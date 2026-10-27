// src/memorize/TypeIt.tsx — the field a Memorize recall is typed in (mw-fu7dqf.9, docs/layout/memorize.md): one text box and Check. For Greek the box says lang="el" so the phone offers the Greek keyboard
// he added (Settings > Daily > Greek keyboard); for Hebrew lang="he", right to left, in the Hebrew face (Settings > Daily > Hebrew keyboard); Lampas draws no keyboard of its own. The words go to the session's onTyped, which judges them the way a said recall is judged (accents, breathings, case,
// punctuation and a final sigma do not count; a Hebrew word's points and cantillation do not count, its consonants do).
import { useEffect, useId, useRef, useState } from 'react';
import { focusQuietly } from '../ui/focus';
import type { MemorizeLang } from './languages';

type Typed = Exclude<MemorizeLang, 'weave'>;

export function TypeIt({ lang, disabled, onTyped }: { lang: Typed; disabled?: boolean; onTyped(text: string): void }) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  useEffect(() => focusQuietly(field.current), []);
  const empty = text.trim() === '';
  const check = (): void => {
    if (!empty && !disabled) onTyped(text);
  };
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium">
        {lang === 'el' ? 'Type the verse in Greek' : lang === 'he' ? 'Type the verse in Hebrew' : 'Type the verse'}
      </label>
      <textarea
        ref={field}
        id={id}
        rows={4}
        lang={lang}
        dir={lang === 'he' ? 'rtl' : undefined}
        value={text}
        disabled={disabled}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            check();
          }
        }}
        className={`block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-fg disabled:opacity-60 ${lang === 'el' ? 'font-greek text-[length:var(--lp-greek-size)]' : lang === 'he' ? 'script-he reader-hebrew' : 'text-lg'}`}
      />
      <button type="button" disabled={empty || disabled} onClick={check} className="min-h-12 w-full rounded-lg bg-accent px-4 text-base font-medium text-accent-fg disabled:opacity-40">
        Check
      </button>
    </div>
  );
}
