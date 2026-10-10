// src/resources/hosts.ts — the web hosts the study resources build links on. A link the tutor writes into an answer is drawn as a link only when it points at
// one of these, or at a credit's own address (About's talk gives a credit's link as a Markdown link; src/tutor/credits.ts) (src/markdown/Markdown.tsx); any other address
// is shown as text, so the model cannot send him anywhere the app did not choose (tests/unit/tutor-resources.test.ts holds this list against the hosts every resource builds).
import { LINK_ORIGIN } from '../config';
import { CREDITS } from '../tutor/credits';

export const RESOURCE_HOSTS: readonly string[] = ['www.stepbible.org', 'www.blueletterbible.org', 'ref.ly', new URL(LINK_ORIGIN).host];

/** True when `href` is an https address on a host a resource builds links on. */
export function isResourceLink(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && RESOURCE_HOSTS.includes(url.host);
  } catch {
    return false;
  }
}

/** True when `href` is a credit's own link or a page under it (the credits the tutor is given on About). */
export function isCreditLink(href: string): boolean {
  return CREDITS.some((c) => {
    const base = c.link.replace(/\/$/, '');
    return href === base || href.startsWith(`${base}/`);
  });
}

/** True when an address in an answer may be drawn as a link: a resource's host or a credit's own address. */
export const isKnownLink = (href: string): boolean => isResourceLink(href) || isCreditLink(href);
