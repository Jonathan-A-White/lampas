// src/ImportScreen.tsx — paste a list, see how it reads, add it. Every added word starts as learning.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { addImportedWords, listWords } from './data/repositories';
import { parseImport } from './data/importWords';
import { navigate } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

export function ImportScreen() {
  const [text, setText] = useState('');
  const known = useLiveQuery(listWords, []);
  const lines = useMemo(() => parseImport(text), [text]);

  const knownLemmas = new Set((known ?? []).map((w) => w.lemma));
  const seen = new Set<string>();
  const rows = lines.map((l) => {
    if (!l.ok) return { line: l, fresh: false };
    const fresh = !knownLemmas.has(l.headword) && !seen.has(l.headword);
    seen.add(l.headword);
    return { line: l, fresh };
  });
  const toAdd = rows.flatMap((r) => (r.line.ok && r.fresh ? [r.line] : []));
  const already = rows.filter((r) => r.line.ok && !r.fresh).length;

  const summary =
    lines.length === 0
      ? 'Paste a list to see how it reads.'
      : `${toAdd.length} ${toAdd.length === 1 ? 'word' : 'words'} to add${already ? `, ${already} already in your list` : ''}`;

  const add = async () => {
    await addImportedWords(toAdd);
    navigate('words', { replace: true });
  };

  return (
    <>
      <ScreenHeader title="Import" back={<HeaderButton onClick={() => navigate('words')}>‹ Words</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-3 pt-4">
        <label htmlFor="import-text" className="block text-base">
          One word per line, like <span lang="grc" className="font-greek text-lg">ἀνάστασις — resurrection</span>
        </label>
        <textarea
          id="import-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className="mt-2 block w-full min-w-0 resize-none rounded-xl border border-line bg-surface p-3 font-greek"
        />
        {rows.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {rows.map(({ line, fresh }, i) => (
              <li key={i} className="min-w-0 px-3 py-2">
                {line.ok ? (
                  <>
                    <span lang="grc" className="block break-words font-greek text-2xl">{line.headword}</span>
                    <span className="block break-words text-sm text-muted">
                      {line.gloss || 'no gloss'}
                      {fresh ? '' : ' · already in your list'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block break-words">{line.line}</span>
                    <span className="block text-sm text-accent">{line.reason}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </main>
      <footer className="shrink-0 border-t border-line px-3 pt-3 pb-[calc(0.75rem+var(--lp-bar-inset))]">
        <p data-testid="import-summary" className="mb-2 text-center text-sm text-muted">
          {summary}
        </p>
        <button
          type="button"
          disabled={toAdd.length === 0}
          onClick={add}
          className="min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg disabled:opacity-40"
        >
          {toAdd.length === 0 ? 'Add' : `Add ${toAdd.length} ${toAdd.length === 1 ? 'word' : 'words'}`}
        </button>
      </footer>
    </>
  );
}
