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
  env: {
    ...process.env,
    EXPO_PUBLIC_PROTOTYPE: '1',
    // Shown in Profile, so you can tell which version a phone is running.
    EXPO_PUBLIC_BUILD_TIME: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    NODE_ENV: 'production',
  },
});

// Tester ID (?t=T1), run the moment the page loads, before any app code:
// 1. save ?t= to localStorage (a new value replaces the old one);
// 2. keep ?t= in the address from then on. The app moves to /language right
//    after loading, which dropped it, and "Add to Home Screen" saves the
//    current address: on iPhone the home-screen app has its own storage, so
//    without ?t= in that address it never learns the ID.
// Same key and rule as src/prototype/testerId.ts. Also runs from 404.html,
// which GitHub Pages serves at the original address, query string included.
const captureTester = `<script>(function(){try{
var K="nova_tester_id",q=new URLSearchParams(location.search),t=q.get("t");t=t&&t.trim();
if(t&&/^[\\w-]{1,40}$/.test(t))localStorage.setItem(K,t);
var id=localStorage.getItem(K)||localStorage.getItem("prototype.tester");if(!id)return;
var keep=function(u){try{var x=new URL(u==null?location.href:String(u),location.href);
if(x.searchParams.get("t")!==id)x.searchParams.set("t",id);return x.pathname+x.search+x.hash}catch(e){return u}};
["pushState","replaceState"].forEach(function(m){var o=history[m];history[m]=function(s,n,u){return o.call(this,s,n,keep(u))}});
if(q.get("t")!==id)history.replaceState(history.state,"",keep(location.href));
}catch(e){}})();</script>`.replace(/\n/g, '');

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
