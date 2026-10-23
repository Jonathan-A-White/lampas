// src/ui/readText.ts — the text of a file he picked (Memory > Import, Library > Import): File.text() where the browser has it, a FileReader where it does not (jsdom's older File).
export function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
