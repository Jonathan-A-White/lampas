// src/TeachSheet.tsx — the sheet 'New words: N' opens (mw-bsf54t.4): the first new word of the chapter with heavy scaffolding, so he can
// try to work it out himself with the tools around him. The Greek lemma large with a speaker, how it sounds, what it means, the form
// of its first occurrence in plain words, its picture if it has one, and the easiest verse of the chapter (src/data/frontier.ts
// easiestVerse) woven (src/data/weave.ts) with the new word in Greek as well and its English in small grey beneath it. At the foot Got it,
// I know this, Not now (skipped for today only) and Ask the tutor. Each answer moves on to the next new word; the sheet closes when none is left.
import { useEffect, useMemo, useState } from 'react';
import { type Chapter, wordParse } from './data/chapter';
import { type Candidate, easiestVerse } from './data/frontier';
import { teachWord, type WordOutcome } from './data/repositories';
import { skipForToday } from './data/skipped';
import { weaveForTeaching } from './data/weave';
import { publish, useLatest } from './events/bus';
import { pronunciationOf } from './speech/pronunciation';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { WordPicture } from './WordPicture';

const BUTTON = 'min-h-12 min-w-0 rounded-xl border px-3 text-base font-medium disabled:opacity-50';

/** What a tap on Ask the tutor asks for: the word, its meaning and the verse it is met in. */
export interface NewWordAsk {
  lemma: string;
  gloss: string;
  verse: number;
}

export function TeachSheet({ chapter, title, candidates, solid, onClose, onShowVerse, onAsk }: {
  chapter: Chapter;
  /** 'Romans 8' */
  title: string;
  /** the new words on offer, the first is shown; the sheet closes itself when there are none */
  candidates: readonly Candidate[];
  solid: ReadonlySet<string>;
  onClose: () => void;
  /** the verse number was tapped: the Reader shows that verse (the sheet closes itself first) */
  onShowVerse: (verse: number) => void;
  /** Ask the tutor (the sheet closes itself first) */
  onAsk: (ask: NewWordAsk) => void;
}) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const pronunciation = useLatest('pronunciation-changed')?.pronunciation;
  const current = candidates[0];
  // The lemma whose answer is being written: its buttons wait until the next word replaces it.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!current) onClose();
  }, [current, onClose]);

  const place = useMemo(() => {
    if (!current) return null;
    const n = easiestVerse(current, chapter, solid) ?? current.verses[0];
    const verse = chapter.verses.find((v) => v.n === n);
    if (!verse) return null;
    const woven = weaveForTeaching(verse, solid, current.lemma);
    const forms = verse.g.filter((w) => w.l.normalize('NFC') === current.lemma).map((w) => w.t);
    const first = chapter.verses.flatMap((v) => v.g).find((w) => w.l.normalize('NFC') === current.lemma);
    return { verse, woven, forms, first };
  }, [current, chapter, solid]);

  if (!current || !place) return null;
  const { verse, woven, forms, first } = place;
  const reference = `${title}:${verse.n}`;
  const parse = first ? wordParse(chapter, first) : '';
  const marked = woven.some((w) => w?.learning);
  const busy = pending === current.lemma;

  const teach = (outcome: WordOutcome): void => {
    if (busy) return;
    setPending(current.lemma);
    teachWord(current.lemma, current.gloss, outcome).catch((error: unknown) => {
      console.error('could not keep the new word', error);
      setPending(null);
    });
  };
  const notNow = (): void => {
    skipForToday(current.lemma);
    publish({ kind: 'frontier-taught', lemma: current.lemma, outcome: 'not-now' });
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div data-testid="teach-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New word"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="teach-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" ref={focusOnMount} onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p data-testid="teach-lemma" lang="grc" className="min-w-0 break-words font-greek text-5xl font-bold">
                  {current.lemma}
                </p>
                <SpeakButton text={current.lemma} id={`teach:${current.lemma}`} label="Hear it" kind="speaker" className="min-h-12 min-w-12 shrink-0" />
              </div>
              <p data-testid="teach-translit" className="mt-1 break-words text-xl text-muted">
                {pronunciationOf(pronunciation).respell(current.lemma)}
              </p>
              <p data-testid="teach-gloss" className="mt-1 break-words text-2xl">
                {current.gloss}
              </p>
            </div>
            <WordPicture lemma={current.lemma} size={96} testId="teach-picture" />
          </div>
          {parse ? (
            <p data-testid="teach-form" className="mt-3 text-base">
              <span className="text-sm text-muted">As it first stands in the chapter: </span>
              {parse}
            </p>
          ) : null}
          <div className="mt-4 border-t border-line pt-3">
            <button
              type="button"
              data-testid="teach-verse-link"
              onClick={() => {
                onClose();
                onShowVerse(verse.n);
              }}
              className="min-h-11 rounded-lg px-1 text-base font-medium text-accent underline underline-offset-4 active:bg-line"
            >
              {reference}
            </button>
            <p data-testid="teach-verse" data-verse-n={verse.n} className="font-sans text-[length:var(--lp-english-size)] leading-(--lp-leading)">
              {verse.e.map((chunk, i) => {
                const weft = woven[i];
                if (!weft) return <span key={i} data-plain>{chunk.t}{' '}</span>;
                const greek = weft.words.map((w) => w.t).join(' ');
                return weft.learning ? (
                  <span key={i} data-new lang="grc" className="mr-1 inline-flex flex-col items-center align-top font-greek text-[length:var(--lp-greek-size)] leading-tight text-accent">
                    <span data-greek className="font-bold">{greek}</span>
                    <span data-hint lang="en" className="whitespace-nowrap font-sans text-sm font-normal text-muted">
                      {chunk.t}
                    </span>
                  </span>
                ) : (
                  <span key={i} lang="grc" className="mr-1 font-greek text-[length:var(--lp-greek-size)] text-accent">
                    {greek}
                  </span>
                );
              })}
            </p>
            {marked ? null : (
              <p className="mt-2 text-base text-muted">
                In this verse: <span lang="grc" className="font-greek text-xl">{forms.join(', ')}</span>
              </p>
            )}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+var(--lp-bar-inset))]">
          <button type="button" disabled={busy} onClick={() => teach('got-it')} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            Got it
          </button>
          <button type="button" disabled={busy} onClick={() => teach('known')} className={`${BUTTON} border-line text-accent active:bg-line`}>
            I know this
          </button>
          <button type="button" disabled={busy} onClick={notNow} className={`${BUTTON} border-line text-accent active:bg-line`}>
            Not now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onClose();
              onAsk({ lemma: current.lemma, gloss: current.gloss, verse: verse.n });
            }}
            className={`${BUTTON} border-line text-accent active:bg-line`}
          >
            Ask the tutor
          </button>
        </div>
      </div>
    </div>
  );
}
