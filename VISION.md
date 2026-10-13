# Lampas vision (DRAFT: the Governor's to edit)

## In his words
- "okay I want the app to help people learn of all languages learn how to read the Bible in Greek and of all languages to learn how to read the Bible in English" (Postern, 2026-10-12)
- "Logos meets BMA" (his /do, 2026-10-08, plans/0082-lampas-first-demo.json:7)
- "it should be able to meet me where I'm at so if I miss things just help me remember them and if I've totally forgotten things that should dial back so it should be able to you know dial up and down" (plans/0086-lampas-frontier.json:15, 2026-10-08)
- "all in the context of my reading" (same file, Talk ab51be59 turn 6)
- "make this app easy to use correctly and hard to use incorrectly" (lampas/CLAUDE.md:20)
- "Mayor should automatically approve if it is a legitimate approach and he can find how to do it. Screenshots/ pictures of approaches should count as long as there is propper attribution." (plans/0088-lampas-grammar.json:15, 2026-10-08)
- "actually useful for the vision of the app" (plans/lampas-logos-at-scale-grilling.md:4)

## Vision (draft, from his words above)
- "I want the app to help people learn of all languages learn how to read the Bible in Greek and of all languages to learn how to read the Bible in English."
- It is for readers of any mother tongue, learning Koine Greek by reading the New Testament, with a tutor on the verse.
- Learning happens in the reading itself; it meets each reader where they are, and dials up and down.
- Most of all: easy to use correctly, hard to use incorrectly; large clear type, one hand on a phone.
- Lines (his to confirm): credit every source it stands on; never put a reader's licensed books (Logos) in the app or the tutor.

## The tutor
- "so the general rule is is that the tutor always needs to be able to know the up-to-date that could have an impact what he's doing in addition to what he needs to know about you know my progress when I'm at all that you know all the other things we've spoken about before" (Postern general, 2026-10-12 ~13:11Z, direct:8d723b2f...929e2891, dictated after the tutor's Sound it out answer ignored the app's modern pronunciation)

The tutor is told, on every ask, each app setting and each part of his progress that could change its answer.

(src/tutor/knows.ts is the table of what each grind is sent; a test holds it.)

## How feedback is weighed
Feedback that fits this vision is approved and built elegantly; where people differ, a setting; anything crossing a line or changing the vision goes to the Governor.
