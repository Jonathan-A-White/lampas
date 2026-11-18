// src/reftagger/reftagger.ts — the entry of https://lampas.allmymind.org/reftagger.js (vite.config.ts builds it on its own, no framework, as one script with no hash in its name):
// a page loads it with one <script> tag and the references in its post text are links to Lampas (tagger.ts); a tap on one opens a popup with the verse and an Open in Lampas button (popup.ts).
// It makes one network call, when a popup opens: the chapter's file from Lampas (a plain GET, no credentials). It sets no cookie.
// docs/links.md 'The blog's tagger'.
import { listenForPopups } from './popup';
import { HERO_TEXT, POST_TEXT, SITE_TEXT, adoptLinks, tagReferences } from './tagger';

// The script's own tag, read while it runs (it is gone once it has): the chapter files a popup shows come from the origin the script came from.
const tag = document.currentScript;
const origin = tag instanceof HTMLScriptElement && tag.src ? new URL(tag.src).origin : undefined;

const run = (): void => {
  for (const post of document.querySelectorAll(POST_TEXT)) {
    adoptLinks(post);
    tagReferences(post);
  }
  for (const hero of document.querySelectorAll(HERO_TEXT)) tagReferences(hero, { dash: true });
  for (const place of document.querySelectorAll(SITE_TEXT)) {
    adoptLinks(place);
    tagReferences(place);
  }
  listenForPopups(origin);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
else run();
