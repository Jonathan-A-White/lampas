// src/attribution.ts — ATTRIBUTION.md is the one source of the credits: the About screen is built from it,
// so what the app shows and what the repository says cannot differ. The reader is src/attributionParse.ts.
import attributionMd from '../ATTRIBUTION.md?raw';
import { parseAttribution, type Attribution } from './attributionParse';

export { parseAttribution, type Attribution, type Quote, type Section } from './attributionParse';

export const attribution: Attribution = parseAttribution(attributionMd);

/** The text as it reads on screen: no markdown marks, a link as its name. */
export function plainText(md: string): string {
  return md.replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '');
}
