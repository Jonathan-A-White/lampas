# Attribution

Lampas uses these texts, lexicons and libraries.

- **Majority Standard Bible (MSB), New Testament tables.** Public domain. Byzantine Greek word-aligned
  to the MSB English, with Strong's numbers and Robinson-Pierpont parsing codes.
  Source: https://majoritybible.com/msb_nt_tables.tsv (majoritybible.com).
- **Tyndale House's Brief lexicon of the Greek NT, extended (TBESG), from STEPBible.** Licensed
  CC BY 4.0. Credit: STEPBible (https://www.STEPBible.org), Tyndale House, Cambridge. Data used under
  https://creativecommons.org/licenses/by/4.0/.
  Changes: per Strong's number only the first entry is used, with its lemma and gloss as given; the
  Abbott-Smith definition has its markup, scripture references and daggers removed and is cut near 300
  characters (scripts/data-build.ts, docs/data.md).
- **bsv-kit** (https://github.com/Jonathan-A-White/bsv-kit). MIT licence. Licence gate and tutor payments.
- **Gentium Plus** (https://software.sil.org/gentium/), the Greek type of the reader. SIL Open Font License 1.1,
  Copyright (c) 2003-2022 SIL International; the licence text is in `src/fonts/OFL.txt`. The OFL allows bundling
  and redistributing the font with software. The Greek and Greek Extended subsets are bundled as the
  @fontsource/gentium-plus 5.3.0 builds, unmodified.
- **Biblical Mastery Academy** (https://biblicalmastery.academy/). The order in which the BMA Tutor grammar approach teaches Greek
  follows the sequence of the Greek Success Path of Biblical Mastery Academy. Only the sequence is followed: the lesson titles,
  the method and the drills in Lampas are its own, and no course text, image or exercise is copied.
