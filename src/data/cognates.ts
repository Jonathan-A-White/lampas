// src/data/cognates.ts — the English cousin of a Greek word (mw-5r3p30.988, a reader's feedback of 2026-11-02: "new Greek words introduced with a real English cognate, like
// peri- in perimeter, to help memory"). A table written in advance, keyed by the lexicon's lemma (NFC), for the commonest New Testament words that have one: the English word,
// the Greek piece the two share and a short plain line saying what the English word means, so the link shows. A word earns an entry only when the English word really comes
// from the Greek (a derivation any etymological dictionary gives, or a Greek word English borrowed whole): never a sound-alike, never a folk etymology, never a word whose
// link is only a guess. A word with no entry has none and shows none, and the hook is an English word, so none is shown when the app's language is not English.
// tests/unit/cognates.test.tsx checks every key against the lexicon. src/WordCognate.tsx draws it on the teach sheet and the word sheet.
import { lexiconLemmas, normaliseHeadword } from './lemma';

export interface Cognate {
  /** the English word: 'perimeter' */
  english: string;
  /** the Greek piece the two share, a stem or prefix written with a hyphen: 'περι-' */
  piece: string;
  /** what the English word means, in plain words: 'the distance around' */
  line: string;
}

export const COGNATES: Readonly<Record<string, Cognate>> = {
  // Prepositions: the prefixes English has taken whole.
  'περί': { english: 'perimeter', piece: 'περι-', line: 'the distance around' },
  'διά': { english: 'diameter', piece: 'δια-', line: 'the measure straight across, through the middle' },
  'ἀπό': { english: 'apocalypse', piece: 'ἀπο-', line: 'an uncovering, the cover taken away' },
  'κατά': { english: 'catastrophe', piece: 'κατα-', line: 'a turning down, a sudden disaster' },
  'μετά': { english: 'metamorphosis', piece: 'μετα-', line: 'a change of shape, as a caterpillar into a moth' },
  'ἐπί': { english: 'epidermis', piece: 'ἐπι-', line: 'the skin on top, the outer layer' },
  'ὑπό': { english: 'hypodermic', piece: 'ὑπο-', line: 'under the skin, where a needle goes' },
  'ὑπέρ': { english: 'hyperactive', piece: 'ὑπερ-', line: 'over-active, beyond the usual' },
  'παρά': { english: 'paradox', piece: 'παρα-', line: 'a saying beside what is expected' },
  'σύν': { english: 'symphony', piece: 'συν-', line: 'sounds put together' },
  'πρό': { english: 'prologue', piece: 'προ-', line: 'words spoken before the rest' },
  'ἐκ': { english: 'ecstasy', piece: 'ἐκ-', line: 'a standing outside yourself' },
  'πᾶς': { english: 'pandemic', piece: 'παν-', line: 'touching all the people, as a disease can' },

  // God, the Lord, the people of God.
  'θεός': { english: 'theology', piece: 'θεο-', line: 'the study of God' },
  'κύριος': { english: 'Kyrie', piece: 'κυρι-', line: "the 'Lord, have mercy' of church prayer" },
  'Χριστός': { english: 'Christ', piece: 'Χριστ-', line: 'the Greek word itself, the Anointed One' },
  'ἄγγελος': { english: 'angel', piece: 'ἀγγελ-', line: 'the Greek word itself, a messenger' },
  'ἀπόστολος': { english: 'apostle', piece: 'ἀποστολ-', line: 'the Greek word itself, one sent out' },
  'προφήτης': { english: 'prophet', piece: 'προφητ-', line: 'the Greek word itself, one who speaks for God' },
  'ἅγιος': { english: 'hagiography', piece: 'ἁγι-', line: 'the writing of the lives of holy people' },
  'ἀγάπη': { english: 'agape', piece: 'ἀγαπ-', line: 'the Greek word itself, kept for self-giving love' },
  'χάρις': { english: 'charisma', piece: 'χαρ-', line: 'a gift of grace that wins people' },
  'βαπτίζω': { english: 'baptize', piece: 'βαπτιζ-', line: 'the Greek word itself, to dip' },
  'δαιμόνιον': { english: 'demon', piece: 'δαιμον-', line: 'the Greek word, by way of Latin' },
  'θρόνος': { english: 'throne', piece: 'θρον-', line: 'the Greek word, a seat of honour, by way of Latin' },
  'συναγωγή': { english: 'synagogue', piece: 'συναγωγ-', line: 'the Greek word itself, a gathering place' },
  'παραβολή': { english: 'parable', piece: 'παραβολ-', line: 'a story set beside a truth' },
  'ἐκκλησία': { english: 'ecclesiastical', piece: 'ἐκκλησι-', line: 'of the church, the assembly' },
  'εὐαγγέλιον': { english: 'evangelical', piece: 'εὐαγγελ-', line: 'of the good news' },
  'εὐαγγελίζομαι': { english: 'evangelize', piece: 'εὐαγγελιζ-', line: 'to bring the good news' },
  'μαρτυρέω': { english: 'martyr', piece: 'μαρτυρ-', line: 'a witness, then one who dies for the faith' },
  'παρακαλέω': { english: 'paraclete', piece: 'παρακλητ-', line: 'one called alongside to help' },
  'πρεσβύτερος': { english: 'Presbyterian', piece: 'πρεσβυτερ-', line: 'a church led by its elders' },
  'λαός': { english: 'laity', piece: 'λαϊκ-', line: "the ordinary people of a church, not its clergy" },
  'ἀρχιερεύς': { english: 'archangel', piece: 'ἀρχι-', line: 'a chief angel; ἀρχι- means chief' },
  'κηρύσσω': { english: 'kerygma', piece: 'κηρυγμ-', line: "the early church's preaching of the good news" },
  'ἔσχατος': { english: 'eschatology', piece: 'ἐσχατ-', line: 'the study of the last things' },
  'ἀνίστημι': { english: 'Anastasia', piece: 'ἀναστ-', line: 'a girl\'s name that means resurrection' },
  'ἀπολλύω': { english: 'Apollyon', piece: 'ἀπολλυ-', line: 'the Destroyer of Revelation 9:11' },
  'εἰρήνη': { english: 'Irene', piece: 'εἰρην-', line: "a woman's name that means peace" },

  // Speaking, writing, knowing.
  'λόγος': { english: 'logic', piece: 'λογ-', line: 'reasoning, the order of words and thoughts' },
  'λέγω': { english: 'lexicon', piece: 'λεξ-', line: 'a book of words, a dictionary' },
  'φημί': { english: 'euphemism', piece: 'φημ-', line: 'good speech, a kind word for a hard thing' },
  'γράφω': { english: 'autograph', piece: 'γραφ-', line: 'something written in your own hand' },
  'γραφή': { english: 'paragraph', piece: 'γραφ-', line: 'a block of writing, first a mark written beside the text' },
  'γραμματεύς': { english: 'grammar', piece: 'γραμμ-', line: 'the rules of letters and writing' },
  'καλός': { english: 'calligraphy', piece: 'καλ-', line: 'beautiful handwriting' },
  'ὄνομα': { english: 'onomatopoeia', piece: 'ὀνοματ-', line: 'a word made to sound like what it names' },
  'λαλέω': { english: 'glossolalia', piece: 'λαλ-', line: 'speaking in tongues' },
  'γλῶσσα': { english: 'polyglot', piece: 'γλωσσ-', line: 'someone who speaks many tongues' },
  'ἀκούω': { english: 'acoustic', piece: 'ἀκου-', line: 'of hearing and sound' },
  'φωνή': { english: 'telephone', piece: 'φων-', line: 'a voice from far off' },
  'κακός': { english: 'cacophony', piece: 'κακ-', line: 'a harsh, ugly sound' },
  'διδάσκω': { english: 'didactic', piece: 'διδακ-', line: 'meant to teach' },
  'μαθητής': { english: 'mathematics', piece: 'μαθ-', line: 'what is learned' },
  'γινώσκω': { english: 'agnostic', piece: 'γνω-', line: 'someone who claims not to know' },
  'δοκέω': { english: 'dogma', piece: 'δογμ-', line: 'a belief laid down as what seems right' },
  'δόξα': { english: 'doxology', piece: 'δοξ-', line: 'words of praise to the glory of God' },
  'θεωρέω': { english: 'theory', piece: 'θεωρ-', line: 'a way of looking at things, a view' },
  'σοφία': { english: 'philosophy', piece: 'σοφ-', line: 'the love of wisdom' },
  'σημεῖον': { english: 'semiotics', piece: 'σημει-', line: 'the study of signs' },
  'φανερόω': { english: 'phenomenon', piece: 'φαν-', line: 'a thing that shows itself' },
  'ἀλλήλων': { english: 'parallel', piece: 'ἀλλήλ-', line: 'lines side by side, beside one another' },
  'ἄλλος': { english: 'allegory', piece: 'ἀλλ-', line: 'saying one thing to mean another' },
  'ἕτερος': { english: 'heterogeneous', piece: 'ἑτερ-', line: 'made of different kinds' },
  'φέρω': { english: 'metaphor', piece: 'φορ-', line: 'carrying a meaning across to another thing' },
  'ἐγώ': { english: 'ego', piece: 'ἐγω-', line: "the same word for 'I', in Latin and English" },
  'ποιέω': { english: 'poem', piece: 'ποι-', line: 'a thing made with words' },

  // People, body, mind.
  'ἄνθρωπος': { english: 'anthropology', piece: 'ἀνθρωπο-', line: 'the study of human beings' },
  'ἀνήρ': { english: 'android', piece: 'ἀνδρ-', line: 'a robot made in the shape of a man' },
  'γυνή': { english: 'gynecology', piece: 'γυναικ-', line: "the care of women's health" },
  'παιδίον': { english: 'pediatrician', piece: 'παιδ-', line: 'a doctor of children' },
  'ἄγω': { english: 'pedagogue', piece: 'ἀγωγ-', line: 'once a slave who led a child to school, now a teacher' },
  'ἀδελφός': { english: 'Philadelphia', piece: 'ἀδελφ-', line: 'the city of brotherly love' },
  'πατήρ': { english: 'patriarch', piece: 'πατρι-', line: 'a father-ruler of a family or a people' },
  'μήτηρ': { english: 'metropolis', piece: 'μητρ-', line: 'the mother-city of a region' },
  'καρδία': { english: 'cardiac', piece: 'καρδι-', line: 'of the heart' },
  'κεφαλή': { english: 'cephalic', piece: 'κεφαλ-', line: 'of the head' },
  'χείρ': { english: 'chiropractor', piece: 'χειρ-', line: 'someone who works with the hands' },
  'πούς': { english: 'podiatrist', piece: 'ποδ-', line: 'a doctor of the foot' },
  'ὀφθαλμός': { english: 'ophthalmologist', piece: 'ὀφθαλμ-', line: 'a doctor of the eye' },
  'στόμα': { english: 'stomach', piece: 'στομ-', line: 'from the Greek for mouth, first the throat, then the stomach' },
  'αἷμα': { english: 'hemorrhage', piece: 'αἱμ-', line: 'a heavy flow of blood' },
  'σῶμα': { english: 'somatic', piece: 'σωματ-', line: 'of the body' },
  'σάρξ': { english: 'sarcophagus', piece: 'σαρκ-', line: "'flesh-eater', a stone coffin" },
  'φαγεῖν': { english: 'phagocyte', piece: 'φαγ-', line: 'a cell that eats other cells' },
  'ψυχή': { english: 'psychology', piece: 'ψυχ-', line: 'the study of the mind and soul' },
  'ζωή': { english: 'zoology', piece: 'ζω-', line: 'the study of living things' },
  'νεκρός': { english: 'necropolis', piece: 'νεκρ-', line: 'a city of the dead' },
  'θάνατος': { english: 'euthanasia', piece: 'θανατ-', line: 'an easy death, from the Greek for good and death' },
  'φοβέω': { english: 'phobia', piece: 'φοβ-', line: 'a deep fear of something' },
  'πίπτω': { english: 'symptom', piece: 'πτω-', line: 'what falls in with a disease, a sign of it' },
  'πίνω': { english: 'symposium', piece: 'πο-', line: 'a drinking together, then a gathering to talk' },
  'ἀκολουθέω': { english: 'acolyte', piece: 'ἀκολουθ-', line: 'a helper who follows and serves at worship' },
  'ἔρημος': { english: 'hermit', piece: 'ἐρημ-', line: 'someone who lives alone in the desert' },
  'φυλακή': { english: 'prophylactic', piece: 'φυλακ-', line: 'something that guards against harm beforehand' },
  'δεξιός': { english: 'dexterity', piece: 'δεξ-', line: 'skill, as of the right hand' },

  // The world, the city, the house.
  'γῆ': { english: 'geography', piece: 'γεω-', line: 'writing about the earth' },
  'οὐρανός': { english: 'Uranus', piece: 'οὐρανο-', line: 'the planet named for the god of the sky' },
  'κόσμος': { english: 'cosmos', piece: 'κοσμ-', line: 'the universe seen as ordered, not a mess' },
  'πόλις': { english: 'politics', piece: 'πολι-', line: 'the business of the city' },
  'οἶκος': { english: 'economy', piece: 'οἰκ-', line: 'the management of a household' },
  'οἰκία': { english: 'ecology', piece: 'οἰκ-', line: 'the study of the home of living things' },
  'ἔθνος': { english: 'ethnic', piece: 'ἐθν-', line: 'of a nation or a people' },
  'τόπος': { english: 'topography', piece: 'τοπ-', line: 'the shape of a place: its hills and rivers' },
  'ὁδός': { english: 'exodus', piece: 'ὁδ-', line: 'the way out, as Israel left Egypt' },
  'μέσος': { english: 'Mesopotamia', piece: 'μεσ-', line: 'the land between the rivers' },
  'ἱερόν': { english: 'hieroglyph', piece: 'ἱερ-', line: 'sacred carving, the old Egyptian signs' },
  'λίθος': { english: 'monolith', piece: 'λιθ-', line: 'a single great stone' },
  'ὕδωρ': { english: 'hydrate', piece: 'ὑδρ-', line: 'to add water' },
  'πῦρ': { english: 'pyre', piece: 'πυρ-', line: 'a pile of wood built to be burned' },
  'φῶς': { english: 'photograph', piece: 'φωτ-', line: 'a picture drawn by light' },
  'σπείρω': { english: 'sporadic', piece: 'σπορ-', line: 'scattered here and there, like sown seed' },
  'βασιλεύς': { english: 'basilica', piece: 'βασιλ-', line: "first a king's hall, then a large church" },
  'ἀρχή': { english: 'monarchy', piece: 'ἀρχ-', line: 'the rule of one' },
  'νόμος': { english: 'autonomy', piece: 'νομ-', line: 'ruling yourself by your own law' },
  'κρατέω': { english: 'democracy', piece: 'κρατ-', line: "rule by the people, the people's power" },
  'κρίνω': { english: 'critic', piece: 'κριτ-', line: 'one who judges' },
  'κρίσις': { english: 'crisis', piece: 'κρισ-', line: 'a turning point, when judgment must be made' },

  // Time and number.
  'ἡμέρα': { english: 'ephemeral', piece: 'ἡμερ-', line: 'lasting only a day' },
  'ὥρα': { english: 'hour', piece: 'ὡρ-', line: 'the same word, by way of Latin and French' },
  'χρόνος': { english: 'chronology', piece: 'χρον-', line: 'the order of events in time' },
  'αἰών': { english: 'eon', piece: 'αἰων-', line: 'an age, a very long stretch of time' },
  'δύο': { english: 'dyad', piece: 'δυ-', line: 'a pair, two things together' },
  'τρεῖς': { english: 'trilogy', piece: 'τρι-', line: 'three works that belong together' },
  'ἑπτά': { english: 'heptagon', piece: 'ἑπτα-', line: 'a shape with seven angles' },
  'δώδεκα': { english: 'dodecagon', piece: 'δωδεκα-', line: 'a shape with twelve angles' },
  'πρῶτος': { english: 'prototype', piece: 'πρωτ-', line: 'the first model of something' },
  'μέγας': { english: 'megaphone', piece: 'μεγα-', line: 'a big voice, a device to carry the voice' },
  'πολύς': { english: 'polygon', piece: 'πολυ-', line: 'a shape with many angles' },
  'μόνον': { english: 'monologue', piece: 'μον-', line: 'one person speaking alone' },
  'ὅλος': { english: 'catholic', piece: 'ὁλ-', line: 'including everyone, from the Greek for according to the whole' },
  'ἴδιος': { english: 'idiom', piece: 'ἰδι-', line: 'a phrase with its own special meaning' },
  'ὁράω': { english: 'panorama', piece: 'ὁρα-', line: 'a view of everything' },
  'γίνομαι': { english: 'genesis', piece: 'γεν-', line: 'a coming into being, the origin' },
  'γεννάω': { english: 'genetic', piece: 'γεν-', line: 'to do with birth and inheritance' },
  'ἵστημι': { english: 'static', piece: 'στα-', line: 'standing still, not moving' },
  'δίδωμι': { english: 'antidote', piece: 'δο-', line: 'something given against a poison' },
  'τίθημι': { english: 'thesis', piece: 'θε-', line: 'a position put down and defended' },
  'δύναμαι': { english: 'dynamic', piece: 'δυνα-', line: 'full of power and movement' },
  'δύναμις': { english: 'dynamite', piece: 'δυναμ-', line: 'an explosive named from the Greek for power' },
  'ἔργον': { english: 'energy', piece: 'ἐργ-', line: 'work within, the power to do work' },
  'βάλλω': { english: 'ballistic', piece: 'βαλ-', line: 'to do with things thrown' },
  'λαμβάνω': { english: 'syllable', piece: 'λαβ-', line: 'sounds taken together in one beat' },
  'ἔξω': { english: 'exoskeleton', piece: 'ἐξω-', line: 'a skeleton on the outside' },
};

/** Whether the app speaks English: the hook of a cognate is an English word, so in another language none is shown. A page that names no language is English (index.html says 'en'). */
export const isEnglish = (language: string): boolean => language === '' || /^en(?:[-_]|$)/i.test(language);

/** The language the app is drawn in. Today only English, index.html's lang; a language setting would write the same attribute. */
export const appLanguage = (): string => (typeof document === 'undefined' ? 'en' : document.documentElement.lang);

/** The English cousin of a headword, a lexicon lemma or a BMA lemma line ('ἄνθρωπος, -ου, ὁ'), or undefined when it has none or `language` is not English. */
export function cognateOf(lemma: string, language: string = appLanguage()): Cognate | undefined {
  if (!isEnglish(language)) return undefined;
  const headword = normaliseHeadword(lemma);
  if (!headword) return undefined;
  for (const l of lexiconLemmas(headword)) {
    if (Object.hasOwn(COGNATES, l)) return COGNATES[l];
  }
  return undefined;
}
