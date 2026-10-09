// src/script/ScriptText.tsx — text with a script of src/script/scripts.ts in it, drawn as the tutor's answers draw it: each stretch of that script
// a span with its language and direction, in its bundled font, and the rest as it is.
import { scriptOf, splitScripts } from './scripts';

export function ScriptText({ text }: { text: string }) {
  return (
    <>
      {splitScripts(text).map((part, i) => {
        const script = part.script ? scriptOf(part.script) : undefined;
        return script ? (
          <span key={i} lang={script.id} dir={script.dir} className={script.className}>
            {part.text}
          </span>
        ) : (
          part.text
        );
      })}
    </>
  );
}
