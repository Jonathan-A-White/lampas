#!/usr/bin/env bash
# One command times and judges a book of David's recording (mw-ar5k42b.4; docs/audio-run.md).
#
#   scripts/audio-timings/run-book.sh <book> [--out <dir>] [--chapters 3,117] [--fresh] [--no-nice] [--summary-only]
#
# It fetches the book's recordings (the maker's own politeness: one request a file, 2 s between files, its User-Agent, a file already kept never again), times and
# cuts the book (align.py), has the judge hear every verse (judge.py), writes what the judge heard at each listed edge (align.py --listen), and writes into <dir>
# (default <cache>/staged/, OUTSIDE the worktree so a run leaves the tree clean; the same layout as the repo): audio/msb-david/<book>.json (the timings), quiet/, listen/,
# judged/ and summary/<book>.txt. It prints one summary line of a FIXED form (docs/audio-run.md 'The summary line'). A run stopped part way is run again with the same command and the same --out: a chapter already timed is not timed again.
#
# It NEVER writes under public/. The maker and the judge write where their own path says (public/data/audio/msb-david/ for the timings), so they are run from a
# WORK COPY of themselves in <dir>/.work/<book>/, a tree of the same shape (the book texts are links to the repo's). Nothing of the maker or the judge is changed.
# A book in <dir> is not played by the app: promoting it is copying its files into the repo (docs/audio-run.md 'Promoting a book'); index.json is made from them, never edited.
#
# Exit 0 only when the judge ran over every chapter asked for (every chapter of the book, or --chapters). Flags the judge raised outside the listen list are
# FINDINGS and are counted in the summary line; they do not make the exit non-zero. Exit 2: a stop (a bad argument, no set-up, a fetch refused, a model failed);
# exit 3: some chapter was left out by the maker's checks or not judged.
#
#   --fresh     the judge hears and judges everything again, reading nothing an earlier run kept (for timing the judge)
#   --no-nice   do not run the maker and the judge under nice -n 10 (a box that does nothing else)
#   --summary-only   run nothing: read the book's files already in <dir> and print the summary line (for a test, or to read a finished run again)
# The cache (venvs, the recordings, the models) is LAMPAS_AUDIO_CACHE, default ~/.cache/lampas-audio-timings; box-setup.sh makes it.
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
cache="${LAMPAS_AUDIO_CACHE:-$HOME/.cache/lampas-audio-timings}"
out=""   # default: <cache>/staged, outside the worktree
summary_only=""
book=""
chapters=""
fresh=""
nice_cmd=(nice -n 10)

stop() { echo "run-book: $*" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --out) [ $# -ge 2 ] || stop "--out needs a directory"; out="$2"; shift 2 ;;
    --chapters) [ $# -ge 2 ] || stop "--chapters needs a list like 3,117"; chapters="$2"; shift 2 ;;
    --fresh) fresh="--fresh"; shift ;;
    --no-nice) nice_cmd=(); shift ;;
    --summary-only) summary_only=1; shift ;;
    -h|--help) sed -n '2,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) stop "unknown switch $1" ;;
    *) [ -z "$book" ] || stop "one book at a time (got $book and $1)"; book="$1"; shift ;;
  esac
done
[ -n "$book" ] || stop "usage: run-book.sh <book> [--out <dir>] [--chapters 3,117] [--fresh] [--no-nice] [--summary-only]   (book: jhn, psa, jud ...)"
[[ "$book" =~ ^[0-9a-z]{3}$ ]] || stop "a book is Lampas's three-character code (jhn, 1jn, psa): got '$book'"
[ -z "$chapters" ] || [[ "$chapters" =~ ^[0-9]+(,[0-9]+)*$ ]] || stop "--chapters is numbers with commas: got '$chapters'"

judge_py="$cache/judge-venv/bin/python"
maker_py="$cache/venv/bin/python"
[ -x "$maker_py" ] || maker_py="$judge_py"   # box-setup.sh makes the judge's venv alone: it holds the maker's pinned packages too
[ -x "$judge_py" ] || stop "no virtualenv in $cache: run scripts/audio-timings/box-setup.sh first"
[ -n "$summary_only" ] || command -v ffmpeg >/dev/null 2>&1 || [ -x "$cache/bin/ffmpeg" ] || stop "no ffmpeg: run scripts/audio-timings/box-setup.sh first"
[ -x "$cache/bin/ffmpeg" ] && export PATH="$cache/bin:$PATH"

[ -d "$repo/public/data/$book" ] || stop "no text for '$book' in public/data"
[ -n "$out" ] || out="$cache/staged"
out="$(realpath -m "$out")"
case "$out" in "$repo"/public|"$repo"/public/*) stop "the output may not be under public/" ;; esac
mkdir -p "$out" || stop "cannot make $out"
case "$cache" in "$out"|"$out"/*) stop "the cache may not be inside the output folder" ;; esac

# ---- the summary line: ONE line of a fixed form (docs/audio-run.md 'The summary line'), then one indented detail line ------------------------------------------------
#   SUMMARY book=<b> chapters=<timed>/<of> left_out=<n,n|none> not_judged=<n,n|none> verses=<n> flags=<n> flags_outside_list=<n> every_flag_on_list=<yes|no> listen_edges=<n> minutes=<m.m>
# chapters is the chapters timed of the chapters asked for (the book's, or --chapters); left_out names the chapters the maker left out (its own checks); not_judged those timed
# and not judged. Exit 0 only when none is left out or not judged. summarize <minutes> <timing>: reads the files already in <out>.
summarize() {
"$judge_py" -I - "$repo" "$out" "$book" "$chapters" "$1" "$2" <<'PY'
import json, sys
from pathlib import Path

repo, out, book, chapters, minutes, timing = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
EDGES = {'head-extra': 'head', 'head-clipped': 'head', 'tail-extra': 'tail', 'tail-clipped': 'tail', 'text-differs': 'text'}
asked = {int(c) for c in chapters.split(',')} if chapters else {int(p.stem) for p in (repo / 'public' / 'data' / book).glob('*.json')}
timings = json.loads((out / 'audio' / 'msb-david' / f'{book}.json').read_text(encoding='utf8'))
report = json.loads((out / 'judged' / f'msb-david-{book}.json').read_text(encoding='utf8'))
listen = json.loads((out / 'listen' / f'msb-david-{book}.json').read_text(encoding='utf8'))['verses']
timed = {int(c) for c in timings['chapters']} & asked
judged = {int(c) for c in report['chapters']} & asked
on_list = {(e['verse'], e['edge']) for e in listen}
flagged = {(f'{c}:{v["n"]}', EDGES[f['kind']]) for c, ch in report['chapters'].items() for v in ch['verses'] for f in v.get('flags', [])}
flags = sum(len(v.get('flags', [])) for ch in report['chapters'].values() for v in ch['verses'])
outside = sorted(flagged - on_list)
names = lambda chs: ','.join(str(c) for c in sorted(chs)) or 'none'
left_out, not_judged = asked - timed, timed - judged
line = (f'SUMMARY book={book} chapters={len(timed)}/{len(asked)} left_out={names(left_out)} not_judged={names(not_judged)} verses={report["summary"]["verses"]} '
        f'flags={flags} flags_outside_list={len(outside)} every_flag_on_list={"no" if outside else "yes"} listen_edges={len(listen)} minutes={float(minutes):.1f}')
detail = f'  ({timing}; outside the list: {", ".join(f"{v} {e}" for v, e in outside) or "none"})'
(out / 'summary').mkdir(exist_ok=True)
(out / 'summary' / f'{book}.txt').write_text(line + '\n' + detail + '\n', encoding='utf8')
print(line)
print(detail)
sys.exit(0 if not left_out and not not_judged else 3)
PY
}

if [ -n "$summary_only" ]; then
  summarize 0.0 "summary only, nothing run"
  exit $?
fi

# ---- the work copy: the maker and the judge find their repo from their own place, so they are copied into a tree of the same shape ------------------------------
work="$out/.work/$book"
tools="$work/scripts/audio-timings"
mkdir -p "$tools/quiet" "$tools/listen" "$tools/judged" "$work/public/data/audio/msb-david"
for f in align.py judge.py player-slop.json player-margin.json; do cp -p "$here/$f" "$tools/$f"; done
for entry in "$repo"/public/data/*; do
  [ "$(basename "$entry")" = audio ] || ln -sfn "$entry" "$work/public/data/$(basename "$entry")"
done
printf '*\n' > "$out/.work/.gitignore"

stamp() { date -u +%H:%M:%SZ; }
# bash's `times` prints the shell's and then its waited-for children's user and system time; run in the shell itself (not in a $( ), which would start from nothing)
timesfile="$work/.times"
cpu_now() { times > "$timesfile"; CPU_NOW="$(sed -n 2p "$timesfile" | awk '{ split($1,a,"m"); split($2,b,"m"); print a[1]*60+a[2]+b[1]*60+b[2] }')"; }
declare -A wall cpu
stage() {  # stage <name> <command...>: runs it, keeps the wall seconds and the cpu seconds
  local name="$1"; shift
  local t0=$SECONDS c0
  cpu_now; c0="$CPU_NOW"
  echo "run-book: $(stamp) $name: $*" >&2
  "$@"; local rc=$?
  cpu_now
  wall[$name]=$((SECONDS - t0)); cpu[$name]="$(awk -v a="$c0" -v b="$CPU_NOW" 'BEGIN { print b - a }')"
  return $rc
}

started=$SECONDS
echo "run-book: $(stamp) $book, out $out, cache $cache; $(uptime | sed 's/^ *//')" >&2

maker_args=(--book "$book" --scratch "$cache")
[ -z "$chapters" ] || maker_args+=(--chapters "$chapters")
stage maker "${nice_cmd[@]}" "$maker_py" -I "$tools/align.py" "${maker_args[@]}" || { echo "run-book: the maker stopped (exit $?): run the same command again to take it up" >&2; exit 2; }
[ -f "$work/public/data/audio/msb-david/$book.json" ] || { echo "run-book: the maker timed no chapter of $book" >&2; exit 3; }

stage judge "${nice_cmd[@]}" "$judge_py" -I "$tools/judge.py" --book "$book" --scratch "$cache" $fresh || { echo "run-book: the judge stopped (exit $?): run the same command again to take it up" >&2; exit 2; }
# the listen pass: exit 1 means a flag outside the listen list, which is a finding counted below; anything else non-zero is a stop
stage listen "${nice_cmd[@]}" "$maker_py" -I "$tools/align.py" --book "$book" --scratch "$cache" --listen
rc=$?
[ "$rc" -le 1 ] || { echo "run-book: the listen pass stopped (exit $rc)" >&2; exit 2; }

# ---- what the run made goes to <out>, in the repo's own layout --------------------------------------------------------------------------------------------------
mkdir -p "$out/audio/msb-david" "$out/quiet" "$out/listen" "$out/judged" "$out/summary"
cp -p "$work/public/data/audio/msb-david/$book.json" "$out/audio/msb-david/$book.json"
for kind in quiet listen judged; do cp -p "$tools/$kind/msb-david-$book.json" "$out/$kind/msb-david-$book.json"; done

minutes=$(awk -v s=$((SECONDS - started)) 'BEGIN { printf "%.1f", s / 60 }')
cores=$(awk -v mw="${wall[maker]}" -v jw="${wall[judge]}" -v mc="${cpu[maker]}" -v jc="${cpu[judge]}" 'BEGIN { w = mw + jw; printf "%.1f", (w > 0 ? (mc + jc) / w : 0) }')
summarize "$minutes" "maker ${wall[maker]} s, judge ${wall[judge]} s, listen ${wall[listen]} s; cores used ${cores}"
exit $?
