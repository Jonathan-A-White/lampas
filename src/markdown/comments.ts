// src/markdown/comments.ts — a repo .md carries notes for its repo readers: HTML comments, and the table of contents `mw toc` keeps between
// '<!-- toc -->' and '<!-- /toc -->'. The app's screens never show them: every screen that draws a repo .md (Markdown.tsx, About's parser) goes through this.
const TOC_BLOCK = /<!--\s*toc\s*-->[\s\S]*?<!--\s*\/toc\s*-->/g;
const COMMENT = /<!--[\s\S]*?-->/g;

/** The text without its HTML comments (one line or many) and its generated table of contents. */
export const stripComments = (text: string): string => text.replace(TOC_BLOCK, '').replace(COMMENT, '');
