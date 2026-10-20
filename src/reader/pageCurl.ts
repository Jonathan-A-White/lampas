// src/reader/pageCurl.ts — the page curl of Turn pages in WebGL (mw-5r3p30.621): a sheet of paper that bends round a cylinder as it is turned, as a book's
// page does, drawn over the page under it. The sheet is a fine mesh of the page's picture (src/reader/pageSnapshot.ts); each point of it past the fold
// line is wrapped round a cylinder of radius R and, past half of it, lies flat again face down over the sheet, so its back shows: the paper with the
// print faint through it, as thin Bible paper shows it. The light falls on the bend, the turned part casts a soft shadow on the page under it and on the
// sheet itself, and the lifted part comes a little nearer (a slight perspective). `turned` is how far over the sheet is: 0 lies flat, 1 has gone wholly
// off to the left; `tilt` slants the fold, as a page lifted by its lower corner turns.

const VERTEX = `
attribute vec2 aPos;
uniform vec2 uSize;
uniform float uAxis;
uniform vec2 uDir;
uniform float uR;
uniform float uSheet;
varying vec2 vUv;
varying float vTheta;
varying float vS;
const float PI = 3.14159265;
void main() {
  vec2 p = aPos * uSize;
  vec2 o = vec2(uAxis, uSize.y * 0.5);
  float s = uSheet > 0.5 ? dot(p - o, uDir) : 0.0;
  float theta = 0.0;
  float sp = s;
  float z = 0.0;
  if (s > 0.0) {
    if (s < PI * uR) {
      theta = s / uR;
      sp = uR * sin(theta);
      z = uR * (1.0 - cos(theta));
    } else {
      theta = PI;
      sp = PI * uR - s;
      z = 2.0 * uR;
    }
  }
  vec2 q = p + uDir * (sp - s);
  // a slight perspective: the lifted paper is nearer the eye
  float near = 2400.0 / (2400.0 - z);
  q = uSize * 0.5 + (q - uSize * 0.5) * near;
  vUv = aPos;
  vTheta = theta;
  vS = s;
  float depth = uSheet > 0.5 ? 0.5 - z / (2.0 * uR + 0.001) * 0.4 : 0.9;
  gl_Position = vec4(q.x / uSize.x * 2.0 - 1.0, 1.0 - q.y / uSize.y * 2.0, depth, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uOld;
uniform float uFade;
uniform vec2 uSize;
uniform float uAxis;
uniform vec2 uDir;
uniform float uR;
uniform float uSheet;
uniform vec3 uPaper;
uniform float uDark;
uniform float uLift;
varying vec2 vUv;
varying float vTheta;
varying float vS;
const float PI = 3.14159265;
float outside(vec2 p) {
  vec2 d = max(max(-p, p - uSize), 0.0);
  return length(d) + (d.x + d.y > 0.0 ? 0.0 : -1.0);
}
void main() {
  vec3 tex = mix(texture2D(uOld, vUv).rgb, texture2D(uTex, vUv).rgb, uFade);
  vec2 p = vUv * uSize;
  vec2 o = vec2(uAxis, uSize.y * 0.5);
  float shadowStrength = mix(0.38, 0.6, uDark) * uLift;
  if (uSheet < 0.5) {
    // the page under: the shadow the curl casts on it, deepest at the cylinder's edge
    float s = dot(p - o, uDir) - uR;
    float shade = s > 0.0 ? shadowStrength * pow(max(0.0, 1.0 - s / (uR * 1.6)), 2.0) : shadowStrength;
    gl_FragColor = vec4(tex * (1.0 - shade), 1.0);
    return;
  }
  vec3 light = normalize(vec3(-0.35, -0.25, 1.0));
  if (gl_FrontFacing) {
    // the face of the sheet: lit as it bends away, and shaded where the turned part hangs over it
    vec3 n = vec3(-uDir * sin(vTheta), cos(vTheta));
    float lit = 0.62 + 0.38 * max(dot(n, light), 0.0) / max(light.z, 0.001);
    lit = min(lit, 1.0);
    float shade = 0.0;
    if (vS < 0.0) {
      vec2 folded = p + uDir * (PI * uR - 2.0 * vS);
      float gap = outside(folded);
      if (gap > 0.0) shade = 0.28 * (1.0 - smoothstep(0.0, uR * 0.5, gap));
      // the crease where the paper starts to lift
      shade += 0.1 * uLift * (1.0 - smoothstep(0.0, uR * 0.6, -vS));
    }
    gl_FragColor = vec4(tex * lit * (1.0 - shade), 1.0);
  } else {
    // the back of the sheet: the paper, the print faint through it, lit by the bend with a soft sheen
    vec3 n = -vec3(-uDir * sin(vTheta), cos(vTheta));
    float d = max(dot(n, light), 0.0);
    float lit = 0.7 + 0.3 * d;
    float sheen = pow(d, 24.0) * mix(0.16, 0.06, uDark);
    vec3 back = mix(uPaper, tex, 0.14);
    gl_FragColor = vec4(min(back * lit + sheen, 1.0), 1.0);
  }
}`;

/** The mesh: GRID by GRID squares over the page, finer than a pixel's bend can show. */
const GRID = 48;

export interface CurlScene {
  /** how far over the sheet is, 0 to 1 */
  turned: number;
  /** the slant of the fold, in radians */
  tilt: number;
}

export interface Curl {
  /** The pictures: the sheet that turns and the page under it (CSS pixels for their size come from the canvas). */
  setPages(sheet: TexImageSource, under: TexImageSource): void;
  /** Draws a page's picture over the one shown in `which` place, from 0 (the old) to 1 (the new): the page of a chapter that has just opened. */
  replace(which: 'sheet' | 'under', picture: TexImageSource): void;
  /** How far the picture `replace` gave has come in over the one before it, from 0 to 1. */
  fade(which: 'sheet' | 'under', fade: number): void;
  draw(scene: CurlScene): void;
  dispose(): void;
}

const parseRgb = (css: string): [number, number, number] => {
  const m = css.match(/[\d.]+/g);
  return m && m.length >= 3 ? [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255] : [1, 1, 1];
};

/** True when WebGL can be had at all: without it the turn is the plain slide (src/reader/pageTurn.ts). */
export function canCurl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/** Sets up the curl on `canvas`, `width` by `height` CSS pixels; null when WebGL will not start. */
export function createCurl(canvas: HTMLCanvasElement, width: number, height: number, paper: string): Curl | null {
  // no multisampling: at a phone's two or three device pixels to the CSS pixel the paper's edge is smooth without it, and it costs a frame on a slow GPU
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: true, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // the mesh, in shares of the page: (GRID + 1)^2 points, two triangles a square
  const points: number[] = [];
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) points.push(i / GRID, j / GRID);
  const indices: number[] = [];
  const at = (i: number, j: number) => j * (GRID + 1) + i;
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) indices.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));
  }
  const mesh = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  // the sheet takes every square; the page under, which does not bend, only the mesh's four corners
  const corners = [at(0, 0), at(0, GRID), at(GRID, 0), at(GRID, 0), at(0, GRID), at(GRID, GRID)];
  const order = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, order);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([...indices, ...corners]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uSize = u('uSize');
  const uAxis = u('uAxis');
  const uDir = u('uDir');
  const uR = u('uR');
  const uSheet = u('uSheet');
  const uFade = u('uFade');
  const uLift = u('uLift');
  gl.uniform2f(uSize, width, height);
  gl.uniform3f(u('uPaper'), ...parseRgb(paper));
  const [r, g, b] = parseRgb(paper);
  gl.uniform1f(u('uDark'), 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4 ? 1 : 0);
  gl.uniform1i(u('uTex'), 0);
  gl.uniform1i(u('uOld'), 1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.viewport(0, 0, canvas.width, canvas.height);

  const texture = (picture: TexImageSource) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
    return t;
  };
  /** each place's picture, and the one it is fading in over */
  const pages: Record<'sheet' | 'under', { now: WebGLTexture | null; old: WebGLTexture | null; fade: number }> = {
    sheet: { now: null, old: null, fade: 1 },
    under: { now: null, old: null, fade: 1 },
  };
  const drop = (t: WebGLTexture | null) => {
    if (t) gl.deleteTexture(t);
  };
  const R = Math.max(18, width * 0.11);
  gl.uniform1f(uR, R);

  const drawPlace = (which: 'sheet' | 'under') => {
    const page = pages[which];
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, page.now);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, page.old ?? page.now);
    gl.uniform1f(uFade, page.old ? page.fade : 1);
    gl.uniform1f(uSheet, which === 'sheet' ? 1 : 0);
    if (which === 'sheet') gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    else gl.drawElements(gl.TRIANGLES, corners.length, gl.UNSIGNED_SHORT, indices.length * 2);
  };

  const curl: Curl = {
    setPages(sheet, under) {
      for (const place of [pages.sheet, pages.under]) {
        drop(place.now);
        drop(place.old);
        place.old = null;
        place.fade = 1;
      }
      pages.sheet.now = texture(sheet);
      pages.under.now = texture(under);
    },
    replace(which, picture) {
      const page = pages[which];
      if (!page.old) page.old = page.now;
      else drop(page.now);
      page.now = texture(picture);
      page.fade = 0;
    },
    fade(which, fade) {
      pages[which].fade = fade;
    },
    draw({ turned, tilt }) {
      // the fold starts just past the sheet's far corner, so nothing is bent at 0, and ends past its near edge by the cylinder, so nothing shows at 1
      const slant = tilt * (1 - turned);
      const start = width + (height / 2) * Math.abs(Math.tan(slant)) + 1;
      const axis = start - turned * (start + R + 1);
      gl.uniform1f(uAxis, axis);
      // the shadows come in as the sheet lifts and go as it lands, so the first and last frames are the page itself
      gl.uniform1f(uLift, Math.max(0, Math.min(1, turned * 10, (1 - turned) * 5)));
      gl.uniform2f(uDir, Math.cos(slant), Math.sin(slant));
      for (const page of [pages.sheet, pages.under]) {
        if (page.old && page.fade >= 1) {
          drop(page.old);
          page.old = null;
        }
      }
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawPlace('under');
      drawPlace('sheet');
    },
    dispose() {
      for (const place of [pages.sheet, pages.under]) {
        drop(place.now);
        drop(place.old);
      }
      gl.deleteBuffer(mesh);
      gl.deleteBuffer(order);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
  // a first draw, with no pictures yet, makes the browser finish building the program now rather than in a turn's first frame
  curl.draw({ turned: 0, tilt: 0 });
  return curl;
}
