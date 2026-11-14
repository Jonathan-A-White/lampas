// src/review/studyThis.ts — what a wrong answer links to (mw-indx1x6.6, the Governor's words of 2026-11-12: 'If I get something wrong in a drill, can you link to the specific paradigm(s)/lesson(s)/word
// card(s), mnemonic ... If nothing is available, tutor should have enough context to help'). Pure: from the question he missed (a grammar question of Review or a drill, a word, or another Review item) it
// gives the links of the 'Study this' row (src/review/StudyThis.tsx draws and opens them), one for each thing that teaches what was asked, and the miss in words for the tutor, who is offered only when
// nothing teaches it. The mapping, by what the question carries (PROVISIONAL, the Governor to confirm):
//   table   a cell of a table (kind 'cell'): the table in Learn with that cell lit; an ending (kind 'ending'): the table on the asked word, as See the table opens it (seeTable.ts); a full parsing
//           (kind 'parse'): the table the parsed word lands in, its cell lit; any other question: the tables that teach its idea (data/paradigms paradigmsOf), two at the most, no cell
//   lesson  the teaching card of the question's idea (the idea sheet); a question about one letter, pair or mark of an idea built from items (the alphabet) opens that item's own card
//   word    the word the question names (an ending's or a parsing's headword; the word of a word question): its word sheet
//   how to remember it   a word that has a memory picture (data/pictures.ts) or a note on its heart (data/wordHeart.ts); no grammar idea has a mnemonic of its own
// Nothing: an English or Hebrew word he misread and says aloud (Review's 'sound' item with no question), and a question whose idea the ladder no longer has.
import { askedOf } from '../tutor/drillTalk';
import type { ScreenContext } from '../tutor/screen';
import type { DrillQuestion, DrillStep } from '../data/drill';
import type { GrammarQuestion } from '../data/grammar/questions';
import { splitParse, type ParseFeature } from '../data/parseCode';
import { ideaOfAny, ladderFor, ladderLangOf } from '../data/grammar/ladders';
import type { GrammarIdea } from '../data/grammar/ladder';
import { paradigmById, paradigmOfWord, paradigmsOf, type Paradigm } from '../data/paradigms';
import { cellName } from '../data/paradigms';
import { cellPrompt } from '../data/paradigms/cells';
import { pictureUrl } from '../data/pictures';
import type { Question } from '../data/quiz';
import { wordHeart } from '../data/wordHeart';
import type { ParadigmAddress } from '../nav/route';
import type { ReviewItem } from './kinds';
import { seeTableAddress } from './seeTable';

/** One link of the row: a table (at a cell), an idea's lesson, a word's card, or how to remember a word. */
export type StudyLink =
  | { kind: 'paradigm'; label: string; address: ParadigmAddress }
  | { kind: 'lesson'; label: string; ideaId: string }
  | { kind: 'word'; label: string; lemma: string; gloss?: string; hebrew?: true }
  | { kind: 'mnemonic'; label: string; lemma: string; gloss: string };

/** The miss in words, for the tutor: what was asked, what he answered, the right answer and the idea it tests. */
export interface Miss {
  asked: string;
  answer: string;
  right: string;
  idea: string;
}

/** What the row is drawn from. */
export interface Study {
  links: StudyLink[];
  miss: Miss;
}

/** The most tables an idea links when the question names no table of its own. */
const TABLES_OF_AN_IDEA = 2;

/** The idea with this id when the ladder has it and a card teaches it; undefined otherwise (a question kept from before the idea went). */
function taughtIdea(id: string | undefined): GrammarIdea | undefined {
  if (!id) return undefined;
  try {
    const idea = ideaOfAny(id);
    return ladderFor(ladderLangOf(id)).teach[id] ? idea : undefined;
  } catch {
    return undefined;
  }
}

const tableLink = (table: Paradigm, address: ParadigmAddress): StudyLink => ({ kind: 'paradigm', label: `Table: ${table.name}`, address });

/** The name of the cell a 'cell' question asked (paradigms cellName): the cell whose prompt it is and whose form is the answer. */
function askedCell(table: Paradigm, question: GrammarQuestion): string | undefined {
  for (const row of table.rows) {
    const column = row.cells.findIndex((cell, c) => cell.form === question.right && cellPrompt(table, row, c) === question.prompt);
    if (column >= 0) return cellName(table, row, column);
  }
  return undefined;
}

/** The tables of a question, the one it names first. */
function tablesOf(question: GrammarQuestion): StudyLink[] {
  const named = paradigmById(question.table);
  if (question.kind === 'cell' && named) {
    const cell = askedCell(named, question);
    return [tableLink(named, { table: named.id, mode: 'learn', ...(cell ? { cell } : {}) })];
  }
  const ending = seeTableAddress(question);
  if (ending && named) return [tableLink(named, ending)];
  if (question.kind === 'parse' && question.form && question.lemma && question.code && question.lang !== 'hbo') {
    const own = paradigmOfWord({ t: question.form, l: question.lemma, p: question.code });
    if (own) return [tableLink(own.table, { table: own.table.id, mode: 'learn', ...(own.cell ? { cell: own.cell } : {}), word: question.form, parse: question.code, lemma: question.lemma, own: true })];
  }
  return paradigmsOf(question.ideaId).slice(0, TABLES_OF_AN_IDEA).map((table) => tableLink(table, { table: table.id, mode: 'learn' }));
}

/** The idea whose card teaches the question: the item asked (a letter of the alphabet, whose own card it is) when the question is about one, else the question's idea. */
function lessonOf(question: GrammarQuestion): GrammarIdea | undefined {
  const item = taughtIdea(question.facet?.id);
  // an item names the idea it is an item of as its parent (a pair) or among what it needs (a letter)
  return item && (item.parent === question.ideaId || item.needs.includes(question.ideaId)) ? item : taughtIdea(question.ideaId);
}

const lessonLink = (idea: GrammarIdea): StudyLink => ({ kind: 'lesson', label: `Lesson: ${idea.title}`, ideaId: idea.id });

/** The title of an idea, or its id when the ladder no longer has it. */
function titleOf(ideaId: string): string {
  try {
    return ideaOfAny(ideaId).title;
  } catch {
    return ideaId;
  }
}

/** A grammar question he answered wrong (Review's grammar, table and sound items; every question of Drill it, the short drill and Prove it). */
export function studyOfQuestion(question: GrammarQuestion, picked: string): Study {
  const lesson = lessonOf(question);
  const links: StudyLink[] = [...tablesOf(question)];
  if (lesson) links.push(lessonLink(lesson));
  if (question.lemma && (question.kind === 'ending' || question.kind === 'parse')) {
    links.push({ kind: 'word', label: `Word: ${question.lemma}`, lemma: question.lemma, ...(question.lang === 'hbo' ? { hebrew: true as const } : {}) });
  }
  return { links, miss: { asked: askedOf(question), answer: picked, right: question.right, idea: question.facet?.label ?? titleOf(question.ideaId) } };
}

/** The values a pick of a step names, one for each feature of the step in its order ('plural masculine' is plural, masculine): the choices are matched longest first, since 'middle' begins 'middle or passive'. */
function pickedValues(features: readonly ParseFeature[], picked: string): (string | undefined)[] {
  let rest = picked;
  return features.map((f) => {
    const choice = [...f.choices].sort((a, b) => b.length - a.length).find((c) => rest === c || rest.startsWith(`${c} `));
    if (choice === undefined) return undefined;
    rest = rest.slice(choice.length).trimStart();
    return choice;
  });
}

/** The terms a Hebrew step's right answer can be taught by: the answer itself, then its words ('third person masculine singular' is also 'third person'). */
function hebrewTerms(step: DrillStep): string[] {
  const words = step.right.split(' ');
  const phrases = [step.right, step.right.charAt(0).toUpperCase() + step.right.slice(1), ...words.map((_, i) => words.slice(0, i + 1).join(' ')), ...words];
  return [...new Set(phrases)];
}

/** The idea that teaches what a step of the Parsing drill asked, or undefined when the ladder has none for it: the idea of the right value the pick got wrong (a step of two features, 'number and gender', is taught by the one he missed). */
function ideaOfStep(question: DrillQuestion, step: DrillStep, picked: string): string | undefined {
  if (question.lang === 'hbo') {
    const ladder = ladderFor('hbo');
    return hebrewTerms(step).map((t) => ladder.ideaOfTerm(t)).find((id) => id !== undefined);
  }
  const ladder = ladderFor('grc');
  if (step.id === 'pos') return ladder.ideaOfTerm(splitParse(question.code).pos) ?? (step.right === 'pronoun' ? 'pronoun' : undefined);
  const ids = step.id.split('+');
  const features = ids.flatMap((id) => splitParse(question.code).features.filter((f) => f.id === id));
  const chosen = pickedValues(features, picked);
  const missed = features.find((f, i) => chosen[i] !== f.value) ?? features[0];
  return missed ? ladder.ideaOfTerm(missed.value) : undefined;
}

/**
 * A step of the Parsing drill he answered wrong (mw-indx1x6.10): the step is the question 'what is the mood of this word', a 'parse' question of the idea its right value teaches, and the one mapping above
 * (studyOfQuestion) does the rest: the table the word lands in with its cell lit, the idea's lesson, the word's card. A step whose idea the ladder lacks links the table and the word only.
 */
export function studyOfParseStep(question: DrillQuestion, step: DrillStep, picked: string): Study {
  const ideaId = ideaOfStep(question, step, picked);
  const asked: GrammarQuestion = {
    kind: 'parse',
    ideaId: ideaId ?? '',
    prompt: `What is the ${step.label.toLowerCase()} of`,
    options: step.options,
    right: step.right,
    form: question.form,
    code: question.code,
    lemma: question.lemma,
    ...(question.lang ? { lang: question.lang } : {}),
  };
  const study = studyOfQuestion(asked, picked);
  return { links: study.links, miss: { ...study.miss, asked: `${asked.prompt} ${question.form}? (${question.reference})` } };
}

/** A word he answered wrong (Review's word items, as multiple choice or a flashcard). */
export function studyOfWord(question: Question, picked: string): Study {
  const { lemma, gloss } = question;
  const links: StudyLink[] = [{ kind: 'word', label: `Word: ${lemma}`, lemma, gloss, ...(question.lang === 'hbo' ? { hebrew: true as const } : {}) }];
  if (pictureUrl(lemma) || wordHeart(lemma)) links.push({ kind: 'mnemonic', label: 'How to remember it', lemma, gloss });
  return { links, miss: { asked: `What does ${question.prompt} mean?`, answer: picked, right: gloss, idea: `The word ${lemma}` } };
}

/** Any item of a Review round he answered wrong: `picked` is the option he tapped, or the grade of a flashcard. */
export function studyOfItem(item: ReviewItem, picked: string): Study {
  if (item.kind === 'word') return studyOfWord(item.question, picked);
  if (item.kind === 'drill-plan') {
    const idea = taughtIdea(item.ideaId);
    const title = titleOf(item.ideaId);
    const prove = item.item.kind === 'prove';
    return {
      links: [...paradigmsOf(item.ideaId).slice(0, TABLES_OF_AN_IDEA).map((table) => tableLink(table, { table: table.id, mode: 'learn' })), ...(idea ? [lessonLink(idea)] : [])],
      miss: {
        asked: prove ? `Prove it: a full Drill it of ${title}` : `A short drill on ${item.item.facet?.label ?? ''} in ${title}`,
        answer: picked,
        right: prove ? 'Proving it: three right in a row at the top step' : 'Passing it: one miss at the most',
        idea: title,
      },
    };
  }
  if (item.question) return studyOfQuestion(item.question, picked);
  // an English or Hebrew word he misread, said aloud and graded by himself: nothing in the app teaches how it is said
  const word = item.kind === 'sound' ? (item.word ?? '') : '';
  return { links: [], miss: { asked: `Say this word aloud: ${word}`, answer: picked, right: word, idea: `Saying the word ${word}` } };
}

/** The first turn of the talk 'Ask the tutor' opens: it names the question, his answer, the right answer and the idea, then asks. */
export function missFirstTurn({ asked, answer, right, idea }: Miss): string {
  return `I got this wrong. The question: “${asked}”. My answer: “${answer}”. The right answer: “${right}”. The idea it tests: ${idea}. Explain why the right answer is right, where I went wrong, and how to remember it.`;
}

/** The screen the miss's talk reports (`name` is the screen he was on: Review, Drill it): the miss as facts, so every later turn of the talk has it too. */
export function missScreen(name: string, { asked, answer, right, idea }: Miss): ScreenContext {
  return {
    name,
    facts: [
      { label: 'Question he missed', value: asked },
      { label: 'He chose', value: answer },
      { label: 'Right answer', value: right },
      { label: 'Idea', value: idea },
    ],
  };
}
