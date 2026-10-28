// src/lessons/VariantLessons.tsx — the five lessons on variant readings (mw-9ji6ek0.18): #/lessons/variants lists them and #/lessons/variants/<n> is page n, drawn with Markdown.tsx, with Back and
// 'Next: <title>' at its foot. Both addresses are kept (src/nav/lastRoute.ts). The pages are Markdown in src/lessons/variants/, imported when the screen opens, so they are one chunk of their own that
// the worker precaches: a page reads offline. With a licence a page has Ask the tutor, which opens the round control's sheet on the lesson (src/tutor/variantLessonTalk.ts).
import { useEffect, useState } from 'react';
import { useAiAllowed } from '../gate/licenceContext';
import { Markdown } from '../markdown/Markdown';
import { backToVariantLessons, leaveVariantLessons, openVariantLesson, showVariantLesson, useAddress, variantLessonOf } from '../nav/route';
import { useScrollMemory } from '../nav/scrollMemory';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { askTheTutor } from '../tutor/askNow';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { variantLessonListScreen, variantLessonScreen } from '../tutor/variantLessonTalk';
import type { VariantLesson } from './variants';

const NAME = SCREEN_NAMES.lessons;

const FOOT_BUTTON = 'min-h-12 flex-1 rounded-xl border border-line px-3 py-2 text-base font-medium text-accent active:bg-line';

/** The lessons, once their chunk has come in: null until then, and 'failed' if it could not. */
function useLessons(): readonly VariantLesson[] | 'failed' | null {
  const [lessons, setLessons] = useState<readonly VariantLesson[] | 'failed' | null>(null);
  useEffect(() => {
    let live = true;
    import('./variants')
      .then((m) => live && setLessons(m.VARIANT_LESSONS))
      .catch(() => live && setLessons('failed'));
    return () => {
      live = false;
    };
  }, []);
  return lessons;
}

/** A page's Markdown without its first heading, which the screen's header carries. */
const withoutTitle = (markdown: string): string => markdown.replace(/^# .*\n+/, '');

function Ask() {
  const ai = useAiAllowed();
  if (!ai) return null;
  return (
    <button type="button" onClick={() => askTheTutor()} className="mt-6 min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg">
      Ask the tutor
    </button>
  );
}

function List({ lessons }: { lessons: readonly VariantLesson[] }) {
  return (
    <ul className="list-none space-y-2 py-4">
      {lessons.map((l) => (
        <li key={l.id}>
          <button
            type="button"
            onClick={() => openVariantLesson(l.order)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-2 text-left"
          >
            <span className="block min-w-0 text-base font-medium">
              {l.order}. {l.title}
            </span>
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Page({ lesson, lessons }: { lesson: VariantLesson; lessons: readonly VariantLesson[] }) {
  const next = lessons.find((l) => l.order === lesson.order + 1);
  return (
    <article className="pb-4">
      <Markdown text={withoutTitle(lesson.markdown)} trusted />
      <Ask />
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => showVariantLesson(lesson.order > 1 ? lesson.order - 1 : undefined)} className={FOOT_BUTTON}>
          Back
        </button>
        {next ? (
          <button type="button" onClick={() => showVariantLesson(next.order)} className={FOOT_BUTTON}>
            Next: {next.title}
          </button>
        ) : (
          <button type="button" onClick={() => showVariantLesson()} className={FOOT_BUTTON}>
            All the lessons
          </button>
        )}
      </div>
    </article>
  );
}

export function VariantLessons() {
  const lessons = useLessons();
  const n = variantLessonOf(useAddress());
  const loaded = Array.isArray(lessons) ? (lessons as readonly VariantLesson[]) : null;
  const lesson = n !== undefined ? loaded?.find((l) => l.order === n) : undefined;
  useReportScreen(lesson && loaded ? variantLessonScreen(lesson, loaded.length) : variantLessonListScreen(loaded ?? []));
  const scrollRef = useScrollMemory('lessons');
  return (
    <>
      <ScreenHeader
        title={lesson ? lesson.title : NAME}
        subtitle={lesson && loaded ? `Lesson ${lesson.order} of ${loaded.length}` : undefined}
        back={lesson ? <HeaderButton onClick={backToVariantLessons}>‹ Lessons</HeaderButton> : <HeaderButton onClick={leaveVariantLessons}>‹ Back</HeaderButton>}
      />
      <main key={lesson?.order ?? 0} ref={scrollRef} className="screen min-h-0 flex-1 px-4 pb-[var(--lp-end-inset)]">
        {lessons === 'failed' ? (
          <p role="alert" className="pt-4 text-base">
            The lessons could not be loaded. Close this page and open it again.
          </p>
        ) : loaded ? (
          lesson ? <Page lesson={lesson} lessons={loaded} /> : <List lessons={loaded} />
        ) : null}
      </main>
    </>
  );
}
