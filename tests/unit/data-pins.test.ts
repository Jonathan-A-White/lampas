// The pinned sources of the data build live at a place that does not move (mw-5r3p30.1004): STEPBible's files at a commit, not at master, and the MSB table
// (which has no versioned URL) is checked against a sha256 and, when upstream has changed only what we know it changed, put back to the pinned bytes.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TBESG_URL } from '../../scripts/data-build';
import { TAGNT_FILES, tagntUrl } from '../../scripts/data/tagnt';
import { MSB_EDITS, MSB_SHA256, TBESG_SHA256, loadPinned } from '../../scripts/data/pins';

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

describe('the STEPBible files are fetched at a commit, never at master', () => {
  const urls = [TBESG_URL, ...TAGNT_FILES.map((f) => tagntUrl(f.remote))];
  it.each(urls)('%s', (url) => {
    expect(url).toMatch(/\/STEPBible-Data\/[0-9a-f]{40}\//);
    expect(url).not.toMatch(/\/master\//);
  });
  it('pins TBESG and the MSB table by sha256', () => {
    expect(TBESG_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(MSB_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('loadPinned', () => {
  const pinned = 'a\nb Jesus\' c\nd\n';
  const upstream = 'a\nb Jesus’ c\nd\n';
  const edits = [{ line: 2, from: '’', to: "'", why: 'a typographic apostrophe' }];
  const run = async (served: string, wanted: string, onDisk?: string) => {
    const dir = mkdtempSync(join(tmpdir(), 'lampas-pin-'));
    try {
      const path = join(dir, 'raw', 'msb.tsv');
      if (onDisk !== undefined) {
        mkdirSync(join(dir, 'raw'));
        writeFileSync(path, onDisk);
      }
      const downloads: string[] = [];
      const log: string[] = [];
      const text = await loadPinned({
        path,
        url: 'https://example.test/msb.tsv',
        sha256: wanted,
        edits,
        download: async (url, dest) => {
          downloads.push(url);
          mkdirSync(join(dest, '..'), { recursive: true });
          writeFileSync(dest, served);
        },
        log: (line) => log.push(line),
      });
      return { text, downloads, log, onDisk: readFileSync(path, 'utf8') };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('keeps a download that has the pinned bytes', async () => {
    const got = await run(pinned, sha(pinned));
    expect(got.text).toBe(pinned);
    expect(got.downloads).toHaveLength(1);
  });

  it('puts upstream\'s one known change back, writes the pinned bytes and says so', async () => {
    const got = await run(upstream, sha(pinned));
    expect(got.text).toBe(pinned);
    expect(got.onDisk).toBe(pinned);
    expect(got.log.join('\n')).toMatch(/line 2/);
  });

  it('does not fetch a file that is there with the pinned bytes', async () => {
    const got = await run(upstream, sha(pinned), pinned);
    expect(got.downloads).toEqual([]);
  });

  it('stops, naming the file, when the bytes are neither the pinned ones nor the pinned ones with the known change', async () => {
    await expect(run('other\n', sha(pinned))).rejects.toThrow(/sha256 is [0-9a-f]{64}, not the pinned [0-9a-f]{64}; delete .*msb\.tsv/);
  });

  it('stops when a known change no longer applies to its line', async () => {
    await expect(run('a\nb c\nd\n', sha(pinned))).rejects.toThrow(/sha256/);
  });
});

describe('the MSB edits', () => {
  it('each names a line and a character that is there once', () => {
    for (const e of MSB_EDITS) {
      expect(e.line).toBeGreaterThan(0);
      expect(e.from).not.toBe(e.to);
    }
  });
});
