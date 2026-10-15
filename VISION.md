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
- "I don't know if there's a way of helping like like very gently letting people know what else is possible with the license I don't know maybe that's a tip yeah that shows Once or something I don't know I'm not trying to force it on them it would be good for people to know that there is something else as well gently but I want them to be able to get the full use out of the unlicensed part and not have to worry about the license and if they never get a license never want to license that's totally fine" (Postern, mw-8m9dyu.4, 2026-10-13T15:25:45Z, direct:da4ec432e5ce0e668052e6fcce0100a65edcd71527538c21772071d5fd15601e, dictated)
- "and the tip should you know link you getting a license I guess in the settings or whatever and make sure that the settings can open right places in the settings but it should be very very easy for somebody to get a license if they want it" (Postern, mw-8m9dyu.4, 2026-10-13 ~15:29Z, direct:1e4792913f0aae158b63a75d5fe7f7962caf271038f73b26431d507716c3d154, dictated)

Lampas is free to read; a licence unlocks the AI. Reading, listening, word sheets, lessons and quizzes need no licence, and a shared verse opens for anyone. Whatever is sent to the mill (the tutor, Ask the tutor, the Talk bar, Hold to ask, tips, feedback, pictures) needs a licence: without one those controls are not drawn on the reading screens, and Settings lists each AI option off and greyed with "Needs a licence", which opens the Licence page (this phone's key, Check again). How a licence is first obtained stays today's way (issue one to the key from Postern's Key screen); a website for it is a later waypoint.

The free app is complete on its own; a licence is mentioned once, gently, and never pressed. On a free reader's third visit (an open of the app on a different day) one quiet line at the foot of the Reader says what a licence adds, with Learn more, which opens the Licence page, and a close; either ends it for good, and nothing else nudges anywhere. Getting a licence stays very easy to ask for: the Licence page says how, in one line, with the key's Copy beside it.

## The tutor
- "so the general rule is is that the tutor always needs to be able to know the up-to-date that could have an impact what he's doing in addition to what he needs to know about you know my progress when I'm at all that you know all the other things we've spoken about before" (Postern general, 2026-10-12 ~13:11Z, direct:8d723b2f...929e2891, dictated after the tutor's Sound it out answer ignored the app's modern pronunciation)

The tutor is told, on every ask, each app setting and each part of his progress that could change its answer.

(src/tutor/knows.ts is the table of what each grind is sent; a test holds it.)

## Pronunciation
- "Is there a standard modern Greek way of reading the Bible If so we should use that everywhere" (Postern, 2026-10-12 22:08Z, channel mw-5r3p30.264, direct:d14699a68c257adabde9341f850bd1e06ee39c93fe4ed6f2ac43580f8e6e9601)

Lampas reads Koine the way the Greek Church reads the New Testament aloud, in standard Modern Greek pronunciation, and every place that says or spells a sound follows it: the Greek voice, the line under each word (the respelling), lessons, questions, probes and the tutor's grinds.

Every sound comes from one pronunciation scheme, so another (Erasmian) plugs in without touching the rest.

## Every age and every ability
- "and I appreciate you thinking of different disabilities you know I don't know like is there a way even of I mean I guess read aloud right is good for somebody who blind I don't know if there are ways of making this more friendly but who's blind that I don't know what you know is there a form of Braille or something that I don't know I mean I know this is a screen so that's and I know TalkBack is a real thing you know and so maybe maybe you could make the app talk back friendly and maybe it already is I'm not sure and I know we have a lot I know it could be that we're good but really think it through like you know how do we make this maybe it already is I'm not sure and I know we have a lot I know it could be that we're good but really think it through like you know how do we make this something that as much as possible wherever you are in your age you know obviously it's not going to help a baby but you understand and wherever you are in disability this can help you overcome and still be able to connect to God's word" (Postern general, 2026-10-13, about 11:40Z, direct:b0f049c1fae80ec4dd0c0b6a8d74f18a9e8cb6497d9e444322a02a7c40e1b94b, dictated)
- "while we're thinking about this can you also offer a settings different I'm not for Greek or Hebrew but different fonts for the English Maybe and and be very selective you know but if there is a really good font you know I'm trying to meet different people of different ages and if there's a really good font you know maybe that one age group responds well to over another you know please make them available" (Immersive reader thread, 2026-10-13 11:28:24Z, direct:372de4bcad12a641151cc4f58c7263d1576b29a636ef38cab1022b1938ed4941, dictated)
- "while I'm sure this is somewhat of assault problem in publishing so you know while keeping a a reverent tone if that makes any sense" (2026-10-13 11:28:41Z, direct:f27050a5af99a108f1d96fc0e89e87d24734ec9a2825225e97497da30921cc0d, dictated)
- "a soft problem yeah I think you have I think you have it right a solved problem" (2026-10-13 11:29:19Z, direct:56414d51e3baa7d337c614e86da62b7bb6317e688f73e0b849a1bf092d5d15f6, dictated; "assault" and "soft" are transcriptions of "solved")

- The app should be as usable as it can be at any age and with any disability.
- TalkBack, and braille through TalkBack, are first-class ways to use it.
- Greek, fonts and size serve the reader and never shrink the type; any font offered is chosen with care and keeps a reverent tone.

## How feedback is weighed
Feedback that fits this vision is approved and built elegantly; where people differ, a setting; anything crossing a line or changing the vision goes to the Governor.
