// src/ipa/marked.tsx — a lesson's Greek or Hebrew in the type of its script (mw-gdcyf98.24): Greek in the reading face, Hebrew right to left in the bundled Hebrew face (.script-he), marked
// with its language so the voice and the font find it. The course draws every letter entry and every word through it.
import type { ReactNode } from 'react';
import { markedFor } from '../ui/GreekMarked';
import type { CourseLanguage } from './course';

export const marked = (language: CourseLanguage, text: string): ReactNode => markedFor(language === 'he' ? 'hbo' : 'grc', text);
