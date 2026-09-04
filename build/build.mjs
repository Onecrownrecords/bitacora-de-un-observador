// Genera dos salidas a partir de index.html + assets:
//   dist/index.html            → sitio completo en un solo archivo (para hosting)
//   dist/bitacora-artifact.html → mismo contenido sin doctype/html/head/body (para publicar como Artifact)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

let html = read('index.html');
const css = read('assets/css/styles.css');
const scenes = read('assets/js/scenes.js');
const app = read('assets/js/app.js');

html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="assets/js/scenes.js"></script>', () => `<script>\n${scenes}\n</script>`);
html = html.replace('<script src="assets/js/app.js"></script>', () => `<script>\n${app}\n</script>`);

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/index.html'), html);

// versión artifact: solo el contenido de <head> (sin charset/viewport) + contenido de <body>
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(resolve(root, 'dist/bitacora-artifact.html'), `${head.trim()}\n${body.trim()}\n`);

console.log('dist/index.html', Buffer.byteLength(html), 'bytes');
console.log('dist/bitacora-artifact.html listo');
