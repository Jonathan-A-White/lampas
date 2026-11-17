#!/bin/sh
# scripts/sounds-build.sh — the clips of a one-letter Greek word's sound (mw-5r3p30.347, docs/pronunciation.md): one per vowel sound a scheme's respelling
# writes, and of an elided word of one consonant (δ', mw-5r3p30.449), made with eSpeak NG's phoneme input ([[o]]: a sound, never a letter's name, which its text input says for 'ό') and cut to the voice by ffmpeg.
# Needs espeak-ng and ffmpeg (with libmp3lame). Run from the repo's root; the clips are committed, and a new scheme adds a line below.
#
#   scripts/sounds-build.sh [-h | --help]
#
# It takes no other argument: -h and --help print this text and exit 0, and anything else prints one line naming it and this text to stderr and exits 2. Both
# answer before the script makes or writes a clip (mw-ar5k42b.35).
set -eu

# The arguments come first, before anything is made or written: asking for help must never rewrite the committed clips (mw-ar5k42b.35).
usage() { sed -n '2,/^set -eu$/p' "$0" | sed '/^set -eu$/d; s/^# \{0,1\}//'; }
case "${1:-}" in
  "") ;;
  -h|--help) usage; exit 0 ;;
  *) echo "sounds-build.sh: unknown argument '$1' (it takes none besides -h and --help)" >&2; usage >&2; exit 2 ;;
esac

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
clip() { # clip <scheme> <file name> <espeak-ng voice> <phoneme> [<espeak-ng amplitude> <gain>]: a consonant is quieter than a vowel, so it is made louder
  mkdir -p "public/sounds/$1"
  espeak-ng -v "$3" -s 110 -a "${5:-100}" -w "$tmp/$2.wav" "[[$4]]"
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/$2.wav" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.05${6:+,volume=$6}" \
    -ac 1 -ar 22050 -c:a libmp3lame -b:a 48k -map_metadata -1 -id3v2_version 0 -write_xing 0 "public/sounds/$1/$2.mp3"
}
# Modern Greek (schemes/modern.ts VOWEL_SOUND): α a, ε αι e, η ι υ ει οι ee, ο ω o
clip modern a el a
clip modern e el e
clip modern ee el i
clip modern o el o
# and the elided word of one consonant (schemes/modern.ts ELIDED_SOUND): δ' dh, the th of 'this', held (D:D:, 0.3 s; a bare D is 0.07 s) and made as loud as
# the vowels (eSpeak NG says it some 20 dB under them)
clip modern dh el D:D: 200 8dB
