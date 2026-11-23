// src/settings/extraRows/links.ts — the links of Settings to other screens (rows with `key` link.*, in the section of the page they sit on) (mw-6ww.175.107: rows that are not settings are gathered by glob, src/settings/gather.ts; this file is the place of its own).
import { depthFrom } from "../definitions/interest";
import { extraRows, type SettingsRow } from "../row";

const LINKS: readonly SettingsRow[] = [
  {
    key: "link.variantLessons",
    label: "Lessons on variant readings",
    hint: "Five short lessons on where the manuscripts differ and how to read it.",
    section: "variants",
  },
  {
    key: "link.aboutyou",
    label: "About you",
    hint: "Your age, pace and how you learn, so the tutor meets you where you are.",
    section: "aboutYou",
  },
  {
    key: "link.memory",
    label: "Memory",
    hint: "The notes Lampas keeps about you on this phone: read, edit, export and import them.",
    section: "memory",
  },
  {
    key: "link.studyway",
    label: "My study way",
    hint: "The lines you kept about how the tutor quizzes you.",
    section: "studyWay",
  },
  {
    key: "link.goal",
    label: "Goal",
    hint: "Where you are on the grammar of the language you are learning, and what to learn next.",
    section: "goal",
    dependsOn: depthFrom(3),
  },
  {
    key: "link.askmore",
    label: "Ask for more",
    hint: "Ask for an approach, a study resource, a text or a translation Lampas lacks.",
    help: "Each short form sends the makers what you type in it, and nothing goes until you tap its Send; Let the tutor do it fills the fields as you answer and still ends with a Send you tap. Include my memorizing evidence adds, only when you turn it on and only with that ask, your record of recalls of the verses you memorize (the day, how much was hidden, the words you missed, the days between). When the tutor offers to pass on something Lampas cannot do, Send this to the makers (or your yes) sends what you asked, its one-line summary and any pictures you attached.",
    section: "more",
  },
  {
    key: "link.conversations",
    label: "Conversations",
    hint: "Every talk you have kept with the tutor: search them and carry one on.",
    help: "Every talk is kept on this phone, and a question on its way is kept until its answer is stored. Each ask goes through the mill to the tutor with the screen you are on, any pictures you attach, the last ten turns of the talk and a short summary of the older ones (the tutor writes it and your phone keeps it), the passages it asked for earlier (read by your phone from Lampas's own text), and what bears on the answer: what you chose in About you, your progress and Today list, and your Memory notes, which the tutor may change or remove only when you ask it to.",
    section: "more",
  },
  {
    key: "link.requests",
    label: "Your requests",
    hint: "What became of the things you asked the factory for.",
    section: "more",
  },
  {
    key: "link.help",
    label: "Help",
    hint: "A short page on each piece of the app, and the tutor to ask.",
    section: "more",
  },
  {
    key: "link.about",
    label: "About",
    hint: "Where the text comes from, and its licences.",
    section: "more",
  },
];

export const linkRows = extraRows(90, LINKS);
