#!/usr/bin/env python3
"""Cuts the 66 books into 5 shares of near-equal recording length, for 5 boxes (mw-ar5k42b.4; docs/audio-run.md 'The shares'). Writes shares.json beside this file.

The lengths are READ, not downloaded: the publisher's own listing of the chapter files (https://openbible.com/audio/msb/, ONE GET with the maker's User-Agent) gives
each file's size to 0.1 MB, and every file is a constant 192 kb/s MP3 (24,000 bytes a second; ffprobe of the 50 Genesis files kept on the Laptop: size / 24,000 is
within 1% of the duration, 0.9994 of it summed). So the seconds of a chapter are its size / 24,000, good to about 4 s a chapter, and the errors of 1,189 chapters
cancel. Nothing is fetched but the listing. Pass --listing <file> to read a saved copy instead of asking the publisher.

    python3 scripts/audio-timings/shares.py [--listing <html>] [--shares 5]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
LISTING_URL = 'https://openbible.com/audio/msb/'
USER_AGENT = 'lampas-audio-timings/1'
BYTES_A_SECOND = 24000  # 192 kb/s, constant
UNITS = {'K': 1024, 'M': 1024 ** 2, 'G': 1024 ** 3}
ROW = re.compile(r'<a href="MSB_(\d\d)_(\w+?)_(\d+)_D\.mp3">[^<]*</a>\s*</td><td align="right">[^<]*</td><td align="right">\s*([\d.]+)([KMG])</td>')


def book_codes() -> dict[int, str]:
    """The publisher's book number -> Lampas's book code, from the maker's own table (read as text: the maker needs no model to be read)."""
    source = (HERE / 'align.py').read_text(encoding='utf8')
    table = source[source.index('BOOKS = {'):]
    table = table[:table.index('}\n')]
    return {int(nn): code for code, nn in re.findall(r"'(\w+)': \((\d+), '\w+'\)", table)}


def read_listing(path: Path | None) -> str:
    if path:
        return path.read_text(encoding='latin1')
    request = urllib.request.Request(LISTING_URL, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode('latin1')


def split(hours: dict[str, float], shares: int) -> list[list[str]]:
    """Longest first into the lightest share, then single moves and swaps of two books while the heaviest share gets lighter."""
    out: list[list[str]] = [[] for _ in range(shares)]
    load = [0.0] * shares
    for code in sorted(hours, key=lambda c: -hours[c]):
        k = load.index(min(load))
        out[k].append(code)
        load[k] += hours[code]
    improved = True
    while improved:
        improved = False
        heavy = load.index(max(load))
        for other in range(shares):
            if other == heavy:
                continue
            gap = load[heavy] - load[other]
            for a in out[heavy]:
                if 0 < hours[a] < gap and (gap - 2 * hours[a]) > -gap:  # moving a makes the pair closer
                    out[heavy].remove(a); out[other].append(a)
                    load[heavy] -= hours[a]; load[other] += hours[a]
                    improved = True
                    break
                for b in out[other]:
                    if 0 < hours[a] - hours[b] < gap:
                        out[heavy].remove(a); out[other].remove(b); out[heavy].append(b); out[other].append(a)
                        load[heavy] += hours[b] - hours[a]; load[other] += hours[a] - hours[b]
                        improved = True
                        break
                if improved:
                    break
            if improved:
                break
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description='Writes shares.json: the 66 books in near-equal shares of recording length.')
    parser.add_argument('--listing', type=Path, help='a saved copy of the publisher\'s listing (default: one GET of it)')
    parser.add_argument('--shares', type=int, default=5)
    args = parser.parse_args()
    codes = book_codes()
    seconds: dict[str, dict[int, float]] = {}
    for nn, _abc, chapter, size, unit in ROW.findall(read_listing(args.listing)):
        seconds.setdefault(codes[int(nn)], {})[int(chapter)] = float(size) * UNITS[unit] / BYTES_A_SECOND
    if len(seconds) != 66 or sum(len(c) for c in seconds.values()) != 1189:
        print(f'the listing holds {len(seconds)} books and {sum(len(c) for c in seconds.values())} chapters, not 66 and 1,189', file=sys.stderr)
        return 2
    order = list(codes.values())  # the canon's order
    hours = {code: sum(seconds[code].values()) / 3600 for code in order}
    groups = split(hours, args.shares)
    groups = sorted(([c for c in order if c in g] for g in groups), key=lambda g: order.index(g[0]))
    mean = sum(hours.values()) / args.shares
    result = {
        'v': 1,
        'read': ('The publisher\'s listing of the chapter files (https://openbible.com/audio/msb/, one GET, User-Agent lampas-audio-timings/1): each file\'s size to 0.1 MB; '
                 'every file is a 192 kb/s constant-rate MP3, 24,000 bytes a second, so seconds = size / 24,000 (the 50 Genesis files on the Laptop: summed, 0.9994 of the measured duration). No recording was downloaded for this.'),
        'bytesASecond': BYTES_A_SECOND,
        'totalHours': round(sum(hours.values()), 2),
        'meanHours': round(mean, 2),
        'shares': [{'share': k + 1, 'hours': round(sum(hours[c] for c in g), 2), 'chapters': sum(len(seconds[c]) for c in g), 'books': g} for k, g in enumerate(groups)],
        'books': {code: {'chapters': len(seconds[code]), 'hours': round(hours[code], 2)} for code in order},
    }
    (HERE / 'shares.json').write_text(json.dumps(result, indent=1, ensure_ascii=False) + '\n', encoding='utf8')
    for s in result['shares']:
        print(f"share {s['share']}: {s['hours']:6.2f} h ({100 * (s['hours'] / mean - 1):+.1f}% of the mean), {s['chapters']} chapters, {' '.join(s['books'])}")
    print(f"total {result['totalHours']} h, mean {result['meanHours']} h")
    return 0


if __name__ == '__main__':
    sys.exit(main())
