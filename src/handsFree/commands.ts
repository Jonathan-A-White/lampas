// src/handsFree/commands.ts — the spoken commands of Hands-free (mw-rl10piw.6 and .7, the epic's first set), routed by voice-kit's spoken-command router (voice-kit/handsfree route:
// lower case, punctuation and a 'please' off, number words as digits).
//  - 'pause' pauses and it stays paused. 'play', 'resume', 'continue' and 'go on' go on with what is paused (by him or at the wake); when nothing is, the chapter on screen is read from where he
//    is through ONE request the Reader answers with its own start (src/nav/readerRequest.ts readHere: no second player, no plan built here); with no chapter open it says 'Open a chapter first'.
//  - 'stop' ends the reading and nothing goes on at the close.
//  - 'read', 'open' and 'go to' a place ('read John 3', 'go to John 3 16', PROVISIONAL: open AND read, the Governor's to confirm) say the place's name and read it from its verse
//    (src/handsFree/passage.ts says what the words are; the Reader opens there and reads, readerRequest.ts readPassage). Words that are no place: 'I could not find' and the words, and what
//    was playing goes on.
//  - 'read', 'open', 'go to', 'play' and 'listen to' a place that ends 'in Audible' or 'on Audible' open his audio Bible in the Audible app at the chapter instead (src/handsFree/audible.ts,
//    mw-rl10piw.11, PROVISIONAL: the words 'in Audible' pick Audible and plain 'read John 3' stays the voice inside Lampas); Audio Bible Off says so and opens nothing.
//  - 'next chapter' and 'previous chapter' cross with crossChapter and read the chapter from its first verse (PROVISIONAL, as above); past Revelation 22 or before Genesis 1 it says so.
//  - 'back a verse' reads the verse before the one being read, or paused on, again and the reading goes on from it, in the recorded voice and the phone's (readAloud.ts backAVerse).
//  - 'ask' and the words after it ('ask who was Nicodemus', 'ask the tutor ...') put the question to the tutor and speak the answer (src/handsFree/ask.ts, mw-rl10piw.8), then hold the microphone open 8 s for a
//    follow-up with no wake word; 'tutor' and 'open the tutor' open the Talk sheet on what is on screen and listen; 'close the tutor' and 'done' put it away. In a follow-up window (info.followUp) the words
//    of any command above run it (and put the tutor away if Hands-free opened it); any other words go to the tutor as the next turn of the same talk.
//  - 'help' and 'what can I say' say what he can say, from the one table below (HELP_LINES); tapping the mic mark shows the same list (HandsFreeGate.tsx, HelpSheet.tsx).
//  - Filler words around a command are dropped before it is routed (mw-rl10piw.44, withoutFiller): 'please', 'could you', 'can you' before it, 'me' right after 'read', and 'to me', 'for me' and 'please'
//    after it, so 'please read Proverbs 2 to me' is 'read Proverbs 2'. A question put to the tutor is not trimmed: 'for me' there is part of what he asks.
//  - 'pause', 'play' (and 'resume', 'continue', 'go on'), 'back', 'forward', 'restart' and 'stop' act on the sermon sheet that is open, on top of any Bible reading (mw-ecpivg5.3, src/sermons/voiceControls.ts, playback.ts
//    driveSermon): the reader reads a paragraph back or forward, the player moves 30 s (PROVISIONAL, the Governor to confirm); 'restart' starts over from the top; a Subsplash video cannot be driven and it says so.
//    With no sermon open 'pause', 'play' and 'stop' are the Bible reading's as above, and 'back', 'forward' and 'restart' say 'No sermon is open'.
// Any other words: it says 'Sorry, I did not get that, I heard "<his words>"' so he can tell what the phone made of them, and what was playing goes on when the exchange closes (src/handsFree/playback.ts).
import { defineSpoken, normaliseSpoken, route, type CommandDone, type SpokenRule } from 'voice-kit/handsfree';
import { titleOf } from '../data/books';
import { neighbours } from '../data/neighbours';
import { crossChapter } from '../reader/crossChapter';
import { readerOnScreen, readHere, readPassage } from '../nav/readerRequest';
import { askTutor, closeTutor, leaveTutor, openTutor, questionAfterAsk } from './ask';
import { listenInAudible } from './audible';
import { audibleOf, placeOfWords, type SpokenPlace } from './passage';
import { sermonControls } from '../sermons/voiceControls';
import { backOneVerse, driveSermon, goOnNow, keepPaused, stopSound, takeSound, type SermonAction } from './playback';

/** What it says to words it does not know. */
export const NOT_UNDERSTOOD = 'Sorry, I did not get that';

/** What it says to words it does not know, with the words it heard (mw-rl10piw.44): 'Sorry, I did not get that, I heard "two to me"'. Words with no letter in them say only NOT_UNDERSTOOD. */
export function notUnderstood(words: string): string {
  const heard = words.replace(/\s+/g, ' ').replace(/"/g, '').trim();
  return /[\p{L}\p{N}]/u.test(heard) ? `${NOT_UNDERSTOOD}, I heard "${heard}"` : NOT_UNDERSTOOD;
}

/** Words before a command that ask for it politely and are no part of it ('could you please read John 3'); each is dropped, in any order, once the router's own leading 'please' is off. */
const LEADING_FILLER = ['please', 'could you', 'can you', 'would you', 'will you', 'would you mind', 'i would like you to', 'i want you to'];
/** Words after a command that say for whom ('read John 3 to me', 'read it for me please'); dropped from the end, in any order. */
const TRAILING_FILLER = ['please', 'to me', 'for me', 'to us', 'for us', 'out loud', 'aloud'];
/** The words that open a command of reading, after which 'me' is filler ('read me John 3', 'play me John 3'). */
const MEANT_FOR_HIM = /^(read|red|reed|open|play|listen to) me\b/;

/** `words` as the router should read them: the router's own plain words (lower case, no punctuation, numbers as digits), then the filler of LEADING_FILLER dropped from the start, the filler of
 * TRAILING_FILLER from the end, and the 'me' after 'read' ('please read Proverbs 2 to me' is 'read proverbs 2'). A command made only of filler is left as it was heard. */
export function withoutFiller(words: string): string {
  let plain = normaliseSpoken(words);
  const strip = (): boolean => {
    for (const filler of LEADING_FILLER) {
      if (plain.startsWith(`${filler} `)) {
        plain = plain.slice(filler.length + 1);
        return true;
      }
    }
    for (const filler of TRAILING_FILLER) {
      if (plain.endsWith(` ${filler}`)) {
        plain = plain.slice(0, -(filler.length + 1));
        return true;
      }
    }
    return false;
  };
  while (strip());
  const me = MEANT_FOR_HIM.exec(plain);
  if (me) plain = `${me[1]}${plain.slice(me[0].length)}`;
  return plain === '' ? normaliseSpoken(words) : plain;
}

/** What it says to 'play' with nothing paused and no chapter open. */
export const OPEN_A_CHAPTER = 'Open a chapter first';

/** What it says to 'next chapter' at the end of the Bible. */
export const NO_NEXT_CHAPTER = 'There is no next chapter';

/** What it says to 'previous chapter' before the first chapter of the first book. */
export const NO_PREVIOUS_CHAPTER = 'There is no chapter before this';

/** What it says to 'back a verse' when no chapter is being read. */
export const NOTHING_READ = 'Nothing is being read';

/** What it says to 'back', 'forward' or 'restart' when no sermon is open (they are the sermon sheets' words; a Bible reading has 'back a verse' and the chapter commands). */
export const NO_SERMON_OPEN = 'No sermon is open';

/** What it says when the sermon sheet that is open cannot do what he said by voice (a Subsplash video has no player to call). */
export const NO_SERMON_CONTROL = 'Use the video’s own buttons for that';

/** The commands that act on the sermon reader or the sermon player when one is open (mw-ecpivg5.3). */
const SERMON_ACTIONS: ReadonlySet<string> = new Set<SermonAction>(['play', 'pause', 'back', 'forward', 'restart', 'stop']);

/** One command of the table: the router's rule and what the help says of it (mw-rl10piw.43). */
interface CommandEntry extends SpokenRule {
  help: {
    /** Where it stands in the list he hears and sees (the table's own order is the router's: what comes before what matters there). */
    rank: number;
    /** Words he can say for it, as the help gives them: read aloud and shown. The router must take them as this command (tests/unit/hands-free-commands.test.tsx). */
    example: string;
    /** What it does, in a few plain words, as the sheet shows it. */
    does: string;
  };
}

/** The commands, by the words that are them: the router's ONE table, and the help (spoken and shown) is made from it, so a command added here cannot be left out of it. The chapter commands come
 * before 'go to', which takes any words after it. 'red' and 'reed' are what a recogniser makes of 'read'. */
const COMMAND_TABLE: readonly CommandEntry[] = [
  // the tutor's phrases come before 'read', which takes 'open' and any words after it; 'tudor' is what a recogniser makes of 'tutor'
  { name: 'close-tutor', phrases: ['close the tutor', 'close tutor', 'leave the tutor', 'close the tudor', 'done', 'i am done'], help: { rank: 10, example: 'done', does: 'puts the tutor away' } },
  { name: 'tutor', phrases: ['tutor', 'tudor', 'the tutor', 'open the tutor', 'open tutor', 'open the tudor', 'talk to the tutor', 'talk to tutor'], help: { rank: 9, example: 'tutor', does: 'opens the tutor and listens' } },
  { name: 'ask', phrases: ['ask the tutor', 'ask'], rest: true, help: { rank: 8, example: 'ask who was Nicodemus', does: 'puts your question to the tutor and reads the answer' } },
  { name: 'help', phrases: ['help', 'help me', 'what can i say', 'what can i say to you', 'what can you do', 'what do i say'], help: { rank: 11, example: 'help', does: 'tells you what you can say' } },
  { name: 'pause', phrases: ['pause'], help: { rank: 2, example: 'pause', does: 'pauses the reading' } },
  { name: 'play', phrases: ['play', 'resume', 'continue', 'go on'], help: { rank: 1, example: 'play', does: 'goes on with what is paused, or reads this chapter' } },
  { name: 'stop', phrases: ['stop', 'stop reading', 'stop playing'], help: { rank: 3, example: 'stop', does: 'ends the reading' } },
  { name: 'back', phrases: ['back', 'go back', 'rewind'], help: { rank: 3.1, example: 'back', does: 'goes back a paragraph of a sermon, or 30 seconds of a video' } },
  { name: 'forward', phrases: ['forward', 'go forward', 'skip', 'fast forward'], help: { rank: 3.2, example: 'forward', does: 'goes forward a paragraph of a sermon, or 30 seconds of a video' } },
  { name: 'restart', phrases: ['restart', 'start over', 'start again', 'from the beginning'], help: { rank: 3.3, example: 'restart', does: 'starts the sermon over' } },
  { name: 'next-chapter', phrases: ['next chapter', 'go to next chapter', 'go to the next chapter'], help: { rank: 5, example: 'next chapter', does: 'reads the next chapter' } },
  { name: 'previous-chapter', phrases: ['previous chapter', 'go to previous chapter', 'go to the previous chapter', 'go back a chapter', 'back a chapter'], help: { rank: 6, example: 'previous chapter', does: 'reads the chapter before' } },
  { name: 'back-verse', phrases: ['back a verse', 'back one verse', 'go back a verse', 'go back one verse', 'previous verse', 'last verse again'], help: { rank: 7, example: 'back a verse', does: 'reads the last verse again' } },
  { name: 'read', phrases: ['read', 'red', 'reed', 'open', 'go to'], rest: true, help: { rank: 4, example: 'read John 3', does: 'opens a chapter and reads it' } },
];

/** The router's rules, from the table. */
export const SPOKEN_COMMANDS = defineSpoken(COMMAND_TABLE.map(({ name, phrases, rest }) => ({ name, phrases, ...(rest === undefined ? {} : { rest }) })));

/** One line of the help: the command's name in the router, the words to say for it and what it does. */
export interface HelpLine {
  name: string;
  example: string;
  does: string;
}

/** What he can say, one line a command of the router's table, in the order the help gives them. Shown on the sheet the mic mark opens and read aloud by 'help'. */
export const HELP_LINES: readonly HelpLine[] = [...COMMAND_TABLE].sort((a, b) => a.help.rank - b.help.rank).map(({ name, help }) => ({ name, example: help.example, does: help.does }));

/** The title of the sheet the mic mark opens (PROVISIONAL, the Governor to confirm). */
export const HELP_TITLE = 'What you can say';

/** What 'help' says: each command's example, as a list (PROVISIONAL wording, the Governor to confirm). */
export const HELP_SPOKEN = `You can say: ${HELP_LINES.slice(0, -1)
  .map((line) => line.example)
  .join(', ')}, or ${HELP_LINES[HELP_LINES.length - 1].example}.`;

/** The words said of a place: 'John 3', 'John 3, verse 16'. */
const nameOfPlace = (book: string, chapter: number, verse: number | undefined): string => `${titleOf(book, chapter)}${verse === undefined ? '' : `, verse ${verse}`}`;

/** 'read John 3': says the place's name, then the Reader opens there and reads from its verse (the sound that was there is ended first, so nothing goes on at the close). */
async function readPlaceOf(words: string, say: (text: string) => Promise<void>): Promise<void> {
  if (words === '') return say(NOT_UNDERSTOOD);
  const place = placeOfWords(words);
  if (place.kind === 'bad') return say(place.message);
  if (place.kind === 'none') return say(`I could not find ${words}`);
  stopSound();
  await say(nameOfPlace(place.book, place.chapter, place.verse));
  readPassage(place.book, place.chapter, place.verse ?? 1);
}

/** 'read John 3 in Audible' (mw-rl10piw.11): a place as a chapter, opened in his audio Bible in Audible (src/handsFree/audible.ts). */
async function readInAudible(words: string, place: SpokenPlace, say: (text: string) => Promise<void>): Promise<void> {
  if (place.kind === 'bad') return say(place.message);
  if (place.kind === 'none') return say(`I could not find ${words}`);
  return listenInAudible(place.book, place.chapter, say);
}

/** 'next chapter' and 'previous chapter': the chapter on screen is crossed from and read from its first verse. */
async function readNeighbour(by: 1 | -1, say: (text: string) => Promise<void>): Promise<void> {
  const here = readerOnScreen();
  if (!here) return say(OPEN_A_CHAPTER);
  const to = by > 0 ? neighbours(here.book, here.chapter).next : neighbours(here.book, here.chapter).previous;
  if (!to) return say(by > 0 ? NO_NEXT_CHAPTER : NO_PREVIOUS_CHAPTER);
  stopSound();
  readPassage(to.book, to.chapter, 1, () => crossChapter(here.book, here.chapter, by));
}

/** What the words of a command come to: more to listen for (a follow-up, in the tutor's talk) or nothing. */
export type Done = CommandDone | void;

/** Carries out the words of one command; `say` speaks a sentence and resolves when it has been said. Resolves when all is done and said; `followUp` in the result keeps the microphone open for words with
 * no wake word (the tutor's answer was spoken, or the tutor is open). `info.followUp` says these words came in such a window: those that are not a command go to the tutor. */
export async function runCommand(heard: string, say: (text: string) => Promise<void>, info: { followUp: boolean } = { followUp: false }): Promise<Done> {
  // a question put to the tutor keeps every word he said; any other command is read without its filler ('please read Proverbs 2 to me')
  const asked = route(heard, SPOKEN_COMMANDS);
  const words = asked?.name === 'ask' ? heard : withoutFiller(heard);
  const command = asked?.name === 'ask' ? asked : route(words, SPOKEN_COMMANDS);
  if (command?.name === 'ask') return askTutor(questionAfterAsk(words), say);
  if (command?.name === 'tutor') return openTutor(say);
  if (command?.name === 'close-tutor') return closeTutor(say);
  // 'read John 3 in Audible' (and 'listen to', 'play', 'open', 'go to'): his audio Bible in Audible, not the voice inside Lampas
  const audible = audibleOf(words);
  if (audible) {
    leaveTutor();
    return readInAudible(audible.said, audible.place, say);
  }
  if (!command && info.followUp) return askTutor(heard.trim(), say, false);
  // any other command leaves the tutor (the Talk sheet Hands-free opened is put away) and does what it says
  leaveTutor();
  if (command?.name === 'help') return say(HELP_SPOKEN);
  // a sermon sheet that is open (the reader, or the player over it) is what these words are for; with none open they are the Bible reading's
  if (command && SERMON_ACTIONS.has(command.name)) {
    const sermon = sermonControls();
    if (sermon) return driveSermon(sermon, command.name as SermonAction) ? undefined : say(NO_SERMON_CONTROL);
  }
  if (command?.name === 'back' || command?.name === 'forward' || command?.name === 'restart') return say(NO_SERMON_OPEN);
  if (command?.name === 'pause') return keepPaused();
  if (command?.name === 'play') {
    if (goOnNow()) return;
    if (readHere()) return takeSound();
    return say(OPEN_A_CHAPTER);
  }
  if (command?.name === 'stop') return stopSound();
  if (command?.name === 'read') return readPlaceOf(command.rest, say);
  if (command?.name === 'next-chapter') return readNeighbour(1, say);
  if (command?.name === 'previous-chapter') return readNeighbour(-1, say);
  if (command?.name === 'back-verse') return backOneVerse() ? undefined : say(NOTHING_READ);
  return say(notUnderstood(heard));
}
