// src/data/grammar-concepts.ts — what each grammar word on the word sheet means, in plain words (mw-5r3p30.35). One entry for every
// term src/data/parseCode.ts can write (GRAMMAR_TERMS); tests/unit/grammar-concepts.test.ts fails on a term without one, on an
// explanation over 60 words, a Greek note over 40, or a related term that has no entry. The Grammar sheet shows an entry.
// Written for someone who has never studied grammar: what it is, what it does in a sentence, one English example; then how
// it shows in Koine Greek.

export interface GrammarConcept {
  term: string;
  /** what it is and what it does in a sentence, with an English example: at most 60 words */
  explanation: string;
  /** how it shows in Koine Greek: at most 40 words */
  greek: string;
  /** terms worth reading next (each has an entry) */
  related: string[];
}

const c = (term: string, explanation: string, greek: string, related: string[] = []): [string, GrammarConcept] => [term, { term, explanation, greek, related }];

export const GRAMMAR_CONCEPTS: Record<string, GrammarConcept> = Object.fromEntries([
  // parts of speech
  c(
    'verb',
    'A verb says what someone does or what happens: run, think, is. Every sentence needs one. Verbs change their form to show when something happens and who does it. Example: in “She reads the letter”, reads is the verb.',
    'A Greek verb carries a lot in its ending: λύομεν is already “we are loosing”. Tense, voice, mood, person and number are all shown on the verb itself.',
    ['present', 'active', 'indicative'],
  ),
  c(
    'noun',
    'A noun names a person, place, thing or idea: Paul, city, love. It can be the one who acts or the one acted on. Example: in “The servant loves the master”, servant and master are nouns.',
    'A Greek noun changes its ending to show its job in the sentence (its case), and each noun has a fixed gender. Word order matters less than in English, because the ending says who does what.',
    ['nominative', 'accusative', 'masculine', 'article'],
  ),
  c(
    'adjective',
    'An adjective describes a noun: good, large, holy. Example: in “a good shepherd”, good is the adjective.',
    'A Greek adjective matches the noun it describes in case, number and gender, so its ending usually echoes the noun’s. It can also stand alone as a noun: “the holy ones”.',
    ['noun', 'nominative', 'singular'],
  ),
  c(
    'article',
    'The article is the little word the. It points to something particular. Example: “the book” means a book you have in mind, while “a book” does not.',
    'Greek has only “the” (ὁ, ἡ, τό) and no word for “a”. The article changes its ending to match its noun in case, number and gender, so it often shows you the noun’s case at a glance.',
    ['noun', 'masculine', 'feminine', 'neuter'],
  ),
  c(
    'preposition',
    'A preposition links a noun to the rest of the sentence and says where, when or how: in, to, with, from. Example: in “She sat by the river”, by is the preposition.',
    'A Greek preposition is followed by a noun in a certain case, and the case changes its meaning: διά with the genitive means “through”, with the accusative “because of”.',
    ['noun', 'genitive', 'accusative'],
  ),
  c(
    'conjunction',
    'A conjunction is a small joining word. It links words, phrases or whole sentences: and, but, because, so that. Example: in “I came, but he left”, but is the conjunction.',
    'Greek conjunctions are often tiny. καί means “and”. γάρ “for, because” and δέ “but, and” usually come second in their clause, not first, as English would put them.',
    ['particle', 'adverb', 'preposition'],
  ),
  c(
    'particle',
    'A particle is a small word that adds a shade of feeling or emphasis without much meaning of its own: indeed, surely, not. It is hard to translate and is often left out of English.',
    'Greek uses many particles to show emphasis, a question or a contrast, such as μή “not” or ἄρα “so then”. A translation may show one with a word like “indeed”, or only with tone.',
    ['conjunction', 'adverb', 'negative'],
  ),
  c(
    'adverb',
    'An adverb tells how, when, where or how much something happens: quickly, now, here, very. Example: in “He spoke clearly”, clearly is the adverb.',
    'Many Greek adverbs end in -ως, like καλῶς “well”. An adverb never changes its ending for case, number or gender, so it is easy to spot.',
    ['adjective', 'verb', 'conjunction'],
  ),
  c(
    'conditional',
    'A conditional word begins an “if” clause: if, unless, even if. It sets a condition, and the rest of the sentence says what follows. Example: “If it rains, we stay home.”',
    'Greek “if” is εἰ or ἐάν, and “if not” is often εἰ μή. Which word is used, and the mood of the verb after it, tells how the writer sees the condition.',
    ['conjunction', 'indicative', 'subjunctive'],
  ),
  c(
    'interjection',
    'An interjection is a word thrown in to show a feeling or to catch attention. It is not part of the sentence’s grammar. Example: “Wow, that is big!”',
    'Greek has a few, such as οὐαί “woe!” and ἰδού “look!”. They often open a sentence to catch the reader’s eye, and they never change their ending.',
    ['particle', 'conjunction'],
  ),
  c(
    'Aramaic word',
    'A word the writer took straight from Aramaic, the everyday language of Jesus’ people, and wrote in Greek letters. Example: Abba, which means “father”.',
    'In the Greek text it appears in Greek letters, often followed by a translation: ἀββά, “father”. Its endings usually do not change the way a Greek word’s do.',
    ['Hebrew word', 'indeclinable'],
  ),
  c(
    'Hebrew word',
    'A word the writer took straight from Hebrew and wrote in Greek letters, often a name or a religious term. Example: Amen, which means “truly”.',
    'In the Greek text it appears in Greek letters, as in ἀμήν “truly” or σαβαώθ “of hosts”. It usually keeps one fixed form instead of changing its ending.',
    ['Aramaic word', 'indeclinable', 'proper name'],
  ),

  // pronouns
  c(
    'personal pronoun',
    'A personal pronoun stands in for a person or thing already named: I, you, he, she, it, we, they. Example: “Mary came, and she sang.” Here she stands for Mary.',
    'ἐγώ is “I”, σύ “you”, αὐτός “he, it”. A Greek ending already shows who acts, so these words are added mostly for emphasis. αὐτός also means “same” or “himself”.',
    ['1st person', '2nd person', '3rd person', 'reflexive pronoun'],
  ),
  c(
    'relative pronoun',
    'A relative pronoun starts a small clause that tells more about a noun: who, which, that. Example: in “the man who called”, who points back to man.',
    'ὅς, ἥ, ὅ means “who, which”. It matches the word it points back to in gender and number, but its case comes from its own job inside its own clause.',
    ['personal pronoun', 'demonstrative pronoun', 'genitive'],
  ),
  c(
    'reciprocal pronoun',
    'A reciprocal pronoun says two or more people do the same thing to each other: each other, one another. Example: “They greeted one another.”',
    'ἀλλήλων means “one another”. It exists only in the plural, since it needs at least two people, and it is never the subject of the sentence.',
    ['reflexive pronoun', 'plural'],
  ),
  c(
    'demonstrative pronoun',
    'A demonstrative pronoun points something out: this, that, these, those. Example: “I want that one.”',
    'οὗτος means “this”, pointing to what is near, and ἐκεῖνος “that”, pointing to what is far. They change by case, number and gender, and often stand beside a noun with its article.',
    ['personal pronoun', 'article', 'relative pronoun'],
  ),
  c(
    'correlative pronoun',
    'A correlative pronoun matches a size, kind or amount with another word: such as, so great, as many as. Example: “Such a man is rare.”',
    'Words such as τοιοῦτος “such” and τοσοῦτος “so great” are of this kind. They are often paired with a relative word like ὅσος “as many as”.',
    ['relative pronoun', 'correlative or interrogative pronoun'],
  ),
  c(
    'interrogative pronoun',
    'An interrogative pronoun asks a question: who, what, which. Example: “Who is there?”',
    'τίς, τί means “who? what?”. It always keeps its acute accent, which tells it apart from the “someone” word τις, τι that has none of its own.',
    ['indefinite pronoun', 'interrogative', 'correlative or interrogative pronoun'],
  ),
  c(
    'indefinite pronoun',
    'An indefinite pronoun means someone or something without saying exactly who or what: someone, anything, some. Example: “Someone knocked.”',
    'τις, τι means “someone, something”. It is written without an accent of its own, since it leans on the word before it. The question word τίς “who?” keeps its accent.',
    ['interrogative pronoun', 'personal pronoun'],
  ),
  c(
    'correlative or interrogative pronoun',
    'Some pronouns can ask a question and can also match one thing to another, and the sentence decides which. Example: “How many came?” asks; “as many as came” matches.',
    'Forms like ποῖος “what kind?” and πόσος “how much?” ask questions. The same shapes can pair with a matching word, so the context tells you which job they do.',
    ['correlative pronoun', 'interrogative pronoun'],
  ),
  c(
    'reflexive pronoun',
    'A reflexive pronoun turns an action back on the one who does it: myself, himself, themselves. Example: “He taught himself.”',
    'ἑαυτόν means “himself” (also “herself, itself, themselves”). It points back to the subject, so it can never be the subject itself.',
    ['personal pronoun', 'middle'],
  ),
  c(
    'possessive pronoun',
    'A possessive pronoun says who something belongs to: my, your, our, his. Example: “It is my book.”',
    'ἐμός “my” and σός “your” act like adjectives and match the thing owned. More often Greek puts the genitive of ἐγώ or αὐτός after the noun: ὁ λόγος μου “my word”.',
    ['possessor', 'genitive', 'personal pronoun'],
  ),

  // suffixes
  c(
    'Attic form',
    'An Attic form is a spelling the New Testament borrowed from Attic, the Greek of classical Athens, in place of the usual everyday one. It is like “colour” and “color”: same word, another spelling habit.',
    'It is rare, and it only matters if a word looks a little different from how you learned it. The meaning is the same as the usual form.',
    ['poetic'],
  ),
  c(
    'comparative',
    'A comparative says one thing has more of a quality than another: bigger, better, more holy. Example: “She is taller than her brother.”',
    'It often ends in -τερος or -ων: μείζων “greater”, κρείττων “better”. What it is compared with is put in the genitive, or comes after ἤ “than”.',
    ['superlative', 'adjective', 'genitive'],
  ),
  c(
    'superlative',
    'A superlative says something has the most of a quality: biggest, best, most holy. Example: “She is the tallest in the class.”',
    'It often ends in -τατος or -ιστος: ἔλαχιστος “least”. Greek often uses the plain or the comparative form where English would say “the most”.',
    ['comparative', 'adjective'],
  ),
  c(
    'negative',
    'A negative word says no or not: not, never, nobody. Example: “I did not go.”',
    'οὐ is the plain “not”, used for facts. μή is the “not” of wishes, commands and conditions. Two negatives together make the denial stronger; they do not cancel out.',
    ['particle', 'interrogative'],
  ),
  c(
    'interrogative',
    'Interrogative marks a word that asks a question: why, how, whether. Example: “Why did you go?”',
    'Greek marks a question with a question word, with οὐ or μή when it expects “yes” or “no”, or only by the tone of the reader. The oldest copies had no question mark.',
    ['interrogative pronoun', 'negative'],
  ),
  c(
    'crasis',
    'Crasis is two words squeezed into one, as English does with “can’t” for “cannot”. Part of one word is lost where they meet.',
    'The end of the first Greek word and the start of the second blend, marked by a small mark (’): καὶ ἐγώ becomes κἀγώ “and I”. Read it as the two words it holds.',
    ['conjunction', 'personal pronoun'],
  ),
  c(
    'middle significance',
    'A verb with middle significance has an ordinary-looking form but a middle meaning: the one acting does it for or on themselves. Example: “I wash” compared with “I wash myself”.',
    'The form does not look middle, but the sense is. Read it as a middle verb, where the doer takes a special interest in the action.',
    ['middle', 'active'],
  ),
  c(
    'poetic',
    'A poetic form is a word or spelling taken from poetry or lofty writing rather than everyday speech. Example: English “o’er” for “over”.',
    'It is rare in the New Testament, and often comes in a quotation. The meaning is the same as the ordinary word.',
    ['Attic form'],
  ),

  // cases
  c(
    'nominative',
    'The nominative case marks who or what does the action: the subject of the sentence. English shows it by word order. Example: in “The dog bit the man”, dog is the subject.',
    'The nominative is the form a noun is listed under in a dictionary. Because the ending shows the case, the subject can stand anywhere in the sentence. It also names what the subject is: “God is love”.',
    ['accusative', 'genitive', 'dative', 'vocative'],
  ),
  c(
    'genitive',
    'The genitive case shows belonging or source: of, from. English uses “of” or ’s. Example: “the house of my father” or “my father’s house”.',
    'Greek puts the noun in the genitive instead of using “of”: ὁ λόγος τοῦ θεοῦ is “the word of God”. Some prepositions also take the genitive, and then it can mean “from” or “about”.',
    ['nominative', 'dative', 'possessive pronoun'],
  ),
  c(
    'dative',
    'The dative case marks the one who receives something or for whom it is done: to, for. Example: in “She gave the child a book”, the child receives it (to the child).',
    'The Greek dative also covers “with” (the means: “by the sword”) and “in” a place or time. The word it goes with decides which meaning fits.',
    ['genitive', 'accusative', 'preposition'],
  ),
  c(
    'accusative',
    'The accusative case marks what an action is done to: the object. Example: in “The dog bit the man”, man is the object.',
    'Besides the object, it follows many prepositions to show motion toward, as εἰς “into”, and it measures time or distance: “for three days”.',
    ['nominative', 'dative', 'preposition'],
  ),
  c(
    'vocative',
    'The vocative case is for speaking straight to someone: calling their name or title. Example: “Lord, hear me!” Here Lord is the one addressed.',
    'The ending is often the same as the nominative, but some nouns change: κύριε “Lord!” comes from κύριος. A vocative is often set off by a comma and may follow the word ὦ “O”.',
    ['nominative', 'noun'],
  ),

  // numbers
  c(
    'singular',
    'Singular means one: one dog, one child. Example: “the book is” speaks of a single book.',
    'A singular noun takes singular endings, and its verb usually does too.',
    ['plural', 'neuter'],
  ),
  c(
    'plural',
    'Plural means more than one: dogs, children. Example: “the books are” speaks of several.',
    'Plural endings differ from the singular ones. The New Testament has no special form for exactly two. The verb shows the plural too: λύουσιν “they loose”.',
    ['singular', '3rd person'],
  ),

  // genders
  c(
    'masculine',
    'Masculine is one of the three groups nouns belong to. English notices gender only in words like he, she and it. Example: “he”, “king” and “brother” are masculine.',
    'Every Greek noun has a gender, and it is not always the sex: λόγος “word” is masculine. The article ὁ, and adjectives, match the noun’s gender.',
    ['feminine', 'neuter', 'article'],
  ),
  c(
    'feminine',
    'Feminine is one of the three groups nouns belong to. Example: “she”, “queen” and “sister” are feminine.',
    'ἡ is the feminine article. Many things are feminine in Greek: ἀγάπη “love”, ψυχή “soul”, ἡμέρα “day”. The article and adjectives must match.',
    ['masculine', 'neuter', 'article'],
  ),
  c(
    'neuter',
    'Neuter means neither male nor female, like English “it”. Example: “the book… it is open.”',
    'τό is the neuter article. Things like τέκνον “child” and πνεῦμα “spirit” are neuter. A neuter noun’s nominative and accusative are always the same.',
    ['masculine', 'feminine', 'article'],
  ),

  // persons
  c(
    '1st person',
    'First person is the speaker (I) or the speaker’s group (we). Example: “I read”, “we read”.',
    'The verb’s ending shows it, so ἐγώ “I” is only added for emphasis. λύω is “I loose”, and λύομεν is “we loose”.',
    ['2nd person', '3rd person', 'verb'],
  ),
  c(
    '2nd person',
    'Second person is the one spoken to: you. Example: “You read.”',
    'Greek endings show whether “you” is one person (λύεις) or several (λύετε). Our word “you” hides that difference, so look at the ending.',
    ['1st person', '3rd person', 'singular'],
  ),
  c(
    '3rd person',
    'Third person is someone or something spoken about: he, she, it, they. Example: “She reads.”',
    'The ending shows it: λύει is “he, she, it looses”. When a name or noun is the subject, the verb is in this form too.',
    ['1st person', '2nd person', 'nominative'],
  ),

  // tenses
  c(
    'present',
    'The present tense says what is happening now, or keeps happening. Example: “She reads” or “she is reading”.',
    'Greek tenses show the kind of action as much as the time. The present is the tense of an action going on or repeated: “keep believing”.',
    ['imperfect', 'aorist', 'perfect'],
  ),
  c(
    'imperfect',
    'The imperfect describes something that was going on, or used to happen, in the past. Example: “She was reading” or “she used to read”.',
    'It appears only in the indicative, usually with an ε added at the front: ἔλυον “I was loosing”. It paints the scene, where the aorist reports an event.',
    ['present', 'aorist', 'indicative'],
  ),
  c(
    'future',
    'The future tense says what will happen. Example: “She will read.”',
    'It usually shows a σ before the ending: λύσω “I will loose”. Its endings otherwise look like the present’s.',
    ['present', 'aorist'],
  ),
  c(
    'aorist',
    'The aorist (say AIR-ist) simply states that something happened, as one whole event, without saying how long it took. English uses the plain past. Example: “She read the letter.”',
    'It is the usual tense for telling a story. Only in the indicative does it point to the past, with an ε in front: ἔλυσα “I loosed”. In other moods it names the kind of action, not the time.',
    ['imperfect', 'perfect', 'second'],
  ),
  c(
    'perfect',
    'The perfect describes an action finished in the past whose result still stands now. Example: “She has read the letter”, and so she knows what it says.',
    'It is often marked by a doubled start to the word: λέλυκα “I have loosed”. It stresses the present result: γέγραπται “it stands written”.',
    ['aorist', 'pluperfect', 'present'],
  ),
  c(
    'pluperfect',
    'The pluperfect is the perfect moved back in time: an action finished whose result was in place at an earlier point. Example: “She had read the letter before he came.”',
    'It is rare in the New Testament. It is built like the perfect with an added ε: ἐλελύκειν “I had loosed”.',
    ['perfect', 'aorist'],
  ),

  // voices
  c(
    'active',
    'In the active voice the subject does the action. Example: in “The dog bit the man”, the dog does the biting.',
    'The active is the ordinary voice, and the one the dictionary form shows: λύω “I loose”.',
    ['middle', 'passive'],
  ),
  c(
    'middle',
    'In the middle voice the subject does the action with a special interest in it, often to or for itself. English has no real match. Example: “I wash” compared with “I wash myself”.',
    'Many verbs have a middle form: λούομαι “I wash myself”, αἰτοῦμαι “I ask for myself”. The context tells how much “self” to show in English.',
    ['active', 'passive', 'middle or passive'],
  ),
  c(
    'passive',
    'In the passive voice the subject receives the action. Example: “The man was bitten by the dog.” The man is the one bitten.',
    'The passive has its own endings in each tense: ἐλύθη “he was loosed”. The one who acts is often given with ὑπό and the genitive.',
    ['active', 'middle', 'genitive'],
  ),
  c(
    'middle or passive',
    'Some forms look the same for the middle and the passive, and the sentence decides which one it is. Example: “was washed” (passive) against “washed himself” (middle).',
    'In most tenses the middle and the passive share one set of endings: λύομαι is “I am loosed” and also “I loose for myself”.',
    ['middle', 'passive'],
  ),
  c(
    'middle deponent',
    'A deponent verb has a middle form but is meant as a plain action. The “for myself” feeling has worn away. Example: pretend English said “I arrive-myself” and meant only “I arrive”.',
    'Common ones are ἔρχομαι “I come”, δέχομαι “I receive”, πορεύομαι “I go”. Look them up under their middle form: no active form exists.',
    ['middle', 'active', 'passive deponent'],
  ),
  c(
    'passive deponent',
    'A deponent verb has a passive form but is meant as a plain action. Example: pretend English said “I was answered” and meant only “I answered”.',
    'The aorist passive form is used with an active sense: ἀπεκρίθη “he answered”. Translate it as an ordinary active verb.',
    ['passive', 'active', 'middle deponent'],
  ),
  c(
    'middle or passive deponent',
    'A deponent verb has forms that look both middle and passive, but is meant as a plain action. Example: pretend English said “I come-myself” and meant only “I come”.',
    'The form could be read either way, but the verb simply means the action: ἔρχομαι “I come”. Translate it as an ordinary active verb.',
    ['middle deponent', 'passive deponent', 'middle or passive'],
  ),
  c(
    'impersonal active',
    'An impersonal verb has no real person doing it. English fills the gap with “it”. Example: “It is raining”, “it is necessary”.',
    'δεῖ “it is necessary” and ἔξεστιν “it is permitted” are impersonal. They are always third person singular, and English supplies the “it”.',
    ['active', '3rd person', 'singular'],
  ),
  c(
    'no voice',
    'Some forms have no voice, because they only state a condition and nobody acts on anything. Example: English “is” and “seems”.',
    'The parsing gives such a form no voice. Most are forms of εἰμί “I am”: ἐστίν “is”, ἦν “was”. Read it as a plain statement and take its person and number from the ending.',
    ['active', 'verb'],
  ),

  // moods
  c(
    'indicative',
    'The indicative states a fact or asks a plain question. Example: “She reads.” “Does she read?”',
    'It is the ordinary mood for real things. Only here does the tense also show time: whether it is past, now or still to come.',
    ['subjunctive', 'imperative', 'present'],
  ),
  c(
    'imperative',
    'The imperative gives a command or a request. Example: “Read!” “Please sit.”',
    'Greek has commands for “you” and also for “let him/her”: λῦε “loose!”. A present command often means “keep doing it”, an aorist one “do it”.',
    ['indicative', 'subjunctive', '2nd person'],
  ),
  c(
    'subjunctive',
    'The subjunctive speaks of what may happen, or should: possibilities, purposes, wishes. English uses “may” or “would”. Example: “so that she may read”.',
    'It often follows ἵνα “so that” or ἐάν “if”: ἵνα λύῃ is “so that he may loose”. It is also used for “let us…”: λύωμεν.',
    ['indicative', 'optative', 'conditional'],
  ),
  c(
    'optative',
    'The optative expresses a wish or a faint possibility. Example: “May she be well!” or “if she should read”.',
    'It is rare in the New Testament, but common in older Greek. The best-known example is Paul’s μὴ γένοιτο “may it never be!”.',
    ['subjunctive', 'indicative'],
  ),
  c(
    'infinitive',
    'The infinitive names the action itself, with no one doing it: to read, to go. Example: “She wants to read.”',
    'It ends in -ειν or -αι, as λύειν “to loose”. With the article it works as a noun: τὸ λύειν “the loosing”. It has no person or number.',
    ['verb', 'participle', 'article'],
  ),
  c(
    'participle',
    'A participle is a verb used like an adjective: reading, written. It describes a noun. Example: “the reading girl”, “a book written long ago”.',
    'It is very common. It takes case, number and gender like an adjective but keeps tense and voice like a verb: ὁ λύων “the one loosing”. Translate it with “who”, “while” or “because”.',
    ['verb', 'adjective', 'infinitive'],
  ),
  c(
    'imperative-sense participle',
    'A participle used as if it were a command. Example: instead of “Be kind!”, a list of instructions reads “being kind to one another”.',
    'It is rare. A participle in a list of instructions, such as in Romans 12, can read as a command: translate it as one.',
    ['participle', 'imperative'],
  ),

  // words decodeParse writes itself
  c(
    'second',
    'Second marks an older, second way of building a tense. The meaning is the same as the usual one. Example: English “dived” and “dove”: different shapes, same sense.',
    'A second aorist is built differently from the usual one, with its own endings: ἔλαβον “I took”. Translate both the same way.',
    ['aorist', 'perfect'],
  ),
  c(
    'letter',
    'Here a letter is a single Greek letter used as a name or a number, not as a word. Example: Alpha.',
    'In Revelation 1:8 τὸ Α καὶ τὸ Ω is “the Alpha and the Omega”. Such a letter never changes its ending.',
    ['indeclinable', 'noun'],
  ),
  c(
    'indeclinable',
    'An indeclinable word has one fixed form and never changes its ending. Example: English “sheep” is the same for one or many.',
    'Names from Hebrew, like Ἀβραάμ, and some numbers do not change for case. Rely on the article and the rest of the sentence to tell their job.',
    ['noun', 'proper name', 'numeral'],
  ),
  c(
    'proper name',
    'A proper name is the name of one particular person or place: Paul, Rome. Example: in “Paul went to Rome”, both are proper names.',
    'Names from Hebrew often keep one form, while Greek ones change: Παῦλος, Παύλου. A name may be used with the article.',
    ['noun', 'indeclinable'],
  ),
  c(
    'numeral',
    'A numeral is a number word: one, two, third. Example: “three days”.',
    'εἷς “one”, δύο “two”, τρεῖς “three” and τέσσαρες “four” change for case and gender. Larger numbers, like δώδεκα “twelve”, never change.',
    ['indeclinable', 'adjective'],
  ),
  c(
    'possessor',
    'The possessor is whoever owns something. Example: in “Paul’s book”, Paul is the possessor.',
    'In a possessive word, the person and number shown first are the owner’s. The word’s own endings match the thing owned, not the owner.',
    ['possessive pronoun', 'genitive'],
  ),
]);

/** The entry for `term`, or undefined for a word that is no grammar term. */
export function conceptOf(term: string): GrammarConcept | undefined {
  return GRAMMAR_CONCEPTS[term];
}


// ---- Hebrew (mw-gdcyf98.12) ----
// The words of a Hebrew parsing (src/data/grammar/hebrew/terms.ts), each explained the same way and shown on the Grammar sheet of a Hebrew chapter: what it is with an English example, then how it shows in
// Biblical Hebrew, with a Hebrew form (the Greek note's twin). The two tables are apart because the languages share words ('singular', 'masculine') that mean the same thing differently written.
// tests/unit/hebrew-parse-terms.test.ts fails on a term without an entry, on an explanation over 60 words, a Hebrew note over 40 or with no Hebrew in it, and on a related term that has no entry.

export interface HebrewConcept {
  term: string;
  /** what it is and what it does in a sentence, with an English example: at most 60 words */
  explanation: string;
  /** how it shows in Biblical Hebrew, with a Hebrew form: at most 40 words */
  hebrew: string;
  /** terms worth reading next (each has an entry) */
  related: string[];
}

const h = (term: string, explanation: string, hebrew: string, related: string[]): [string, HebrewConcept] => [term, { term, explanation, hebrew, related }];

export const HEBREW_CONCEPTS: Record<string, HebrewConcept> = Object.fromEntries([
  // nouns
  h(
    'Noun',
    'A noun names a person, place, thing or idea: Paul, city, love. Example: in “The servant loves the master”, servant and master are nouns.',
    'A Hebrew noun is masculine or feminine, and singular, plural or dual: בַּיִת “house” is masculine singular. The table calls a name a proper noun.',
    ['masculine', 'feminine', 'singular'],
  ),
  h(
    'Adjective',
    'An adjective describes a noun: good, large, holy. Example: in “a good shepherd”, good is the adjective.',
    'A Hebrew adjective follows its noun and matches it in gender and number: יוֹם טוֹב is “a good day”, where טוֹב is masculine like יוֹם.',
    ['Noun', 'masculine', 'singular'],
  ),
  h(
    'masculine',
    'Masculine is one of the two genders of a noun. Example: French “le livre” is masculine. English has gender only in words like he, boy and father.',
    'Every Hebrew noun is masculine or feminine. A masculine noun has no ה or ת ending: יוֹם “day”. The words that go with it are masculine too.',
    ['feminine', 'common', 'Noun'],
  ),
  h(
    'feminine',
    'Feminine is one of the two genders of a noun. Example: French “la table” is feminine. English has gender only in words like she, girl and mother.',
    'A feminine Hebrew noun often ends in ה with a qamats before it, or in ת: בְּהֵמָה “livestock”. The words that go with it are feminine too.',
    ['masculine', 'common', 'Noun'],
  ),
  h(
    'common',
    'Common gender means one form serves for both masculine and feminine. Example: English “teacher” and “friend” fit a man or a woman.',
    'In the first person a Hebrew verb or pronoun has one form for a man or a woman: אֲנִי “I”. The table also calls a noun common when it takes either gender, such as אוֹר “light”.',
    ['masculine', 'feminine', 'first person'],
  ),
  h(
    'Number',
    'A number word counts: one, two, third. Example: “three days”.',
    'A Hebrew number word has a gender: אֶחָד “one” is masculine and אַחַת feminine. The table writes Number for a count, and ordinal for “first”, “second” and so on.',
    ['ordinal', 'singular', 'masculine'],
  ),
  h(
    'ordinal',
    'An ordinal number gives a place in a list: first, second, third. Example: “the third day”.',
    'A Hebrew ordinal from “second” on describes its noun: שֵׁנִי “second”, שְׁלִישִׁי “third”. It follows the noun and matches its gender: יוֹם שֵׁנִי “a second day”.',
    ['Number', 'Adjective'],
  ),
  h(
    'singular',
    'Singular means one. Example: “book” is singular and “books” is plural.',
    'A singular Hebrew noun has no plural ending: יוֹם “day”. A verb or an adjective that goes with it is singular too.',
    ['plural', 'dual', 'masculine'],
  ),
  h(
    'plural',
    'Plural means more than one. Example: “books” is the plural of “book”.',
    'A masculine Hebrew plural usually ends in ים: יָמִים “days”. A feminine plural usually ends in ות. A few plurals, such as אֱלֹהִים “God”, can mean one.',
    ['singular', 'dual', 'masculine'],
  ),
  h(
    'dual',
    'A dual means exactly two. Example: English keeps a trace of it in “both” and “a pair of scissors”.',
    'A Hebrew dual ends in ַיִם and names a pair: יָדַיִם “two hands”. שָׁמַיִם “heavens” has the ending, and so has מַיִם “water”, which is plural.',
    ['singular', 'plural'],
  ),
  h(
    'Article',
    'The article is the little word “the”. It points to something particular. Example: “the book” means a book you have in mind, while “a book” does not.',
    'Hebrew has only “the”, and it is the letter ה on the front of a noun: הָאָרֶץ “the earth”. There is no word for “a”, so אֶרֶץ alone is “earth” or “a land”.',
    ['determinate', 'Noun', 'proper'],
  ),
  h(
    'determinate',
    'A determinate noun is one that points to something particular. Example: “the book” is determinate; “a book” is not.',
    'The table marks a noun that has the article as determinate. מֶלֶךְ is “a king”; הַמֶּלֶךְ is “the king”, and determinate.',
    ['Article', 'proper'],
  ),
  h(
    'proper',
    'A proper name is the name of one particular person or place: Paul, Rome. Example: in “Paul went to Rome”, both are proper names.',
    'A Hebrew name needs no article: יוֹנָה “Jonah”. The table writes Noun - proper for it. A place such as נִינְוֵה “Nineveh” is a name too.',
    ['Noun', 'Article'],
  ),
  h(
    'construct',
    'A construct links two nouns where English would write “of”. Example: “the house of the king”. Hebrew changes the first noun instead of adding a word.',
    'Hebrew shortens the first noun and puts the second after it: פְּנֵי הַמָּיִם “the face of the waters”. The table writes construct after the noun’s number.',
    ['Noun', 'singular', 'plural'],
  ),
  h(
    'Pr',
    'Pr is the table’s short mark for a pronoun joined to the word before it. English joins a pronoun to a word only in speech: “gimme”, “lemme”.',
    'Hebrew writes a pronoun on the end of a word: אֵלָיו “to him”, אַרְצֶךָ “your country”. The table gives that pronoun as a second group, such as third person masculine singular.',
    ['Pronoun', 'third person', 'construct'],
  ),
  // pronouns
  h(
    'Pronoun',
    'A pronoun takes the place of a noun: I, you, he, she, it, we, they. Example: in “Mary said she was tired”, she stands for Mary.',
    'A Hebrew pronoun has person, gender and number: אֲנִי “I”, הוּא “he”, הֵם “they”. The table also calls זֶה “this” and אֲשֶׁר “which” pronouns.',
    ['first person', 'relative', 'Noun'],
  ),
  h(
    'first person',
    'First person is the one speaking: I, we. Example: “We went home” is in the first person.',
    'First person in Hebrew is the same for a man or a woman: אֲנִי “I”, נָתַתִּי “I have given”. The table writes it first person common.',
    ['second person', 'third person', 'common'],
  ),
  h(
    'second person',
    'Second person is the one spoken to: you. Example: “You are late” is in the second person.',
    'Second person in Hebrew shows gender: אַתָּה “you” to a man, אַתְּ “you” to a woman. A command is always second person: לֵךְ “go”.',
    ['first person', 'third person', 'Imperative'],
  ),
  h(
    'third person',
    'Third person is the one spoken about: he, she, it, they. Example: “They left” is in the third person.',
    'Third person in Hebrew shows gender and number: הוּא “he”, הִיא “she”, הֵם “they”. A story is told mostly in it: וַיִּקְרָא “and he called”.',
    ['first person', 'second person', 'masculine'],
  ),
  h(
    'relative',
    'A relative pronoun joins a clause to a noun: who, which, that. Example: in “the man who came”, who is the relative pronoun.',
    'Hebrew has one relative, אֲשֶׁר, for every gender and number. It stands right after the noun: הַמַּיִם אֲשֶׁר “the waters which”.',
    ['Pronoun', 'Noun'],
  ),
  // prepositions
  h(
    'Preposition',
    'A preposition links a noun to the rest of the sentence and tells where, when or how: in, to, with, from. Example: in “She sat by the river”, by is the preposition.',
    'A Hebrew preposition can be a word of its own, such as עַל “upon”, or one letter on the front of a noun. It can take a suffix: עָלָיו “upon him”.',
    ['Preposition-b', 'Preposition-l', 'Noun'],
  ),
  h(
    'Preposition-b',
    'This is a preposition written as the letter ב joined to the next word. Example: English “in” or “with”, but written as part of the noun.',
    'ב with a shewa is “in”, “with” or “by”: בְּרֵאשִׁית “in the beginning”. Before the article it is בַּ: בַּיּוֹם “in the day”.',
    ['Preposition', 'Preposition-k', 'Preposition-l'],
  ),
  h(
    'Preposition-k',
    'This is a preposition written as the letter כ joined to the next word, meaning “like” or “as”. Example: “like a lion”, with “like” joined to the noun.',
    'כ with a shewa is “like” or “as”: כִּדְמוּתֵנוּ “after our likeness”. Before the article it is כַּ.',
    ['Preposition', 'Preposition-b', 'Preposition-l'],
  ),
  h(
    'Preposition-l',
    'This is a preposition written as the letter ל joined to the next word, meaning “to” or “for”. Example: “to the city”, with “to” joined to the noun.',
    'ל with a shewa is “to” or “for”: לְמִינוֹ “according to its kind”. Before an infinitive it is “to”: לִבְרֹחַ “to flee”.',
    ['Preposition', 'Preposition-b', 'Preposition-k'],
  ),
  h(
    'Preposition-m',
    'This is a preposition written as the letter מ joined to the next word, meaning “from” or “out of”. Example: “from the city”.',
    'מִ or מֵ on the front of a noun is the short form of מִן “from”: מִתַּחַת “from under”, מֵעַל “from above”. It also means “than”.',
    ['Preposition', 'Preposition-l'],
  ),
  h(
    'Direct object marker',
    'The object of a verb is what it acts on. Example: in “She reads the book”, the book is the object. Some languages put a small word before it.',
    'Hebrew marks a definite object with אֵת or אֶת־: אֵת הַשָּׁמַיִם “the heavens”. It is not translated. With a suffix it is a pronoun: אֹתוֹ “him”.',
    ['Article', 'Pronoun', 'Verb'],
  ),
  h(
    'Conjunctive waw',
    'A conjunction is a small joining word: and, but. Example: in “I came, and he left”, and is the conjunction.',
    'The letter ו on the front of a word is “and”: וְרוּחַ “and spirit”. Waw is the name of the letter ו; the table calls it conjunctive when it joins.',
    ['Conjunction', 'Consecutive imperfect'],
  ),
  // verbs
  h(
    'Verb',
    'A verb says what someone does or what happens: run, think, is. Every sentence needs one. Example: in “She reads the letter”, reads is the verb.',
    'A Hebrew verb grows from a root of three consonants and shows its person, gender and number: בָּרָא “he created”. The table gives its stem first, then its form.',
    ['Qal', 'Perfect', 'Imperfect'],
  ),
  h(
    'Qal',
    'A stem is a pattern a verb is built on. English shows it a little: “rise” is the plain verb, and “raise” is to cause to rise.',
    'Qal means “light”. It is the simple stem, with no sense added: בָּרָא “he created”, קָרָא “he called”. Most Hebrew verbs are Qal.',
    ['Verb', 'Piel', 'Hifil'],
  ),
  h(
    'Perfect',
    'The perfect is a tense for an action seen as complete. Example: “I have finished” looks at the action as done.',
    'The Hebrew perfect shows the person in an ending: בָּרָא “he created”, שָׁרְצוּ “they teemed”. It is the usual form for the past.',
    ['Imperfect', 'Verb', 'Qal'],
  ),
  h(
    'Imperfect',
    'The imperfect is a tense for an action not seen as complete: going on, still to come, or possible. Example: “he will go”, “he may go”.',
    'The Hebrew imperfect shows the person in a prefix: יִהְיֶה “he will be”, נַעֲשֶׂה “we will make”. The same form can wish: יְהִי “let there be”.',
    ['Perfect', 'Jussive', 'Cohortative'],
  ),
  h(
    'Jussive',
    'A jussive is a wish or a command for someone else, in the third person. Example: “Let there be light.”',
    'The Hebrew jussive is a short imperfect: יְהִי “let there be”, shortened from יִהְיֶה “he will be”.',
    ['Imperfect', 'Cohortative', 'third person'],
  ),
  h(
    'Cohortative',
    'A cohortative urges oneself or one’s group on: let us. Example: “Let us go.”',
    'The Hebrew cohortative is a first person imperfect, often with ה on the end: נֹאבְדָה “let us perish”.',
    ['Imperfect', 'Jussive', 'first person'],
  ),
  h(
    'if contextual',
    'The table writes “if contextual” where a word can be read two ways and only the sentence settles which. Example: “we go” and “let us go” could be spelt alike.',
    'In Genesis 1:26 נַעֲשֶׂה can be “we will make” or “let us make”. The table calls it a cohortative if contextual: the sentence tells which.',
    ['Cohortative', 'Imperfect'],
  ),
  h(
    'Imperative',
    'The imperative gives a command. Example: “Go!” and “Sit down.”',
    'The Hebrew imperative is always second person, with gender and number: קוּם “get up!”, פְּרוּ “be fruitful!”. It has no prefix.',
    ['second person', 'Verb', 'Qal'],
  ),
  h(
    'Participle',
    'A participle is a verb used as a describing word, or as a noun. Example: “a running child”, “the one running”.',
    'A Hebrew participle has gender and number but no tense: הוֹלֵךְ “going”. With the article it is a noun: הָרֹמֵשׂ “the one that creeps”.',
    ['Verb', 'Adjective', 'Article'],
  ),
  h(
    'Infinitive',
    'The infinitive names an action with no one doing it. Example: “to run” in “I like to run”.',
    'Hebrew has two infinitives, the table’s Infinitive construct and Infinitive absolute. Neither shows a person: לִבְרֹחַ “to flee”.',
    ['Infinitive construct', 'Infinitive absolute', 'Verb'],
  ),
  h(
    'Infinitive construct',
    'The construct infinitive is the ordinary infinitive, the one that follows a preposition: “to run”, “in running”.',
    'The Hebrew construct infinitive follows a preposition, most often לְ: לִבְרֹחַ “to flee”, לִבְלֹעַ “to swallow”.',
    ['Infinitive', 'Infinitive absolute', 'Preposition-l'],
  ),
  h(
    'Infinitive absolute',
    'The absolute infinitive stands alone and strengthens a verb. English does it with a helper: “you surely will go”.',
    'The Hebrew absolute infinitive stands apart, often beside the same verb, to strengthen it: שָׁמוֹר תִּשְׁמְרוּ “you must keep”.',
    ['Infinitive', 'Infinitive construct', 'Verb'],
  ),
  h(
    'Consecutive imperfect',
    'A narrative tense joins one past action to the next: “and then … and then …”. Example: “He rose, and went, and saw.”',
    'In Hebrew, וַ on an imperfect, with a dagesh after it, tells a story in order: וַיִּקְרָא “and he called”, וַיַּרְא “and he saw”.',
    ['Conjunctive waw', 'Imperfect', 'Perfect'],
  ),
  h(
    'Conjunctive imperfect',
    'An imperfect joined to “and” as a wish, an aim or a result. Example: “Come, and let us go.”',
    'A וְ before an imperfect keeps the plain vowel: וְיִרְדּוּ “and let them rule”, וְנֵדְעָה “and let us know”. It is not the story form.',
    ['Consecutive imperfect', 'Imperfect', 'Conjunctive waw'],
  ),
  h(
    'Conjunctive perfect',
    'A perfect joined to “and” that carries on a future or repeated action. Example: “He will come, and he will tell.”',
    'A וְ before a perfect carries on what went before: וְהָיוּ “and let them be” in Genesis 1:14. It is often a future or a command.',
    ['Perfect', 'Consecutive imperfect', 'Conjunctive waw'],
  ),
  h(
    'Nifal',
    'The Niphal is the stem for what happens to the subject, or what it does to itself. Example: “the door opened”, beside “he opened the door”.',
    'The table spells the Niphal Nifal. Its perfect has נִ on the front: נִרְדָּם “fast asleep”. Its imperfect doubles the first root letter: יִקָּווּ “be gathered”.',
    ['Qal', 'Piel', 'Hifil'],
  ),
  h(
    'Piel',
    'The Piel is the stem for doing something strongly or often. Example: English “shatter” beside “break”, or “slash” beside “cut”.',
    'The Piel doubles the middle root letter: מְרַחֶפֶת “hovering”, חִשְּׁבָה “she thought”. Genesis 1:22 has וַיְבָרֶךְ “and he blessed”.',
    ['Qal', 'Pual', 'Hifil'],
  ),
  h(
    'Pual',
    'The Pual is the stem for what is done to someone by a Piel action: it is the passive of the Piel. Example: “broken”, beside “he broke it”.',
    'The Pual doubles the middle root letter like the Piel, with a qubuts under the first: קֻטַּל “he was killed”. Neither Genesis 1 nor Jonah 1 has one.',
    ['Piel', 'Qal'],
  ),
  h(
    'Hifil',
    'The Hiphil is the stem for causing something to happen. Example: “he made him fall”, where the plain verb is “he fell”.',
    'The table spells it Hifil. It has הִ or הֵ on the front: הֵטִיל “he hurled”, הִגִּיד “he told”. Its participle begins with מַ: מַבְדִּיל “separating”.',
    ['Qal', 'Hofal', 'Piel'],
  ),
  h(
    'Hofal',
    'The Hophal is the stem for what a Hiphil action does to someone: its passive. Example: “he was made to fall”.',
    'The table spells it Hofal. It has הָ or הֻ on the front: הֻשְׁלַךְ “he was thrown”. Neither Genesis 1 nor Jonah 1 has one.',
    ['Hifil', 'Qal'],
  ),
  h(
    'Hitpael',
    'The Hithpael is the stem for doing something to oneself, or to each other. Example: “he washed himself”.',
    'The table spells it Hitpael. It has הִתְ on the front and a doubled middle letter: יִתְעַשֵּׁת “he will take thought”.',
    ['Qal', 'Piel', 'Nifal'],
  ),
  h(
    'Nithpael',
    'The Nithpael is a rare stem that joins the marks of two others. Example: no English verb does the same.',
    'Its mark is נִתְ on the front, a rare join of the Niphal’s נִ and the Hithpael’s הִתְ. Only a few words of the Old Testament are parsed so.',
    ['Nifal', 'Hitpael'],
  ),
  // joiners
  h(
    'Conjunction',
    'A conjunction is a small joining word: and, but, because. Example: in “I came, but he left”, but is the conjunction.',
    'Besides ו “and”, Hebrew has small joiners such as כִּי “because” or “that” and אִם “if”. They stand at the start of a clause.',
    ['Conjunctive waw', 'Adverb'],
  ),
  h(
    'Adverb',
    'An adverb tells how, when or where something happens: quickly, now, here. Example: in “She ran quickly”, quickly is the adverb.',
    'Hebrew adverbs are often small words, such as כֵּן “so”, מְאֹד “very” and אוּלַי “perhaps”: וְהִנֵּה־טוֹב מְאֹד “and behold, very good”.',
    ['Conjunction', 'Interjection', 'Negative particle'],
  ),
  h(
    'Interjection',
    'An interjection is a word thrown in to call attention or show feeling: oh, look, alas. Example: “Look, a bird!”',
    'Hebrew הִנֵּה “behold” calls attention to what follows: הִנֵּה נָתַתִּי “behold, I have given”. נָא “please” softens a request.',
    ['Adverb', 'Conjunction'],
  ),
  h(
    'Negative particle',
    'A negative particle says no: not, never. Example: in “I do not know”, not is the negative particle.',
    'Hebrew לֹא “not” denies a statement, and אַל “do not” denies a wish: אַל־נֹאבְדָה “let us not perish”. Both stand right before the verb.',
    ['Adverb', 'Imperfect'],
  ),
  h(
    'Interrogative',
    'An interrogative word asks a question: who, what, where, why. Example: “Where are you going?”',
    'Hebrew has מִי “who”, מָה “what” and אַיִן “where”, and each can take a prefix: לְמִי “to whom”. מַה־זֹּאת עָשִׂיתָ is “what is this you have done?”',
    ['Pronoun', 'Preposition-l'],
  ),
]);

/** The Hebrew entry for `term` (a Hebrew parsing term, hebrew/terms.ts), or undefined for a word that is no such term. */
export function hebrewConceptOf(term: string): HebrewConcept | undefined {
  return Object.hasOwn(HEBREW_CONCEPTS, term) ? HEBREW_CONCEPTS[term] : undefined;
}
