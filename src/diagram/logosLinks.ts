// src/diagram/logosLinks.ts — 'See it in Logos' under a verse's diagram (mw-5r3p30.893): the books of his Logos library that show a verse's syntax, by the verse's language. Greek: the Lexham Syntactic Greek
// New Testament and its Expansions and Annotations, each opened at the verse (the Bible reference every verse-indexed book of his takes, src/resources/logosBible.ts bibleRef; his library listing marks
// both bible+na27). Hebrew: his library holds no verse-indexed syntax resource, so the two syntax grammars open as books, at their start. Both: Diagrammatical Analysis, the how-to. Every link is
// the logosres: scheme with its ref.ly address as the fallback (src/resources/logosRes.ts), the full Resource ID as the 'In another book…' chooser writes it (src/library/inLogos.ts).
// The ids are those of the vault's plans/lampas-logos-library-2026-10-08.csv; UNVERIFIED on a device until the Governor taps one (docs/resources.md).
import { bibleRef } from '../resources/logosBible';
import { resourceLink, resourceStart, type LogosLink } from '../resources/logosRes';
import type { StudyPlace } from '../resources/types';

export interface DiagramLogosLink extends LogosLink {
  label: string;
}

const LEXHAM_SGNT = 'LLS:LEXHAMSGNT';
const SGNT_NOTES = 'LLS:SGNTNOTES';
const HEBREW_SYNTAX = 'LLS:46.20.9';
const STUDENTS_GUIDE = 'LLS:46.20.3';
const DIAGRAMMATICAL_ANALYSIS = 'PDF:DIAGANALYSIS';

/** The links of the row, in the order drawn: by `language` ('hbo' the Old Testament's, else Greek), then the how-to. A Greek verse of a book with no Logos abbreviation has only the how-to. */
export function diagramLogosLinks(place: StudyPlace, language: 'grc' | 'hbo'): DiagramLogosLink[] {
  const how: DiagramLogosLink = { label: 'How to diagram', ...resourceStart(DIAGRAMMATICAL_ANALYSIS) };
  if (language === 'hbo') {
    return [
      { label: 'Hebrew Syntax', ...resourceStart(HEBREW_SYNTAX) },
      { label: "Student's Guide", ...resourceStart(STUDENTS_GUIDE) },
      how,
    ];
  }
  const ref = bibleRef(place.book, place.chapter, place.verse);
  if (!ref) return [how];
  return [
    { label: 'Lexham SGNT', ...resourceLink(LEXHAM_SGNT, `ref=${ref}`) },
    { label: 'SGNT Notes', ...resourceLink(SGNT_NOTES, `ref=${ref}`) },
    how,
  ];
}
