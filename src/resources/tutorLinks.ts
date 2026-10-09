// src/resources/tutorLinks.ts — what a link of the tutor's answer (mw-5r3p30.75) becomes: a chip for each study resource he switched on in Settings,
// and none for a resource he has not (nothing says so). A word link gives the first link of each resource that is on, named for the lemma
// ('Open in Logos: BDAG for ἀγάπη', his first ticked lexicon); a verse link gives, for each resource that can show a Bible, the verse in it (Logos: his
// Bible in Logos). Lampas's own Reader is not a resource: the verse chip that opens it is drawn by src/TutorLinks.tsx. Pure: the Strong's number and
// his Bible are looked up by the caller. Links only, no text of any lexicon (docs/resources.md).
import type { StudyResources } from '../data/repositories';
import { optionOf, RESOURCES, type StudyPlace, type StudyResource } from './index';

/** One chip: the app's own address, its https fallback, the short words on it and the accessible name. */
export interface LinkChip {
  resource: StudyResource;
  label: string;
  tile: string;
  url: string;
  fallback?: string;
}

const switchedOn = (chosen: StudyResources): StudyResource[] => RESOURCES.filter((r) => chosen.on.includes(r.id));

/** The chips of a word link: the first link of every resource that is on. `strongs` is the lemma's number from the lexicon; without it a resource of
 *  kind 'number' (Strong's) gives no chip, as it has nothing to link. */
export function wordChips(lemma: string, strongs: string | undefined, chosen: StudyResources): LinkChip[] {
  const chips: LinkChip[] = [];
  for (const resource of switchedOn(chosen)) {
    if (resource.kind === 'number' && !strongs) continue;
    const [link] = resource.linksFor({ form: lemma, lemma, strongs: strongs ?? '' }, optionOf(resource, chosen.options[resource.id]));
    if (link) chips.push({ resource, label: `${link.label} for ${lemma}`, tile: link.tile ?? link.label, url: link.url, fallback: link.fallback });
  }
  return chips;
}

/** The chips of a verse link in the apps that are on and can show a Bible (`name` is the reference as written, 'Romans 8:31'); `bible` is his Bible in Logos. */
export function verseChips(place: StudyPlace, name: string, chosen: StudyResources, bible: string): LinkChip[] {
  const chips: LinkChip[] = [];
  for (const resource of switchedOn(chosen)) {
    const [link] = resource.versesFor?.(place, bible) ?? [];
    if (link) chips.push({ resource, label: link.label.replace(/^Open /, `Open ${name} `), tile: link.tile ?? link.label, url: link.url, fallback: link.fallback });
  }
  return chips;
}
