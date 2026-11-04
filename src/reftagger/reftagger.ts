// src/reftagger/reftagger.ts — the entry of https://lampas.allmymind.org/reftagger.js (vite.config.ts builds it on its own, no framework, as one script with no hash in its name):
// a page loads it with one <script> tag and the references in its post text are links to Lampas (tagger.ts). It makes no network call and sets no cookie.
// docs/links.md 'The blog's tagger'.
import { POST_TEXT, tagReferences } from './tagger';

const run = (): void => {
  for (const post of document.querySelectorAll(POST_TEXT)) tagReferences(post);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
else run();
