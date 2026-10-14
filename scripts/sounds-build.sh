#!/bin/sh
# scripts/sounds-build.sh — the clips of a one-letter Greek word's sound (mw-5r3p30.347, docs/pronunciation.md): one per vowel sound a scheme's respelling
# writes, made with eSpeak NG's phoneme input ([[o]]: a sound, never a letter's name, which its text input says for 'ό') and cut to the voice by ffmpeg.
# Needs espeak-ng and ffmpeg (with libmp3lame). Run from the repo's root; the clips are committed, and a new scheme adds a line below.
set -eu
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
clip() { # clip <scheme> <file name> <espeak-ng voice> <phoneme>
  mkdir -p "public/sounds/$1"
  espeak-ng -v "$3" -s 110 -w "$tmp/$2.wav" "[[$4]]"
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/$2.wav" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.05" \
    -ac 1 -ar 22050 -c:a libmp3lame -b:a 48k -map_metadata -1 -id3v2_version 0 -write_xing 0 "public/sounds/$1/$2.mp3"
}
# Modern Greek (schemes/modern.ts VOWEL_SOUND): α a, ε αι e, η ι υ ει οι ee, ο ω o
clip modern a el a
clip modern e el e
clip modern ee el i
clip modern o el o
