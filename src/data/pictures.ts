// src/data/pictures.ts — the memory pictures: a small hand-drawn SVG for a word, in public/pictures.
// The key is the word's headword as the store keeps it (src/data/lemma.ts); a word with no entry has no
// picture and shows none. docs/pictures.md says which seed words have none, and how to add one.
import { normaliseHeadword } from './lemma';

export const PICTURES: Readonly<Record<string, string>> = {
  "Ἀβραάμ": "abraam.svg",
  "ἀγαθός": "agathos.svg",
  "ἀγαπάω": "agapao.svg",
  "ἄγγελος": "angelos.svg",
  "ἀδελφός": "adelphos.svg",
  "ἀκούω": "akouo.svg",
  "ἀλλήλων": "allelon.svg",
  "ἄνθρωπος": "anthropos.svg",
  "ἀπόστολος": "apostolos.svg",
  "ἄρτος": "artos.svg",
  "βαπτίζω": "baptizo.svg",
  "βλέπω": "blepo.svg",
  "γεννάω": "gennao.svg",
  "γραμματεύς": "grammateus.svg",
  "γράφω": "grapho.svg",
  "Δαυίδ": "dauid.svg",
  "διδάσκαλος": "didaskalos.svg",
  "δόξα": "doxa.svg",
  "δοῦλος": "doulos.svg",
  "δώδεκα": "dodeka.svg",
  "ἐγώ": "ego.svg",
  "εἰ": "ei.svg",
  "εἰμί": "eimi.svg",
  "εἶπεν": "eipen.svg",
  "ἐκ": "ek.svg",
  "ἐν": "en.svg",
  "ἐξουσία": "exousia.svg",
  "εὐαγγελίζω": "euangelizo.svg",
  "ἡμεῖς": "hemeis.svg",
  "θέλω": "thelo.svg",
  "θεός": "theos.svg",
  "Ἰησοῦς": "iesous.svg",
  "Ἰσραήλ": "israel.svg",
  "καί": "kai.svg",
  "καλέω": "kaleo.svg",
  "κόσμος": "kosmos.svg",
  "κύριος": "kyrios.svg",
  "λέγω": "lego.svg",
  "λόγος": "logos.svg",
  "λύω": "lyo.svg",
  "μαθητής": "mathetes.svg",
  "μᾶλλον": "mallon.svg",
  "οὐ": "ou.svg",
  "οὐρανός": "ouranos.svg",
  "Παῦλος": "paulos.svg",
  "πιστεύω": "pisteuo.svg",
  "ποιέω": "poieo.svg",
  "σύ": "sy.svg",
  "υἱός": "huios.svg",
  "ὑμεῖς": "hymeis.svg",
  "Φαρισαῖος": "pharisaios.svg",
  "Χριστός": "christos.svg",
};

/** The picture file for a headword (or a BMA lemma line), or undefined when the word has none. */
export function pictureFile(lemma: string): string | undefined {
  return PICTURES[normaliseHeadword(lemma)];
}

/** Where the app serves the picture from, or undefined when the word has none. */
export function pictureUrl(lemma: string): string | undefined {
  const file = pictureFile(lemma);
  return file === undefined ? undefined : `/pictures/${file}`;
}
