// src/reader/pageSnapshot.ts — a picture of one page of Turn pages, for the page turn to draw (src/reader/pageTurn.ts, mw-5r3p30.621). The browser gives a
// page no picture of itself, so it is drawn here from the layout the page already has: the paper, each box with a background or a border (a selected
// verse, the chapter buttons), each word at its place in its own font and colour (one word at a time, so a justified or hyphenated line lands where the
// browser set it), and each icon. A page off screen is laid out like the one shown (the columns of src/index.css 'Turn pages'), so any page can be drawn.
// The picture is the reading box's size at up to twice the CSS pixels.

/** The most device pixels a CSS pixel is drawn with: the phone's 3x would make each picture twice as heavy to draw and to send to the GPU. */
const MAX_SCALE = 2;

export interface Snapshot {
  canvas: HTMLCanvasElement;
  /** device pixels per CSS pixel */
  scale: number;
}

/** What a page of the box is drawn from: the box, the text set in columns inside it, and the width of one column with the gap after it. */
export interface PageLayout {
  box: HTMLElement;
  content: HTMLElement;
  step: number;
}

const TRANSPARENT = /^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/;

/** The colour of the paper: the first background, from the box out, that can be seen. */
export function paperOf(box: HTMLElement): string {
  for (let el: Element | null = box; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && !TRANSPARENT.test(bg)) return bg;
  }
  return 'rgb(255, 255, 255)';
}

export const scaleOf = (): number => Math.min(MAX_SCALE, Math.max(1, window.devicePixelRatio || 1));

/** A blank page of paper the box's size: the page of a chapter not opened yet. */
export function blankPage(box: HTMLElement, paper = paperOf(box)): Snapshot {
  const scale = scaleOf();
  const r = box.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(r.width * scale));
  canvas.height = Math.max(1, Math.round(r.height * scale));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return { canvas, scale };
}

/** Icons drawn as pictures, by their markup: an <svg> is drawn only once its picture has loaded, so the first page drawn may lack one. */
const icons = new Map<string, HTMLImageElement>();
/** Hears that an icon has loaded, so pictures drawn without it can be drawn again. */
let onIconLoaded: (() => void) | null = null;
export function whenIconsLoad(heard: (() => void) | null): void {
  onIconLoaded = heard;
}

function iconOf(svg: SVGSVGElement, width: number, height: number, color: string): HTMLImageElement | null {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.style.color = color;
  const markup = new XMLSerializer().serializeToString(copy);
  const known = icons.get(markup);
  if (known) return known.complete && known.naturalWidth > 0 ? known : null;
  const img = new Image();
  img.onload = () => onIconLoaded?.();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  icons.set(markup, img);
  return null;
}

/** The font of an element as the 2D canvas takes it. */
const fontOf = (s: CSSStyleDeclaration): string => `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;

const visible = (s: CSSStyleDeclaration) => s.visibility !== 'hidden' && s.display !== 'none';

/** Draws page `page` (from 0) of the box as it is laid out now. */
export function snapshotPage({ box, content, step }: PageLayout, page: number, paper = paperOf(box)): Snapshot {
  const shot = blankPage(box, paper);
  const ctx = shot.canvas.getContext('2d');
  if (!ctx) return shot;
  const { scale } = shot;
  const b = box.getBoundingClientRect();
  const padLeft = parseFloat(getComputedStyle(box).paddingLeft) || 0;
  // the page's column on screen now, and where it stands when it is the page shown
  const columnLeft = content.getBoundingClientRect().left + page * step;
  const dx = b.left + padLeft - columnLeft;
  const from = columnLeft - padLeft;
  const to = from + b.width;
  const onPage = (r: DOMRect) => r.width > 0 && r.height > 0 && r.right > from && r.left < to && r.bottom > b.top && r.top < b.bottom;
  ctx.setTransform(scale, 0, 0, scale, (dx - b.left) * scale, -b.top * scale);

  const styles = new Map<Element, CSSStyleDeclaration>();
  const styleOf = (el: Element) => {
    let s = styles.get(el);
    if (!s) {
      s = getComputedStyle(el);
      styles.set(el, s);
    }
    return s;
  };
  const range = document.createRange();

  const drawBox = (el: Element, s: CSSStyleDeclaration) => {
    const bg = s.backgroundColor;
    const border = parseFloat(s.borderTopWidth) || 0;
    const fill = bg && !TRANSPARENT.test(bg) && !el.matches(':active');
    const line = border > 0 && s.borderTopStyle !== 'none' && !TRANSPARENT.test(s.borderTopColor);
    if (!fill && !line) return;
    const radius = parseFloat(s.borderTopLeftRadius) || 0;
    for (const r of Array.from(el.getClientRects())) {
      if (!onPage(r)) continue;
      ctx.beginPath();
      ctx.roundRect(r.left, r.top, r.width, r.height, Math.min(radius, r.width / 2, r.height / 2));
      if (fill) {
        ctx.fillStyle = bg;
        ctx.fill();
      }
      if (line) {
        ctx.beginPath();
        ctx.roundRect(r.left + border / 2, r.top + border / 2, r.width - border, r.height - border, Math.max(0, Math.min(radius, r.width / 2, r.height / 2) - border / 2));
        ctx.lineWidth = border;
        ctx.strokeStyle = s.borderTopColor;
        ctx.stroke();
      }
    }
  };

  const drawText = (node: Text, s: CSSStyleDeclaration) => {
    const text = node.data;
    ctx.font = fontOf(s);
    ctx.fillStyle = s.color;
    ctx.letterSpacing = s.letterSpacing === 'normal' ? '0px' : s.letterSpacing;
    const upper = s.textTransform === 'uppercase';
    const underline = s.textDecorationLine.includes('underline');
    const ascent = ctx.measureText('Hg').fontBoundingBoxAscent;
    const put = (str: string, r: DOMRect) => {
      const baseline = r.top + ascent;
      ctx.fillText(upper ? str.toUpperCase() : str, r.left, baseline);
      if (underline) ctx.fillRect(r.left, baseline + 2, r.width, Math.max(1, parseFloat(s.fontSize) / 16));
    };
    for (const word of text.matchAll(/\S+/g)) {
      const start = word.index ?? 0;
      range.setStart(node, start);
      range.setEnd(node, start + word[0].length);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      if (rects.length === 0 || !rects.some(onPage)) continue;
      if (rects.length === 1) {
        put(word[0], rects[0]);
        continue;
      }
      // a word broken over two lines (hyphenated, or a long one wrapped): one letter at a time, and the hyphen the browser added at each break
      let lastTop = Number.NaN;
      let lastRight = 0;
      for (let i = 0; i < word[0].length; i++) {
        range.setStart(node, start + i);
        range.setEnd(node, start + i + 1);
        const r = range.getClientRects()[0];
        if (!r) continue;
        if (!Number.isNaN(lastTop) && Math.abs(r.top - lastTop) > 2) put('-', new DOMRect(lastRight, lastTop, 0, r.height));
        if (onPage(r)) put(word[0][i], r);
        lastTop = r.top;
        lastRight = r.right;
      }
    }
  };

  const walk = (el: Element, alpha: number) => {
    const s = styleOf(el);
    if (!visible(s)) return;
    const own = alpha * (parseFloat(s.opacity) || (s.opacity === '0' ? 0 : 1));
    if (own <= 0) return;
    // a box wholly off the page is skipped with all it holds (not the columns themselves: their box is the first page's)
    const rects = el === content ? [] : Array.from(el.getClientRects());
    if (rects.length > 0 && !rects.some(onPage)) return;
    ctx.globalAlpha = own;
    drawBox(el, s);
    if (el instanceof SVGSVGElement) {
      const r = el.getBoundingClientRect();
      const img = onPage(r) ? iconOf(el, r.width, r.height, s.color) : null;
      if (img) ctx.drawImage(img, r.left, r.top, r.width, r.height);
      return;
    }
    if (el instanceof HTMLImageElement) {
      const r = el.getBoundingClientRect();
      if (onPage(r) && el.complete && el.naturalWidth > 0) ctx.drawImage(el, r.left, r.top, r.width, r.height);
      return;
    }
    for (const child of Array.from(el.childNodes)) {
      if (child instanceof Text) {
        if (child.data.trim() && visible(s)) {
          ctx.globalAlpha = own;
          drawText(child, s);
        }
      } else if (child instanceof Element) walk(child, own);
    }
  };
  walk(content, 1);
  ctx.globalAlpha = 1;
  return shot;
}
