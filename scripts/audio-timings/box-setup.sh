#!/usr/bin/env bash
# Readies a fresh Ubuntu box to time and judge David's recording (mw-ar5k42b.4; docs/audio-run.md 'A fresh box'): run it once from a clone of the rig.
#
#   scripts/audio-timings/box-setup.sh [-h | --help]
#
# It takes no other argument: -h and --help print this text and exit 0, and anything else (an unknown flag, a stray word) prints it to stderr and exits 2. Both
# answer before the script does anything to the box (mw-ar5k42b.20).
#
# It makes ONE virtualenv (the judge's, which holds the maker's pinned packages too), installs the pinned requirements of the maker and the judge, fetches the
# three models and John 2's recording to the cache, and PROVES ITSELF: it times and judges John chapter 2 through run-book.sh and compares the result with what
# is shipped for it (the timings of the chapter, the aligner's letters, the judge's verdicts: all byte for byte). It prints how long it took.
# No sudo is asked for. Only the cache is written (LAMPAS_AUDIO_CACHE, default ~/.cache/lampas-audio-timings); a private path in the variable leaves the
# working cache alone. It needs: python3 and curl or wget (any Ubuntu cloud image has them), and ffmpeg (see below). The repo is not written to.
#
#   ffmpeg: the maker decodes the MP3 with the `ffmpeg` command. If it is not on the box: `sudo -n apt-get install -y ffmpeg` when the box allows a sudo with no
#   password; else a pinned static build (the `imageio-ffmpeg` wheel) in <cache>/bin, and the proof says whether the same bytes came out. If neither works it stops
#   and names ffmpeg: that is the one system package this tool may need.
set -eu

# The arguments come first, before anything is read, made or fetched: asking for help must never start the set-up (mw-ar5k42b.20).
usage() { sed -n '2,/^set -eu$/p' "${BASH_SOURCE[0]}" | sed '/^set -eu$/d; s/^# \{0,1\}//'; }
case "${1:-}" in
  "") ;;
  -h|--help) usage; exit 0 ;;
  *) echo "box-setup: unknown argument '$1' (it takes none besides -h and --help)" >&2; usage >&2; exit 2 ;;
esac

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
cache="${LAMPAS_AUDIO_CACHE:-$HOME/.cache/lampas-audio-timings}"
UV_VERSION=0.12.22   # the uv the pins were resolved with
PYTHON=3.12
PROOF_BOOK=jhn
PROOF_CHAPTER=2      # John's shortest chapter (193 s, 25 verses), and the one with a read-on (2:9 into 2:10)
started=$SECONDS

say() { echo "box-setup: $(date -u +%H:%M:%SZ) $*" >&2; }
stop() { echo "box-setup: STOP: $*" >&2; exit 2; }
[ -d "$repo/public/data/$PROOF_BOOK" ] || stop "$repo is not a clone of the rig (no public/data/$PROOF_BOOK)"
mkdir -p "$cache/bin" || stop "cannot make $cache"
export PATH="$cache/bin:$HOME/.local/bin:$PATH"

# ---- uv (no sudo; a pinned release, not a script piped to a shell) ----------------------------------------------------------------------------------------------
if ! command -v uv >/dev/null 2>&1; then
  case "$(uname -m)" in x86_64) arch=x86_64 ;; aarch64|arm64) arch=aarch64 ;; *) stop "no uv build for $(uname -m)" ;; esac
  url="https://github.com/astral-sh/uv/releases/download/$UV_VERSION/uv-$arch-unknown-linux-gnu.tar.gz"
  say "fetching uv $UV_VERSION: $url"
  tmp="$(mktemp -d)"
  if command -v curl >/dev/null 2>&1; then curl -fsSL "$url" -o "$tmp/uv.tar.gz"; else wget -q "$url" -O "$tmp/uv.tar.gz"; fi || stop "could not fetch uv"
  tar -xzf "$tmp/uv.tar.gz" -C "$tmp" && install -m 755 "$tmp"/uv-*/uv "$cache/bin/uv" && rm -rf "$tmp"
fi
say "uv: $(uv --version)"

# ---- ffmpeg ---------------------------------------------------------------------------------------------------------------------------------------------------------
need_static_ffmpeg=""
if [ -z "${LAMPAS_NO_SYSTEM_FFMPEG:-}" ] && command -v ffmpeg >/dev/null 2>&1; then
  say "ffmpeg: $(ffmpeg -version | head -1)"
else
  if [ -z "${LAMPAS_NO_SYSTEM_FFMPEG:-}" ] && command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    say "ffmpeg: installing the system package (sudo with no password)"
    sudo -n apt-get install -y ffmpeg >&2 || true
  fi
  if [ -z "${LAMPAS_NO_SYSTEM_FFMPEG:-}" ] && command -v ffmpeg >/dev/null 2>&1; then say "ffmpeg: $(ffmpeg -version | head -1)"; else need_static_ffmpeg=1; fi
fi

# ---- the virtualenv: the judge's, and the maker's pins on top (a subset: nothing changes) ---------------------------------------------------------------------------
venv="$cache/judge-venv"
if [ ! -x "$venv/bin/python" ]; then
  say "making $venv (Python $PYTHON; uv fetches it when the box has none)"
  uv venv --python "$PYTHON" "$venv" >&2 || stop "uv could not make a Python $PYTHON virtualenv"
fi
say "installing the judge's pinned requirements, then the maker's (torch and torchaudio are the CPU-only wheels: about 200 MB)"
uv pip install --python "$venv/bin/python" --index-strategy unsafe-best-match -r "$here/judge-requirements.txt" >&2 || stop "the judge's requirements did not install"
uv pip install --python "$venv/bin/python" --index-strategy unsafe-best-match -r "$here/requirements.txt" >&2 || stop "the maker's requirements did not install"

if [ -n "$need_static_ffmpeg" ]; then
  say "ffmpeg: not on this box and no password-less sudo: installing the pinned static build (imageio-ffmpeg 0.6.0) into $cache/bin"
  uv pip install --python "$venv/bin/python" "imageio-ffmpeg==0.6.0" >&2 || stop "ffmpeg is missing and could not be had: ask for the system package ffmpeg (sudo apt-get install ffmpeg)"
  "$venv/bin/python" -I -c "import imageio_ffmpeg, os, sys; os.symlink(imageio_ffmpeg.get_ffmpeg_exe(), sys.argv[1])" "$cache/bin/ffmpeg.new" && mv -f "$cache/bin/ffmpeg.new" "$cache/bin/ffmpeg"
  command -v ffmpeg >/dev/null 2>&1 || stop "the static ffmpeg did not run"
  say "ffmpeg (static): $(ffmpeg -version | head -1)"
fi

# ---- the models: the maker's (wav2vec 2.0 LARGE LV-60k, 1.2 GB), the judge's letters (BASE 960h, 361 MB) and words (Whisper tiny.en, 75 MB) ------------------------
say "fetching the three models into $cache (about 1.7 GB; the first time only)"
"$venv/bin/python" -I - "$here" "$cache" <<'PY' >&2
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
import align, judge  # the maker's own and the judge's own classes, so the weights land where they will be looked for
import numpy as np

cache = Path(sys.argv[2])
align.Model(cache)
models = judge.Models(cache, 4)
silence = np.zeros(16000, dtype='float32')
models.emissions(silence)
models.words(silence)
print('the three models are in', cache)
PY

# ---- the proof --------------------------------------------------------------------------------------------------------------------------------------------------------
proof="$cache/proof"
rm -rf "$proof"
say "proof: timing and judging John $PROOF_CHAPTER through run-book.sh (fetches its one recording, 2 s politeness and all)"
LAMPAS_AUDIO_CACHE="$cache" "$here/run-book.sh" "$PROOF_BOOK" --chapters "$PROOF_CHAPTER" --out "$proof" --fresh >&2 || stop "run-book.sh did not finish John $PROOF_CHAPTER (see above)"

"$venv/bin/python" -I - "$repo" "$proof" "$PROOF_BOOK" "$PROOF_CHAPTER" <<'PY' || stop "THE PROOF FAILED: what this box made of John $PROOF_CHAPTER is not what is shipped (differences above)"
import json
import sys
from pathlib import Path

repo, proof, book, chapter = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], sys.argv[4]
edition = 'msb-david'


def load(path: Path):
    return json.loads(path.read_text(encoding='utf8'))


checks = {
    'the chapter\'s timings': (lambda d: d['chapters'][chapter], f'audio/{edition}/{book}.json', f'public/data/audio/{edition}/{book}.json'),
    'the aligner\'s letters': (lambda d: d['aligned'][chapter], f'quiet/{edition}-{book}.json', f'scripts/audio-timings/quiet/{edition}-{book}.json'),
    'the chapter\'s boundaries': (lambda d: d['chapters'][chapter], f'quiet/{edition}-{book}.json', f'scripts/audio-timings/quiet/{edition}-{book}.json'),
    'the judge\'s verdicts': (lambda d: d['chapters'][chapter], f'judged/{edition}-{book}.json', f'scripts/audio-timings/judged/{edition}-{book}.json'),
}
failed = 0
for name, (pick, made, shipped) in checks.items():
    mine, theirs = pick(load(proof / made)), pick(load(repo / shipped))
    same = json.dumps(mine, sort_keys=True) == json.dumps(theirs, sort_keys=True)
    failed += not same
    print(f'  {name}: {"the same as the shipped" if same else "DIFFERENT"}')
    if not same:
        a, b = json.dumps(mine, sort_keys=True), json.dumps(theirs, sort_keys=True)
        k = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
        print(f'    first difference at character {k}: made ...{a[max(0, k - 60):k + 60]}... shipped ...{b[max(0, k - 60):k + 60]}...')
sys.exit(1 if failed else 0)
PY

seconds=$((SECONDS - started))
say "DONE: a box ready to time and judge a book, proved on John $PROOF_CHAPTER, in $((seconds / 60)) min $((seconds % 60)) s ($seconds s). Next: scripts/audio-timings/run-book.sh <book>"
