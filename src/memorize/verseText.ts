// src/memorize/verseText.ts — the words of a verse in each language he memorizes it in, for the tutor's verseText fact (mw-fu7dqf.12): memorizeTarget's tokens joined per language, the weave
// being the weave of the moment, as a session would show it. The fact reads this for each verse he memorizes (the kit's facts take no args, so the tutor cannot name a verse); verseTextOf is the
// one verse's.
import { memorizedOf } from '../data/repositories/memorize';
import { memorizeTarget, type TargetLang } from './target';
import { MEMORIZE_LANGS, type MemorizeLang } from './languages';
import { weaveSettingsNow } from './weaveSettings';

/** What the tutor reads of verses: the text by language ('en', 'el', 'weave'), each a verse's words in the order a session asks them. */
export type VerseTexts = Partial<Record<MemorizeLang, string>>;

/** The most bytes the verseText fact reads: its verses come first-come and the fact never grows past this, so one request keeps room for the rest. */
export const VERSE_TEXT_BYTES = 3500;

/** A verse's text in English and in each other language he memorizes it in; {} for an Old Testament reference or a string that names no verse. */
export async function verseTextOf({ ref }: { ref: string }): Promise<VerseTexts> {
  const memorized = (await memorizedOf([ref])).get(ref) ?? [];
  const langs = MEMORIZE_LANGS.filter((lang) => lang === 'en' || memorized.includes(lang));
  const weave = langs.includes('weave') ? await weaveSettingsNow() : undefined;
  const texts: VerseTexts = {};
  for (const lang of langs) {
    const target = await memorizeTarget(ref, lang as TargetLang, weave);
    if (!target) return {};
    texts[lang] = target.tokens.map((t) => t.text).join(' ');
  }
  return texts;
}

/** The text of each reference given, as the fact holds it, `first` (the verse he is in a session of) first; stops before the fact is over VERSE_TEXT_BYTES. */
export async function verseTextsOf(refs: readonly string[], first?: string): Promise<Record<string, VerseTexts>> {
  const ordered = first && refs.includes(first) ? [first, ...refs.filter((r) => r !== first)] : [...refs];
  const read: Record<string, VerseTexts> = {};
  for (const ref of ordered) {
    const texts = await verseTextOf({ ref });
    if (Object.keys(texts).length === 0) continue;
    if (new TextEncoder().encode(JSON.stringify({ ...read, [ref]: texts })).length > VERSE_TEXT_BYTES) break;
    read[ref] = texts;
  }
  return read;
}
