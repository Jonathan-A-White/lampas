# The Preface rule

The Preface (`src/preface.ts`, drawn by `src/Preface.tsx`) is about the text, not the app. It is the Governor's rule (his A on mw-5r3p30.821, 2026-10-27;
his words on mw-5r3p30.847, 2026-10-28: "a durable way of keeping the preface focused on the text and not on the app").

## What belongs in it

- **The texts we chose**: the Greek (which edition, which changes are laid on it, where the variant readings come from) and the Hebrew and Aramaic.
- **The English**: which translation sits beside each, and why.
- **The sources**: who made each text, its licence, and a link to it.
- **Why we chose them**, in a plain sentence, not an argument.

## What does not

Screens, buttons, features, modes, settings and the tutor's behaviour: what a tap opens, what Quiz me or Review asks, what the Reader shows, what a dial
does, how the tutor answers. A story that changes a text, source or credit updates the Preface (and About); a story that changes what the app does updates
**Help** (`src/help.ts`, one page of under 120 words per piece of the app), never the Preface. If a sentence would stop being true when a screen changes, it
is Help's.

## How it is held

`tests/unit/preface-rule.test.ts` fails when the Preface's text (its paragraphs, its links and the page as drawn) names an app screen or control; the list
of words is kept in the test. If a text note truly needs one of those words, say it another way.

`VISION.md` links this file. The Greek paragraph is held to `docs/greek-edition.md` by `tests/unit/greek-edition.test.ts`.
