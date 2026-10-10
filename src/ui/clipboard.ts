// src/ui/clipboard.ts — put text on the phone's clipboard: the modern API first, the old way for a page that refuses it. Used by Copy link
// (LinkActions.tsx) and Copy on an exchange (src/share/CopyExchange.tsx).

/** The clipboard through the old way, for a page the modern API refuses. */
function copyOld(text: string): boolean {
  if (typeof document.execCommand !== 'function') return false;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyOld(text);
  }
}
