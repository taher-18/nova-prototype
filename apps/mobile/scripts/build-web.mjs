// Builds the prototype website into /docs (GitHub Pages: main branch, /docs folder).
//
//   npm run build:web        (from the repository root)
//
// Prototype mode is always on for this build: no backend, no login, data on
// the device. The site is served from https://<user>.github.io/nova-prototype/.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(mobile, 'dist-web');
const docs = join(mobile, '..', '..', 'docs');

rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir dist-web --clear`, {
  cwd: mobile,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_PROTOTYPE: '1', NODE_ENV: 'production' },
});

// Save the tester ID (?t=T1) the moment the page loads, before the app's
// JavaScript downloads or the router rewrites the address. Same key and rule
// as src/prototype/testerId.ts. Also runs from 404.html, which GitHub Pages
// serves at the original address, query string included.
const captureTester =
  '<script>try{var t=new URLSearchParams(location.search).get("t");' +
  't=t&&t.trim();if(t&&/^[\\w-]{1,40}$/.test(t))localStorage.setItem("nova_tester_id",t)}catch(e){}</script>';

// Home-screen app tags (Add to Home Screen) and a phone-friendly viewport.
const base = '/nova-prototype';
const head = [
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Nova">',
].join('\n    ');
let html = readFileSync(join(out, 'index.html'), 'utf8');
html = html
  .replace(/<head>/, `<head>\n    ${captureTester}`)
  .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">')
  .replace(/<title>[^<]*<\/title>/, '<title>Nova</title>')
  .replace('</head>', `    ${head}\n  </head>`);
writeFileSync(join(out, 'index.html'), html);
// GitHub Pages serves 404.html for any unknown path, so deep links open the app.
writeFileSync(join(out, '404.html'), html);
// Keep folders that start with "_" (Expo's /_expo assets): no Jekyll processing.
writeFileSync(join(out, '.nojekyll'), '');

rmSync(docs, { recursive: true, force: true });
cpSync(out, docs, { recursive: true });
rmSync(out, { recursive: true, force: true });
if (!existsSync(join(docs, 'index.html'))) throw new Error('Export failed: docs/index.html missing');
console.log(`\nWebsite ready in ${docs}`);
