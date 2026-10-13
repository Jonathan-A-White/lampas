# Lampas vision (DRAFT: the Governor's to edit)

## In his words
- "okay I want the app to help people learn of all languages learn how to read the Bible in Greek and of all languages to learn how to read the Bible in English" (Postern, 2026-10-12)
- "Logos meets BMA" (his /do, 2026-10-08, plans/0082-lampas-first-demo.json:7)
- "it should be able to meet me where I'm at so if I miss things just help me remember them and if I've totally forgotten things that should dial back so it should be able to you know dial up and down" (plans/0086-lampas-frontier.json:15, 2026-10-08)
- "all in the context of my reading" (same file, Talk ab51be59 turn 6)
- "make this app easy to use correctly and hard to use incorrectly" (lampas/CLAUDE.md:20)
- "Mayor should automatically approve if it is a legitimate approach and he can find how to do it. Screenshots/ pictures of approaches should count as long as there is propper attribution." (plans/0088-lampas-grammar.json:15, 2026-10-08)
- "actually useful for the vision of the app" (plans/lampas-logos-at-scale-grilling.md:4)
- "so I'd like to talk about some enhancements to the app particular lampas is what I'm trying to work on ... I think that it should be a good app even if somebody doesn't want learn Greek ... for a licensed user ... if you want to say the chief aim of the app is to help people learn to read the New Testament in Greek that's really like the chief chief aim I feel like it's actually a pretty good Bible and people use it without having to learn Greek ... it's almost like by default should be just English just you know super easy to use just English ... the tutor and he interviews the person should find out what they're trying to do like why are they why are they in the app why are they reading the Bible do they want to learn you know coin a Greek" (Talk 4787b4d6, 2026-10-13, turn 1 excerpt, dictated)
- "yeah I think that's great that way if somebody's not interested in learning Greek in the beginning they can just have a really nice app experience like a really nice Bible reading experience and if they are so inclined to read Greek over time they can go there and you know it it could be that if the if the tutor senses they're starting to have an interest in the underlying Greek he could remind them or offer them to you know applicable Greek features in the app that might be useful for them" (Talk 4787b4d6, 2026-10-13, turn 2, dictated)

## Vision (draft, from his words above)
- "I want the app to help people learn of all languages learn how to read the Bible in Greek and of all languages to learn how to read the Bible in English."
- It is for readers of any mother tongue, learning Koine Greek by reading the New Testament, with a tutor on the verse.
- For a reader who never learns the Greek it is a good Bible in plain English, with the Greek one tap away, and a tutor who remembers what the reader wants and has said no to.
- Learning happens in the reading itself; it meets each reader where they are, and dials up and down.
- Most of all: easy to use correctly, hard to use incorrectly; large clear type, one hand on a phone.
- Lines (his to confirm): credit every source it stands on; never put a reader's licensed books (Logos) in the app or the tutor; Lampas is free to read, and a licence unlocks only the AI.

## Free to read, a licence for the AI
- "and you can correct me if I'm wrong but I think that the license prevents anybody from using this app and if you share a verse or something like that then people can see it is there a way that you can maybe only put any AI components license so anything that involves risk license isn't there just turn off those options in the settings I have an option for you know getting licensed I actually don't know right now at this point how somebody get license but you can put that as a waypoint for later I suspect that was miles from a website I'm on my mind.org somebody could get license there they could request it or buy it or whatever" (Postern general, 2026-10-12 ~22:14Z, direct:26cedcc27e49effb7adb0ac6b9793548f6733359ea4b8cc0291ecbdcde960f3a, dictated; "miles from a website I'm on my mind.org" is a transcription he will correct)
- "oh for right now if someone's not licensed they should going to click on the screen in the app to get license like they normally but I can't talk about something coming in the future I'm talking about once once a non- licensed user could use the without AI" (Postern general, 2026-10-12 22:35:22Z, direct:f3a95a1465910e1c78477f18a8db53ea2b4ff565a20e440ce167bca4f6edbf68, dictated)

Lampas is free to read; a licence unlocks the AI. Reading, listening, word sheets, lessons and quizzes need no licence, and a shared verse opens for anyone. Whatever is sent to the mill (the tutor, Ask the tutor, the Talk bar, Hold to ask, tips, feedback, pictures) needs a licence: without one those controls are not drawn on the reading screens, and Settings lists each AI option off and greyed with "Needs a licence", which opens the Licence page (this phone's key, Check again). How a licence is first obtained stays today's way (issue one to the key from Postern's Key screen); a website for it is a later waypoint.

## The tutor
- "so the general rule is is that the tutor always needs to be able to know the up-to-date that could have an impact what he's doing in addition to what he needs to know about you know my progress when I'm at all that you know all the other things we've spoken about before" (Postern general, 2026-10-12 ~13:11Z, direct:8d723b2f...929e2891, dictated after the tutor's Sound it out answer ignored the app's modern pronunciation)

The tutor is told, on every ask, each app setting and each part of his progress that could change its answer.

(src/tutor/knows.ts is the table of what each grind is sent; a test holds it.)

## Pronunciation
- "Is there a standard modern Greek way of reading the Bible If so we should use that everywhere" (Postern, 2026-10-12 22:08Z, channel mw-5r3p30.264, direct:d14699a68c257adabde9341f850bd1e06ee39c93fe4ed6f2ac43580f8e6e9601)

Lampas reads Koine the way the Greek Church reads the New Testament aloud, in standard Modern Greek pronunciation, and every place that says or spells a sound follows it: the Greek voice, the line under each word (the respelling), lessons, questions, probes and the tutor's grinds.

## How feedback is weighed
Feedback that fits this vision is approved and built elegantly; where people differ, a setting; anything crossing a line or changing the vision goes to the Governor.
