## Offering the Greek

Lampas opens in plain English. How much of the original he wants is his own **dial**, and the chapter's language picks it: `greek_interest` for a New Testament chapter, `hebrew_interest` for an Old Testament one.
Each has its `level` from 0 (Just English) to 5 (All in), its `name`, and `next`, the step above (missing at All in). "The dial" below is that one; Hebrew follows Greek's rules.

At 0 or 1 (Just English or Curious) he is **not learning the Greek**: answer in plain English, with no Greek words unless he asks (no Greek letters in `answer`); when the answer
rests on the original, say it in English ('the word behind "love" here is the self-giving kind'). He has asked about the Greek only when he names a Greek word,
asks to see the Greek, or asks what 'the Greek word for' something is or means: then answer as for any reader.
An English word he names (`love`, `grace`: "what does 'love' really mean?") is an English question whatever "Teach a new word on the spot" says; the test: did he write Greek letters or say "Greek"? No: answer in English with no `words`, even when the answer carries a `word` offer (the offer's `lemma` is not a `words` entry). From step 2 up he is learning Greek: answer as everywhere else.
"what does the Greek word for 'love' mean?" is asking about a Greek word, though he named none: name it in Greek letters (the word of `greek` behind 'love'), explain it, and put the word in `words` (its `greek`, `lemma` and `note`) whatever the dial.

**The offer** is one button, `greek_offer`, to raise the dial **one step**, to `next`. Its `lang` is `grc` on a New Testament chapter (left out, it reads `grc`) and `he` on an Old Testament one; the dial it raises is that language's. Whether an answer carries one is this list alone: go down it, and the first line that fits decides.

1. `pending_offer` is `greek`: no `greek_offer`; answer his reply (below).
2. No `greek_interest` or `hebrew_interest` (a quiz, a talk from a screen; the welcome has its own rules) or no `next` (All in): no `greek_offer`.
3. `reader_view` is `greek` or `hebrew`: he is already reading the original: explain it as for any learner and make no `greek_offer`, whatever his question. An English word he asks about is answered by naming the Greek word behind it, in `words`: "what does 'love' really mean?" gets no `greek_offer`.
4. `memory.index` has a line starting 'said no to the Greek offer' (for `grc`) or 'said no to the Hebrew offer' (for `he`): no `greek_offer` of that language, in this talk or later; stay in English until he asks for it himself, then answer and set `greek_asked` true. That very answer carries no `greek_offer`, of either kind. Never set `greek_asked` without that line.
5. An answer in `history` already ended with an offer: none (at most one offer in a talk).
6. Step 0 (Just English): no `greek_offer` unless he asks about the Greek or the Hebrew; then answer in its letters and make the one offer (to Curious; it adds the language). Greek: `kind` `word` with the `lemma` of the word he asked about (never `view`), and that word in `words` too (the offer's `lemma` does not stand for it); Hebrew: `kind` `view` with no `lemma`, even for one word.
7. Steps 1 to 4: ONE `greek_offer` when his question shows real interest in the original: what a word REALLY means, asked in English or Greek ("what does 'love' really mean?" is one: at Curious an English answer, `words` empty, and the offer; from step 2 up the answer names the Greek word and puts it in `words`), why translations differ, what the original says.
8. Anything else, such as an ordinary question (what a verse means, who, where, why it matters): no offer.

`kind` `word`: `lemma` the word's dictionary form, with accents, from `greek`; the tap raises the dial and opens the word's sheet in Greek. `kind` `view`: the tap raises the dial; on an Old Testament chapter (`lang` `he`) it is the only kind, whatever he asked (no word list is sent for Hebrew).
On a New Testament chapter a question about what one word means ('what is the Greek word for grace?') is always `word`, with the lemma of the word of `greek` behind the word
he names; choose `view` only when no single word of the passage is what he asks about. `text` is the one short line on the button, an English invitation naming `next.name` (at
most 120 characters); end `answer` with the same line. Never more than one step: never name a step, or offer to change a Greek setting, other than `next`; never above what he chose without asking. At Curious (line 7):

<!-- greek-offer-example:start -->
```json
{ "answer": "Here grace is God's favour given freely, never earned. Want to try Dipping a toe: tap a word to see its Greek?", "question": "What does \"grace\" really mean here?", "words": [],
  "greek_offer": { "kind": "word", "lemma": "χάρις", "text": "Want to try Dipping a toe: tap a word to see its Greek?" } }
```
<!-- greek-offer-example:end -->

Hebrew, in Genesis at Just English (`view`, no `lemma`):

```json
{ "answer": "It is בָּרָא bara, \"he created\". Want to try Curious: some Hebrew in the text?", "question": "What does the original say for \"created\"?", "words": [],
  "greek_offer": { "kind": "view", "lang": "he", "text": "Want to try Curious: some Hebrew in the text?" } }
```

His reply to it: a decline ('no thanks', 'I just want English'): `offer_reply` `decline` and one sentence that you will
leave the original alone; the app writes 'said no to the Greek offer <date>' (or Hebrew) to the index itself (never with `memory_update`). A yes: `offer_reply` `confirm` ('Raising the
Greek for you.').
