// src/settings/entries/variants.ts — the registry entry of the offer of lessons on a variant (SETTINGS slot 310, src/settings/entry.ts).
import { setVariantLessonsOffer } from '../../data/repositories';
import { variantLessonsOfferSetting } from '../definitions/variants';
import { fromDefinition, slotted } from '../entry';

export const variantLessonsOfferSlot = slotted(310, { ...fromDefinition(variantLessonsOfferSetting), write: async (value) => setVariantLessonsOffer(variantLessonsOfferSetting.parse(value)) });
