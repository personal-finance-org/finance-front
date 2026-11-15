// Sirve la compilación de producción (dist/finanzas-ui/browser) con fallback a index.html.
// La PWA (service worker e instalación) solo funciona con la versión de producción, no con `ng serve`.
// Uso: npm run preview   →   http://localhost:4300
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../dist/finanzas-ui/browser');
const PORT = Number(process.env.PORT ?? 4300);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

if (!existsSync(ROOT)) { console.error('No existe dist/. Ejecuta primero: npm run build'); process.exit(1); }

createServer((req, res) => {
  let file = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Mis Finanzas (producción) → http://localhost:${PORT}`));
