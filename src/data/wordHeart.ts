// src/data/wordHeart.ts — the heart of the word (mw-bsf54t.13): for the commonest New Testament words that earn one, a note written
// in advance, in the voice of the tutor's θέλω answer ('One thread ties them together: the heart leaning toward something'). A word
// earns a note when its senses look unrelated, when English sets a trap (a false friend, a loan word that has drifted), when its forms
// are irregular or come from another root, or when it is one of a pair often confused. Each is checked against the app's lexicon
// (public/data/lexicon.json and the chapters' Abbott-Smith entries) and names only Greek the lexicon or the text has
// (tests/unit/word-heart.test.ts). The key is the lexicon's lemma (NFC); a word with no entry has no note and shows none.
import { lexiconLemmas, normaliseHeadword } from './lemma';

export const WORD_HEART: Readonly<Record<string, string>> = {
  // Little words: pronouns, particles and conjunctions.
  'αὐτός':
    "αὐτός has three jobs, and where it stands tells you which. Alone it is he, she or it (αὐτοῦ, 'his'); stressed it is 'self', as in αὐτὸς ἐγώ, 'I myself'; and between the article and its noun it is 'same', as in τὸ αὐτό, 'the same thing'.",
  'σύ':
    "σύ means you, one person, and its plural comes from another stem: ὑμεῖς, ὑμῶν, ὑμῖν, ὑμᾶς. Those differ from ἡμεῖς, we, by a single letter and sound alike, so look twice: ὑ- is you, ἡ- is us. English 'you' hides whether one person or many is meant; Greek always shows it.",
  'δέ':
    "δέ is a light link, 'and', 'but', 'now', 'then', and it never comes first: look for it second in its clause. It often marks the next step of a story rather than a contrast, so 'and', or no word at all, can be better than 'but'. With μέν before it, it makes a pair: on the one hand, on the other.",
  'ἐγώ':
    "ἐγώ, I, takes its plural from another stem: ἡμεῖς, we, and ἡμῶν, our. Its other forms come short and long, μου and ἐμοῦ, με and ἐμέ, and the long one carries weight. Because the verb already says 'I', writing ἐγώ at all often adds emphasis, though not always.",
  'οὐ':
    "οὐ and μή both mean 'not', but οὐ denies a fact outright, mostly with the indicative, while μή goes with commands, wishes, conditions, infinitives and participles. A question asked with οὐ expects the answer yes. Before a smooth vowel it is οὐκ, before a rough one οὐχ, and οὐχί is its strong form.",
  'γάρ':
    "γάρ is 'for' in the sense of because: it gives the reason for what was just said, or explains it. It never comes first; look for it second in its clause. Unlike English 'for' it is never a preposition, so 'for you' is never γάρ.",
  'μή':
    "μή is the 'not' of what is wished, commanded or supposed, where οὐ denies a plain fact: it goes with commands, wishes, conditions, purpose, infinitives and participles. A question asked with μή expects the answer no, and English often turns it into 'surely not'. οὐ μή together is the strongest denial, 'never'.",
  'τίς':
    "τίς, with its own accent, is the question word: who, what, which, and τί is often 'why'. Without that accent, τις is 'someone, a certain one, anyone', leaning on the word before it. The accent is the whole difference, so check it every time.",
  'ἀλλά':
    "ἀλλά is the strong 'but', stronger than δέ, and it often means 'not this, but that'. It began as the neuter plural of ἄλλος, other, with its accent moved, so at heart it says 'otherwise'.",
  'τις':
    "τις, with no accent of its own, points without naming: someone, anyone, a certain one, and τι, something. It leans on the word before it and usually follows the word it goes with, as in ἄνθρωπός τις, 'a certain man'. Do not read it as the question 'who', which is τίς with its accent.",
  'ἤ':
    "ἤ is 'or', and after a comparison it is 'than': one small word does both. So when ἤ follows a word like μᾶλλον, more, or μείζων, greater, read 'than', as in 'easier for a camel than for a rich man'.",
  'ἐάν':
    "ἐάν is εἰ, if, joined to ἄν: 'if' for what may happen, not as definitely expected as εἰ with the indicative. It takes the subjunctive, so ἐὰν ἀγαπᾶτε is 'if you love', a case that may come about. After a relative word it can just mean '-ever', so ὃς ἐάν is 'whoever'.",
  'μέν':
    "μέν is a marker more than a word: it says 'here is one side, the other is coming', and that other side usually begins with δέ. It is often left untranslated, or put as 'on the one hand'. οἱ μὲν and οἱ δέ are 'some' and 'others'.",
  'ἄν':
    "ἄν has no English word of its own: it makes a statement contingent, turning 'was' into 'would have been' and 'who' into 'whoever'. With the subjunctive, ὃς ἄν is 'whoever' and ὅπου ἄν 'wherever'. It also hides inside ἐάν, 'if', and ὅταν, 'whenever', which is why its gloss says 'if'.",
  'ὅτι':
    "ὅτι does two jobs: 'that' after verbs of saying, knowing and seeing, and 'because'. After λέγω it often just opens the quotation, like a colon or quotation marks, and is left untranslated. The verb before it usually tells you which job it is doing.",
  'ἀλλήλων':
    "ἀλλήλων, one another, has no nominative: it is always the object or the owner, never the subject, so you meet ἀλλήλων, ἀλλήλοις and ἀλλήλους. It is built from ἄλλος, other, doubled: other and other. ἀγαπᾶτε ἀλλήλους is 'love one another'.",

  // Prepositions: one picture, and the case of the noun chooses the sense.
  'ἐκ':
    "ἐκ means 'out of', from inside: movement out from within something, and so origin, source, what a thing comes from. ἀπό means 'away from', from the outside; the two overlap, but ἐκ starts inside. Before a vowel it is ἐξ.",
  'ἐπί':
    "ἐπί is 'upon' at root, and it spreads with its cases: on, at, over with the genitive; on, at, because of with the dative; onto, to, against with the accusative. Its many glosses are one picture, resting on something or reaching to it, as in ἐπὶ τῆς γῆς, 'on the earth'.",
  'διά':
    "διά is 'through' with the genitive and 'because of' with the accusative: the case of its noun tells you which. διὰ πίστεως is 'through faith', the means, and διὰ τοῦτο, 'because of this', is simply 'therefore'.",
  'ἀπό':
    "ἀπό means 'away from', from the outside of a thing: separation, distance, a starting point. ἐκ means 'out of', from within, and in the New Testament the two often overlap, so do not press the difference hard.",
  'κατά':
    "κατά is 'down' at root, and its case splits it. With the accusative it is according to, along, throughout: κατὰ σάρκα, 'according to the flesh', and κατὰ πόλιν, 'city by city'. With the genitive it is down from, or against, as in κατὰ τοῦ πνεύματος, 'against the Spirit'.",
  'μετά':
    "μετά is 'with', in company with, when its noun is genitive, and 'after' when it is accusative. So μετὰ τῶν μαθητῶν is 'with the disciples' and μετὰ ταῦτα is 'after these things'. The case, not the word, carries the meaning.",
  'παρά':
    "παρά is 'beside', and its case tells you which way: from beside someone with the genitive, at someone's side with the dative, alongside or beyond with the accusative. So παρὰ τοῦ πατρός is 'from the Father', and παρὰ τὴν θάλασσαν 'by the sea'.",
  'ὑπό':
    "ὑπό is 'under' at root. With the accusative it is under, as in ὑπὸ νόμον, 'under the law'; with the genitive it names who does the action of a passive verb, 'by', as in ἐβαπτίσθη ὑπὸ Ἰωάννου, 'he was baptized by John'.",
  'ὑπέρ':
    "ὑπέρ is 'over' at root. With the genitive it is for, on behalf of, for the sake of, so one prays for someone; with the accusative it is above, beyond, more than. So a disciple is not ὑπὲρ τὸν διδάσκαλον, above the teacher.",

  // Adjectives.
  'πολύς':
    "πολύς, much or many, changes its stem: πολύς and πολύ have one λ, but most of its forms have two, πολλοί, πολλή, πολλά. οἱ πολλοί is 'the many', and πολλά can be an adverb, 'much' or 'earnestly'.",
  'εἷς':
    "εἷς is 'one', and it changes a great deal: εἷς, μία, ἕν, with ἑνός for the masculine and neuter and μιᾶς for the feminine. It is the hidden end of οὐδείς and μηδείς, 'not even one', no one.",
  'ἅγιος':
    "ἅγιος is holy: set apart, dedicated to God, belonging to him. So the plural οἱ ἅγιοι, 'the saints' in older English, are in Paul's letters God's people, the holy ones of a church. The Holy Spirit is τὸ πνεῦμα τὸ ἅγιον.",
  'μέγας':
    "μέγας, great, also changes its stem: μέγας and μέγα, but μεγάλη and μεγάλοι with -αλ-. Its comparative is μείζων, greater. It covers size, loudness and importance: a great stone, a loud voice (φωνῇ μεγάλῃ), the greatest commandment.",
  'οὐδείς':
    "οὐδείς is οὐδέ and εἷς, 'not even one': no one, nothing, none. It is the οὐ word; μηδείς is its μή partner, used wherever μή would be. The neuter οὐδέν is 'nothing'.",
  'ἄλλος':
    "ἄλλος is other, another. ἕτερος is properly the other of two, but in the Greek of the New Testament it crowds in on ἄλλος, and the two often mean the same, so do not lean hard on the difference. ἀλλήλων, one another, and ἀλλά, but, are built from ἄλλος.",
  'ἀγαθός':
    "ἀγαθός is good in itself, in its being and worth. καλός, beside it, began with what is good to look at, fine and fit for its use: in the words the lexicon quotes, καλός is to ἀγαθός as the appearance to the essence. The two overlap, and the New Testament can use them side by side.",
  'καλός':
    "καλός began as beautiful, fair to look at, and from there good: well fitted to its end, fine, excellent. ὁ ποιμὴν ὁ καλός is the good shepherd, a shepherd as a shepherd should be. ἀγαθός is good in its essence; καλός is goodness that shows.",
  'ἕτερος':
    "ἕτερος is properly the other of two, the second of a pair: 'the other one', or 'a different one'. In later Greek it crowds in on ἄλλος, and in the New Testament the two are often interchangeable. Where they stand side by side, as in Galatians 1, the writer may be playing on the difference.",
  'δίκαιος':
    "δίκαιος is one word where English has two, just and righteous. It means keeping to what is right (δίκη), in duty to God and to people, so a fair judge and a godly man can both be δίκαιος. Its noun δικαιοσύνη is both justice and righteousness.",
  'πιστός':
    "πιστός faces two ways: trusted and trusting. Of a person or a saying it is faithful, reliable, sure; of a believer it is believing. So πιστὸς ὁ λόγος is 'the saying is trustworthy', and οἱ πιστοί are the believers.",
  'αἰώνιος':
    "αἰώνιος belongs to αἰών, an age: age-long, and so eternal. The lexicon gives it three shades, without beginning, without end, or without either, and the passage shows which. ζωὴ αἰώνιος is 'eternal life'.",
  'τρίτος':
    "τρίτος is third, and ancient counting includes the day you start from: τῇ τρίτῃ ἡμέρᾳ, 'on the third day', is the next day but one. So 'after three days' and 'on the third day' can name the same day.",

  // Verbs.
  'εἰμί':
    "εἰμί, to be, has no aorist at all: its past is the imperfect ἦν, 'was', and its future ἔσομαι has a middle ending (ἔσται, 'will be'). Many of its forms are short and look nothing like εἰμί: ἐστίν, εἰσίν, ὤν, ὄντες, εἶναι. ὁ ὢν καὶ ὁ ἦν is 'the one who is and who was'.",
  'λέγω':
    "λέγω leans on what is said, so it is the verb that brings in the words of a quotation, often with ὅτι standing for the quotation marks. Its other tenses come from another root: the aorist is εἶπον (εἶπεν, 'he said'), and the future ἐρῶ is listed as a word of its own. Beside it λαλέω is to speak or talk, the voice in use: λέγω tells you the words, λαλέω that someone spoke.",
  'ἔχω':
    "ἔχω is to have and to hold, but with an adverb it says how someone is: οἱ κακῶς ἔχοντες are 'those who are ill', literally 'those having badly'. That is why its gloss says 'to have/be'. Its aorist ἔσχον and its future ἕξει look little like the present, so learn them with it.",
  'ὁράω':
    "ὁράω is to see, but its tenses come from different roots. The aorist is εἶδον (ἰδών, ἰδεῖν), the future ὄψομαι, and the aorist passive ὤφθη, 'was seen', so 'he appeared'. ἰδού, 'look!', the word that opens so many scenes, is one of its aorist forms.",
  'γίνομαι':
    "γίνομαι is coming to be: to be born, arise, happen, become, and so its gloss 'to be'. ἐγένετο, 'it came to pass', opens many stories, and μὴ γένοιτο is Paul's 'may it never be'. Its aorist ἐγενόμην and perfect γέγονα have the stem γεν-, as in genesis.",
  'ἔρχομαι':
    "ἔρχομαι is both come and go: movement toward or away, and the sentence tells you which. Its other tenses come from another root: the aorist ἦλθον (ἦλθεν, ἐλθών, ἐλθεῖν), the perfect ἐλήλυθα and the future ἐλεύσονται. Every compound keeps them, so ἐξῆλθεν is 'went out', εἰσῆλθεν 'went in', ἀπῆλθεν 'went away' and προσῆλθεν 'came to'.",
  'ποιέω':
    "ποιέω covers both 'do' and 'make', which English keeps apart: to make a thing, do a deed, bring something about. So ποιεῖν καρπόν is to bear fruit, and ποιεῖν τὸ θέλημα is to do someone's will. English poem comes, through Latin, from ποίημα, a thing made.",
  'ἀκούω':
    "ἀκούω is to hear, and hearing runs on into listening, heeding and understanding, as the Hebrew word it stands for in the Greek Old Testament does. ὁ ἔχων ὦτα ἀκούειν ἀκουέτω, 'whoever has ears to hear, let him hear', asks for more than sound reaching the ear. English acoustic comes from it.",
  'δίδωμι':
    "δίδωμι, to give, is a -μι verb whose short stem is δο-: δοῦναι, 'to give', δός, 'give!', and the aorist ἔδωκεν, 'he gave'. The doubled δι- at the front belongs to the present only, so the future δώσω has none. It reaches as wide as English give: grant, supply, deliver, entrust, yield.",
  'εἴδω':
    "This word is met as οἶδα, 'I know': a perfect in form with a present meaning, from the same root as εἶδον, 'I saw', as if to have seen is to know. Its pluperfect ᾔδει is its past, 'he knew', and εἰδώς is 'knowing'. Beside it γινώσκω is often knowing as it is taken in, coming to know.",
  'λαλέω':
    "λαλέω is to utter, talk, speak: the voice in use, so that even thunders speak (ἐλάλησαν) in Revelation. λέγω, beside it, leans on what is said, which is why λέγω is the one that brings in a quotation. Often the two meet in one sentence, ἐλάλησεν for the speaking and λέγων bringing in the words.",
  'λαμβάνω':
    "λαμβάνω is to take, and also to receive: whether you reach for a thing or it is handed to you, it comes into your hands. So the same word is 'he took bread' and 'you will receive power'. Its aorist is ἔλαβον (λαβών, λαβεῖν), with a shorter stem and no μ or ν.",
  'ἀποκρίνω':
    "In the New Testament the forms of 'answer' usually look passive: ἀπεκρίθη is 'he answered', not 'he was answered', and the middle ἀπεκρίνατο means the same. ἀποκριθεὶς εἶπεν, 'answering he said', is a set way to begin a reply. In older Greek the active ἀποκρίνω meant to separate or choose.",
  'πιστεύω':
    "πιστεύω is to have faith in, believe, trust, and English needs all three words for this one. Believing a person and trusting a person are one act here, and πίστις, faith, and πιστός, faithful, are its family. It is often followed by εἰς, literally 'believe into', trust directed toward someone.",
  'γινώσκω':
    "γινώσκω is knowing as it is taken in: to come to know, recognize, perceive, understand, and in its past tenses simply to know. Its aorist has no -σα: ἔγνων, ἔγνω, γνῶναι, and γνώσεσθε is 'you will know'. οἶδα is its near neighbour; the two overlap a great deal.",
  'θέλω':
    "One thread ties them together: the heart leaning toward something. Will, wish, desire and be willing are all that one leaning, and θέλημα, the will, is the thing leaned toward. With another verb after it θέλω is simply 'want to', and with οὐ it can mean 'refuse'. Its neighbour βούλομαι puts more weight on a deliberate choice.",
  'ἵστημι':
    "ἵστημι can mean to make stand or to stand, and the tense tells you which. In the present, the future and the first aorist (ἔστησεν) it is to set or place someone; in the second aorist ἔστη it is 'he stood', and the perfect ἕστηκα means 'I stand'. ἑστώς, 'standing', is that perfect at work.",
  'ἀνίστημι':
    "ἀνίστημι is ἵστημι with ἀνά, up: to make stand up, or to stand up. Its future active and first aorist (ἀνέστησεν) are 'raise up'; its second aorist ἀνέστη and the participle ἀναστάς are 'rose, got up'. ἐγείρω says the same thing from waking; ἀνίστημι says it from standing up.",
  'πορεύω':
    "This verb is met in the middle, to go, travel, go on one's way, and its aorist looks passive: ἐπορεύθη is 'he went', πορευθέντες 'having gone'. The active, to carry across, had dropped out of use, so only the going is left. πορεύου, 'go!', sends someone on their way.",
  'ἀφίημι':
    "One thread runs through ἀφίημι: letting go. To send away, to leave a place or a person, to let someone be (ἄφες, 'let it be'), to give up the spirit at death, and to forgive a debt or sins, which is letting it go. Its forms are those of a -μι verb: ἀφῆκεν, ἄφες, and the perfect passive ἀφέωνται, 'are forgiven'.",
  'ἀγαπάω':
    "ἀγαπάω is to love: to hold a person dear and show it in goodwill, or to prize and delight in a thing, so people can even love the darkness. Its neighbour φιλέω is the love of fondness and friendship, and it can also mean to kiss. In John 21 the two alternate in Jesus' questions to Peter; whether a difference is meant there is argued, so read the passage, not the words alone.",
  'ἐγείρω':
    "ἐγείρω is to wake, rouse from sleep, and from there to raise up, the dead or the fallen, and in the passive to rise. ἔγειρε, 'get up!', is said to the sick, and ἠγέρθη can be put into English as 'he was raised' or 'he rose'. Its gloss and ἀνίστημι's are both 'to arise': ἐγείρω pictures waking, ἀνίστημι standing up.",
  'βλέπω':
    "βλέπω is to see, have sight, look at, and then to see with the mind, perceive. Its plural command βλέπετε often means 'watch out', 'beware'. Unlike ὁράω it keeps one regular stem, so its forms are easy to spot.",
  'βάλλω':
    "βάλλω is to throw, but it reaches further than English throw: to cast, put, place, even pour, as new wine is put into new wineskins. So it can be violent, thrown into prison, or gentle, Thomas wanting to put his finger into the mark of the nails. Its aorist is ἔβαλον (βαλεῖν) and its aorist passive ἐβλήθη.",
  'κρίνω':
    "κρίνω begins in separating: to sort, select, and so to judge, think, decide, determine. A judge separates right from wrong, and someone who has judged to do a thing has decided it. Its noun κρίσις is judgment, and English crisis, the point of decision, comes from it.",
  'ἀποθνήσκω':
    "ἀποθνήσκω is to die, and its aorist ἀπέθανον (ἀποθανεῖν) drops the -ήσκ- of the present. The same root gives θάνατος, death, and θνητός, mortal. It also serves as the passive of ἀποκτείνω, to kill: to be killed is said 'to die'.",
  'μέλλω':
    "μέλλω points to what is coming: with an infinitive it is to be about to, to be going to, or to intend. Its participle names what lies ahead, so ὁ μέλλων is 'the one to come' and ἐν τῷ μέλλοντι 'in the age to come'. Its gloss 'to ensue' means that, what follows next.",
  'σῴζω':
    "σῴζω is to save from danger, harm or suffering, and also to heal: 'your faith has made you well' is σέσωκέν σε. One thread runs through it, bringing someone safe and whole out of what threatens them. Its noun σωτηρία, salvation, carries the same picture of rescue.",
  'παρακαλέω':
    "παρακαλέω is to call someone to your side, and what you call them for gives the English: to summon, to plead with or beg, to urge on, to comfort. Whether it is 'I beg you' or 'comfort one another', the picture is the same voice close beside someone. The παράκλητος of John's Gospel, one called alongside to help, is from the same root.",
  'δεῖ':
    "δεῖ is impersonal, 'it is necessary', and English usually turns it round to 'must': δεῖ με is 'I must'. Its past is ἔδει, 'it had to be' or 'ought'. In the Gospels it often marks what has to happen.",
  'αἴρω':
    "αἴρω is to lift: raise, take up, carry, and from there take away, remove. 'Take up your cross' and 'takes away the sin of the world' are both αἴρω, the one lifting a load on, the other lifting it off. Its aorist ἦρεν has lost the ι, and ἆρον is 'take up!'.",
  'φαγεῖν':
    "φαγεῖν, 'to eat', is the aorist of ἐσθίω, from another root, and the app keeps it as a word of its own. ἔφαγον is 'I ate' or 'they ate', and φάγωμεν is 'let us eat'. When you meet a form in φαγ-, think ἐσθίω.",
  'ἀπολλύω':
    "ἀπολλύω is to destroy utterly, or to lose, and in the middle to perish or be lost. So the lost sheep and the one who perishes are the same word, ἀπολωλός and ἀπόληται. The passage decides between 'lose' and 'destroy'.",
  'φοβέω':
    "This verb is met only in the passive in the New Testament, to be afraid, to fear: ἐφοβήθησαν is 'they were afraid', not 'they were feared'. The active, to frighten or put to flight, had gone. μὴ φοβοῦ and μὴ φοβεῖσθε, 'do not be afraid', are said again and again in the Gospels.",
  'πίπτω':
    "πίπτω is to fall, and its aorist ἔπεσον (πεσών) drops the doubled πι-. It is often a deliberate fall: πεσόντες προσεκύνησαν, 'they fell down and worshipped', or falling at someone's feet. So its gloss 'to collapse' covers a house falling, a man falling down, and bowing to the ground.",
  'πληρόω':
    "πληρόω is to fill, make full, and so to fulfil: a scripture is fulfilled when what it said is filled up in events. The same word fills a net, fills a house with sound, and fills a heart with joy. ἵνα πληρωθῇ, 'so that it might be fulfilled', is Matthew's way of tying a story to the prophets.",
  'ἄρχομαι':
    "ἄρχω has two sides, to rule and to begin, held together by being first: first in rank, or first in time. In the active it is to rule (ἄρχων, a ruler), and in the middle, ἄρχομαι, to begin, as in ἤρξατο, 'he began'. ἤρξατο with another verb, 'he began to teach', is often just a vivid way of saying he taught.",
  'βαπτίζω':
    "The English word is the Greek spelt out; βαπτίζω means to dip, immerse, sink. Polybius uses it of soldiers wading breast-deep and of ships going down, and figuratively it is to be overwhelmed. In the New Testament it names John's baptism and the church's.",
  'ἀνοίγω':
    "ἀνοίγω, to open, has some of the strangest forms in the New Testament, because its augment can fall in more than one place. Beside ἤνοιξεν, 'he opened', you meet ἀνέῳξεν, and the passive ἠνεῴχθησαν with two augments at once. The perfect ἀνέῳγεν means 'stands open'.",
  'μαρτυρέω':
    "μαρτυρέω is to be a witness, bear witness, testify: to say what you have seen and stand by it. English martyr comes from its family (μάρτυς, a witness), and the sense of dying for it grew from witnesses who did. John's Gospel is full of it: who testifies about whom.",
  'ἄγω':
    "ἄγω is to lead or bring, and also to spend a day, and ἄγωμεν is 'let us go'. Its aorist doubles its own stem: ἤγαγον, ἀγαγεῖν. συνάγω, to gather together, does the same (συνήγαγον), and gives συναγωγή, a gathering, the synagogue.",
  'πίνω':
    "πίνω, to drink, has a short aorist: ἔπιον, πιεῖν, πίω. Its future πίεσθε, 'you will drink', looks almost like a present, so watch for it. ποτήριον, the cup, is of its family.",
  'χαίρω':
    "χαίρω is to rejoice, be glad, and its command χαῖρε or χαίρετε was the everyday greeting, 'greetings' or 'hail'. So the angel's χαῖρε to Mary and Paul's 'rejoice' are one word, and χαίρειν opens a letter as 'greetings'. Its aorist ἐχάρη looks passive, and χαρά, joy, is its noun.",
  'ἐρωτάω':
    "ἐρωτάω is to ask a question, and in later Greek also to ask for, request, beg: 'I ask you to come'. αἰτέω is asking for something, so αἰτεῖτε is 'ask, and it will be given you'. ἐπερωτάω, with ἐπί, is to question, inquire of.",
  'φέρω':
    "φέρω is to bear: carry, endure, and bring. Its aorist comes from another root, ἤνεγκα (ἤνεγκεν, ἐνέγκατε), and its future is οἴσει, 'he will bring', so three different looks belong to one verb. καρπὸν φέρει, 'bears fruit', is the carrying that brings something forth.",
  'ὑπάρχω':
    "ὑπάρχω is to be, with a sense of what is already there: to exist, be at hand, belong. Its participle τὰ ὑπάρχοντα, 'what is there for someone', is possessions, goods, property, so the same verb gives 'being' and 'belongings'. ὑπάρχων is often simply 'being'.",
  'κηρύσσω':
    "κηρύσσω is to be a herald, to proclaim: a κῆρυξ cried out news in public. So 'preach' in the New Testament is announcing news aloud, as John and Jesus proclaim the kingdom; the picture is a public announcement more than a sermon. Its noun κήρυγμα is what was proclaimed.",
  'πείθω':
    "πείθω is to persuade, win over, and in the passive to be persuaded, to obey. Its perfect πέποιθα means 'I am confident, I trust': having been persuaded, I now rely. πίστις, faith, comes from the same root.",
  'εὑρίσκω':
    "εὑρίσκω is to find, with or without searching first, and its opposite ζητέω, to seek, often stands with it. Its aorist is εὗρον (εὑρών), and its perfect is the eureka Archimedes is said to have shouted, 'I have found it', as in εὑρήκαμεν, 'we have found'.",
  'ἐσθίω':
    "ἐσθίω, to eat, takes its aorist from another root: ἔφαγον, φαγεῖν, which the app lists as its own word φαγεῖν. So ἐσθίει is 'eats' or 'is eating', but 'ate' is ἔφαγεν. Eating and drinking together, ἐσθίειν καὶ πίνειν, often stands for sharing a table or ordinary life.",

  // Nouns.
  'Χριστός':
    "Χριστός is not a surname but a title: anointed, from χρίω, to anoint. It is the Greek for the Hebrew Messiah, the Anointed One, and John twice gives Μεσσίας for the same word. So Ἰησοῦς Χριστός says Jesus, the Anointed.",
  'κύριος':
    "κύριος is the one with power or authority over something: owner, master, lord. Said to a person, κύριε can be no more than a polite 'sir', as when the Samaritan woman says it to Jesus. In the Greek Old Testament it stands for God's own name, so 'the Lord' in a quotation is often that name.",
  'ἄνθρωπος':
    "ἄνθρωπος is a human being, man or woman, as distinct from God or the animals; ἀνήρ is a man as a male, or a husband. So when older English says 'man' for ἄνθρωπος it means a person, and the plural ἄνθρωποι is people. κατὰ ἄνθρωπον is 'in a human way'.",
  'πνεῦμα':
    "πνεῦμα is moving air: wind, breath, and then the breath of life, the spirit. In John 3 the wind blows where it wills and one is born of the Spirit, the same word in both. So the Holy Spirit, the human spirit and the wind share one word, and the passage chooses.",
  'ἀδελφός':
    "ἀδελφός is a brother, at root one born of the same womb, and then anyone near as kin: a neighbour, a fellow member of one's people, and in the New Testament a fellow believer. So in a letter ἀδελφοί addresses the whole church.",
  'λόγος':
    "λόγος is a word, but not a single word as a grammarian means it: a word that carries a thought, so a saying, a message, an account, a reason. It is the noun of λέγω, what is said and the sense behind it. John opens with Ἐν ἀρχῇ ἦν ὁ λόγος, 'in the beginning was the Word'.",
  'οὐρανός':
    "οὐρανός is the sky and heaven, one word where English has two: the birds of the οὐρανός fly in the sky, and God is in the οὐρανοί. The plural follows the Hebrew word for heaven, which is plural in form, so 'the kingdom of the heavens' in Matthew is simply the kingdom of heaven.",
  'γῆ':
    "γῆ is the earth, and also land, ground, soil and country: the world as against heaven, dry land as against the sea, the field a farmer works, a region like γῆ Ἰσραήλ. Its gloss 'earth, planet' is its widest sense; often it is the ground under your feet or a country.",
  'πίστις':
    "πίστις is faith, belief, trust and confidence, one Greek word where English has several. It comes from the family of πείθω, to persuade, whose perfect πέποιθα is 'I am confident'. In a few places it is the other side of the same coin, faithfulness.",
  'γυνή':
    "γυνή is a woman, married or not, and also a wife: Greek has one word where English has two. When Jesus calls his mother γύναι, 'woman', it is a term of respect, not coldness. Its other forms come from a longer stem: γυναικός, γυναῖκα, γυναῖκες.",
  'ἀνήρ':
    "ἀνήρ is a man as a male, a grown man, or a husband; ἄνθρωπος is a human being of either sex. So ἄνδρες, 'men', is how Acts addresses a crowd, and ὁ ἀνὴρ αὐτῆς is 'her husband'. Its forms add a δ: ἀνδρός, ἄνδρα.",
  'κόσμος':
    "κόσμος began as order, and then ornament, adornment: what is well arranged. From there it came to mean the world as an ordered whole, the earth, and often the people of the world, as in 'God so loved the world'. English cosmos and cosmetic both come from it.",
  'ἄγγελος':
    "ἄγγελος is a messenger, one sent with word, and from that it came to mean an angel, God's messenger. So John the Baptist's messengers are ἄγγελοι as well as the angels of heaven. Its root, the announcing in ἀπαγγέλλω, is also inside εὐαγγέλιον, good news.",
  'νόμος':
    "νόμος is law, but first custom, usage, the way things are done. In the New Testament it most often means the Law of Moses, the Torah, and sometimes the books of Moses or the Scriptures as a whole. Paul also uses it for a rule at work, 'the law of sin', so watch which he means.",
  'ἁμαρτία':
    "ἁμαρτία comes from ἁμαρτάνω, and at root it is a missing of the mark; older Greek used it of a fault or a failure. In the New Testament it is sin, both a single wrong and sin as a power, so that Paul can say it reigned (ἐβασίλευσεν). The picture of the arrow falling short helps, but the word itself means sin.",
  'δόξα':
    "δόξα began as opinion, what people think of you, and so reputation, honour, praise. In the Greek Bible it took on the sense of the Hebrew word it translates: splendour, brightness, the glory of God. Its verb δοξάζω is to glorify, and δοκέω, to think or seem, is of the same root.",
  'ἔθνος':
    "ἔθνος is a nation, a people; in the plural, τὰ ἔθνη, it usually means the nations other than Israel, the Gentiles. So its gloss 'Gentiles' is the plural's sense, and in the singular it can even be the Jewish people. English ethnic comes from it.",
  'βασιλεία':
    "βασιλεία is first kingship: reign, royal power, rule, and only then a kingdom as a land or a people. So 'the kingdom of God' is often best heard as God's reign. Its root is βασιλεύς, king.",
  'καρδία':
    "καρδία, the heart, is not just feelings: it is the centre of a person, where thinking, willing and feeling all happen. So people reason in their hearts and understand with the heart. When the New Testament says heart, think of the whole inner self.",
  'χάρις':
    "χάρις is what wins favour and what favour gives: gracefulness, kindness freely shown, a gift, and thanks in return. One thread ties them together, goodwill given, so χάρις τῷ θεῷ is 'thanks be to God'. χαρά, joy, and χαίρω, rejoice, are its cousins.",
  'σάρξ':
    "σάρξ is flesh, the soft stuff of a body, and then a human being as frail and mortal, so 'all flesh' is all people. σάρξ καὶ αἷμα, flesh and blood, is human nature as against God, and Paul often sets σάρξ against πνεῦμα, the spirit. σῶμα, the body, is the whole; σάρξ is what it is made of.",
  'προφήτης':
    "A προφήτης is one who speaks for God, an interpreter or forth-teller of God's will; foretelling is part of it, but not the whole. The word is πρό, forth, and φημί, to speak.",
  'ἀμήν':
    "ἀμήν is a Hebrew word for firm, sure, carried into Greek unchanged. At the end of a prayer it is 'so be it'; at the start of Jesus' sayings, ἀμὴν λέγω ὑμῖν, it is 'truly I tell you', a pledge before the words. John doubles it: ἀμὴν ἀμήν.",
  'αἰών':
    "αἰών is an age, a long span of time: a lifetime, a period of history, and so 'this age' and 'the age to come'. With a preposition it becomes forever: εἰς τὸν αἰῶνα, 'into the age', and εἰς τοὺς αἰῶνας τῶν αἰώνων, 'for ever and ever'. English eon comes from it.",
  'δοῦλος':
    "δοῦλος is a slave, someone owned by another, not a hired servant. Older English softened it to 'servant', but the word means bondage. Paul calls himself δοῦλος of Christ, and Jesus says whoever would be first must be δοῦλος of all.",
  'δύναμις':
    "δύναμις is power, might, strength, the ability to do something, and in the plural, δυνάμεις, it is often 'mighty works', miracles. ἐξουσία is the right to act; δύναμις is the strength to do it. English dynamite was named from it long after; the Greek has nothing explosive about it.",
  'ἀγάπη':
    "ἀγάπη is love, goodwill, esteem, and outside the Bible and the church's writings the noun is hardly found. Its meaning is filled by how it is used: in 1 Corinthians 13 Paul describes it by what it does. Its verb is ἀγαπάω, and the near word for fondness and friendship is φιλία, from φιλέω.",
  'ἐκκλησία':
    "ἐκκλησία is an assembly, a gathering of people called out (ἐκ, καλέω): in a Greek city the citizens' meeting, in the Greek Old Testament the congregation of Israel. In the New Testament it is the church as people gathered, never a building. Even the rioting crowd at Ephesus is called an ἐκκλησία.",
  'ψυχή':
    "ψυχή is breath, then life itself, then the inner self, the seat of will, desire and feeling. So 'whoever would save his ψυχή will lose it' is about his life, and 'my ψυχή is very sorrowful' is my soul, myself. English soul can sound like a separate part; often ψυχή is simply life, or the person.",
  'ζωή':
    "ζωή means life, being alive, the life one lives by; βίος, its neighbour, is the course of a life, or one's living, livelihood. So the widow put in her whole βίος, all she had to live on, while eternal life is always ζωή. Its verb is ζάω, to live.",
  'καιρός':
    "καιρός is time as a fitting moment: the right time, a season, the hour for something. χρόνος, beside it, is time as a stretch, how long. So 'my καιρός has not yet come' is the moment for something, and fruit comes in its καιρός, its season.",
  'εὐαγγέλιον':
    "εὐαγγέλιον is good news (εὖ, well, and the root of ἄγγελος, messenger); once it even meant the reward given to whoever brought good news. In the New Testament it is the good news Jesus and the apostles announce, a message spoken aloud, not yet a book. Its verb εὐαγγελίζομαι is to bring good news.",
  'σάββατον':
    "σάββατον is the Sabbath, the seventh day, from the Aramaic; because the Aramaic word ended in -α, Greek also took the plural σάββατα for a single Sabbath. It can also mean a week: μία τῶν σαββάτων, 'the first day of the week', is the morning of the empty tomb.",
  'ἐλπίς':
    "ἐλπίς is expectation, and in the New Testament always expectation of good: hope as looking forward to what is coming. English 'I hope so' can mean unsure; ἐλπίς is the looking forward itself.",
  'ὁδός':
    "ὁδός is a way, road, path, and so a way of going about life: the way of the Lord, the way of peace. In Acts the first believers are even called 'the Way'. It is feminine, though it looks masculine: ἡ ὁδός, ταύτην τὴν ὁδόν.",
  'ἐξουσία':
    "ἐξουσία is the right or freedom to act: authority, permission, the power that comes from being allowed. δύναμις is the strength to do a thing; ἐξουσία is the right to do it, as when a teacher speaks with authority. It can also name those who hold it, the authorities.",
  'ἀρχή':
    "ἀρχή is the beginning, the origin, and also rule, a ruler, a power: what comes first in time and what comes first in rank. Ἐν ἀρχῇ, 'in the beginning', opens John's Gospel, and in Paul's letters αἱ ἀρχαί are rulers or powers. Its verb is ἄρχω, to rule, and in the middle to begin.",
  'δικαιοσύνη':
    "δικαιοσύνη is one word for what English calls justice and righteousness: being as one ought, in line with what is right. The lexicon puts it as conformity to God's will in purpose, thought and action. δίκαιος, just or righteous, is its adjective.",
  'ῥῆμα':
    "ῥῆμα is that which is spoken: a word, a saying, a statement. Like the Hebrew word behind it, it can also mean the thing spoken of, a matter or event, as when the shepherds say 'let us see this ῥῆμα that has happened'. It and λόγος overlap a great deal.",
};

/** A headword whose note is kept under another lemma: a form the word lists carry as a word of its own. */
const SAME_NOTE: Readonly<Record<string, string>> = {
  'ἡμεῖς': 'ἐγώ',
  'ὑμεῖς': 'σύ',
  'οἶδα': 'εἴδω',
};

/** The heart of the word for a headword, a lexicon lemma or a BMA lemma line ('ἄνθρωπος, -ου, ὁ'), or undefined when it has none. */
export function wordHeart(lemma: string): string | undefined {
  const headword = normaliseHeadword(lemma);
  if (!headword) return undefined;
  for (const l of [SAME_NOTE[headword] ?? headword, ...lexiconLemmas(headword)]) {
    if (Object.hasOwn(WORD_HEART, l)) return WORD_HEART[l];
  }
  return undefined;
}
