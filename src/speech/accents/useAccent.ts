// src/speech/accents/useAccent.ts — a screen that draws a sound hint calls this so it draws again when the accent is chosen (the saved choice is read a
// moment after start, and the tutor may change it from a Talk sheet that is open over the screen).
import { useSyncExternalStore } from 'react';
import { chosenAccent, onAccentChosen } from './index';
import type { EnglishAccent } from './types';

export const useAccent = (): EnglishAccent => useSyncExternalStore(onAccentChosen, chosenAccent);
