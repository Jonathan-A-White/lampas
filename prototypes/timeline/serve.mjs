// prototypes/timeline/serve.mjs (mw-fnvjof.17.317.4): serves the repo's own files so the prototype can read src/timeline/data/ and public/data/ as they are. Not app code.
//   node prototypes/timeline/serve.mjs            this machine only: http://127.0.0.1:4317/prototypes/timeline/
//   node prototypes/timeline/serve.mjs --lan      also to the phone on the same network (it serves this folder's repo, read only, and nothing else)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
/** Only what the prototype reads is served: itself, the timeline's data, the chapters' text, the fonts. */
const OPEN = ['prototypes/timeline/', 'src/timeline/data/', 'public/data/', 'src/fonts/'];

/** Start the server; answers its address. `port` 0 takes any free one. */
export function serve({ port = 4317, host = '127.0.0.1' } = {}) {
  const server = createServer((request, response) => {
    let path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).split(sep).join('/').replace(/^\/+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    if (request.method !== 'GET' || !OPEN.some((dir) => path.startsWith(dir)) || !file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => server.listen(port, host, () => done({ server, url: `http://127.0.0.1:${server.address().port}/prototypes/timeline/` })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lan = process.argv.includes('--lan');
  const { server, url } = await serve({ host: lan ? '0.0.0.0' : '127.0.0.1' });
  console.log(`The timeline prototype: ${url}`);
  if (lan) for (const list of Object.values(networkInterfaces())) for (const net of list ?? []) if (net.family === 'IPv4' && !net.internal) console.log(`On the phone: http://${net.address}:${server.address().port}/prototypes/timeline/`);
  console.log('?book=luk&chapter=23  another chapter    ?theme=dark | light    ?hud=1  the frame times    Ctrl-C stops it');
}
