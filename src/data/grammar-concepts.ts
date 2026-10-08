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
    'ἐγώ is “I”, σύ “you”, αὐτός “he, it”. A Greek verb already shows who acts, so these words are added mostly for emphasis. αὐτός also means “same” or “himself”.',
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
    'Some pronouns can ask a question or match one thing to another, and the sentence decides which. Example: “How many came?” asks; “as many as came” matches.',
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
    'Greek marks a question with a question word, with οὐ or μή when it expects “yes” or “no”, or only by tone of voice. The oldest copies had no question mark.',
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
    'Greek puts the noun in the genitive instead of using “of”: ὁ λόγος τοῦ θεοῦ is “the word of God”. Some prepositions and verbs also take the genitive, and then it can mean “from” or “about”.',
    ['nominative', 'dative', 'possessive pronoun'],
  ),
  c(
    'dative',
    'The dative case marks the one who receives something or for whom it is done: to, for. Example: in “She gave the child a book”, the child receives it (to the child).',
    'The Greek dative also covers “with” (the means: “by the sword”) and “in” a place or time. The verb or preposition it goes with decides which meaning fits.',
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
    'A singular noun takes singular endings, and its verb usually does too. A neuter plural subject, however, often takes a singular verb.',
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
    'It appears only in the indicative, usually with an ε added before the stem: ἔλυον “I was loosing”. It paints the scene, where the aorist reports an event.',
    ['present', 'aorist', 'indicative'],
  ),
  c(
    'future',
    'The future tense says what will happen. Example: “She will read.”',
    'It usually shows a σ after the stem: λύσω “I will loose”. Its endings otherwise look like the present’s.',
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
    'It is often marked by a doubled start of the stem: λέλυκα “I have loosed”. It stresses the present result: γέγραπται “it stands written”.',
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
    'Some forms look the same for the middle and the passive, and the sentence decides which one it is. Example: “was washed” (passive) or “washed himself” (middle).',
    'In the present, imperfect and perfect, the middle and the passive share one set of endings: λύομαι is “I am loosed” or “I loose for myself”.',
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
    'A deponent verb has middle or passive forms, but is meant as a plain action. Example: pretend English said “I come-myself” and meant only “I come”.',
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
    'A few verb forms have no voice at all, because they only state a condition and nobody acts on anything. Example: English “is” and “seems”.',
    'The parsing does not name a voice for such a form. Read it as a plain statement and take its person and number from the ending.',
    ['active', 'verb'],
  ),

  // moods
  c(
    'indicative',
    'The indicative states a fact or asks a plain question. Example: “She reads.” “Does she read?”',
    'It is the ordinary mood for real things. Only here does the tense also show time: past, present or future.',
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
    'It is rare in the New Testament, but common in older Greek. The best-known case is Paul’s μὴ γένοιτο “may it never be!”.',
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
    'A second aorist uses a different stem and endings from the first: ἔλαβον “I took”. Translate both the same way.',
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
    'Names from Hebrew, like Ἀβραάμ, and some numbers do not change for case. Rely on the article and the verb to tell their job in the sentence.',
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

