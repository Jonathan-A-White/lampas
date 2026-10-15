/** Whether `text` is past `max` as it would be sent (trimmed). A box with a limit never cuts a paste: it keeps the text and turns its Send off (src/ui/LengthNote.tsx). */
export const isTooLong = (text: string, max: number): boolean => text.trim().length > max;
