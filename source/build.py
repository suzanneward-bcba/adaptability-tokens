import os, shutil, json, hashlib
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(ROOT, 'src')
# The app is written to the repository root (one level up) so GitHub Pages can serve it from main / root.
DIST = os.path.dirname(ROOT)
def rd(n): return open(os.path.join(SRC, n), encoding='utf-8').read()
html = rd('template.html').replace('/*STYLES*/', rd('styles.css')).replace('/*CORE*/', rd('core.js')).replace('/*I18N*/', rd('i18n.js')).replace('/*PICS*/', rd('pictures.js')).replace('/*THEMES*/', rd('themes.js')).replace('/*SOUNDS*/', rd('sounds.js')).replace('/*APP*/', rd('app.js'))
os.makedirs(os.path.join(DIST, 'icons'), exist_ok=True)
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(html)
ver = hashlib.sha1(html.encode()).hexdigest()[:10]

# icons: cream square, four brand token dots in a rounded "tray"
def icon(size, maskable=False):
    im = Image.new('RGB', (size, size), (251, 246, 236)); d = ImageDraw.Draw(im)
    pad = size * (0.2 if maskable else 0.12); w = size - 2 * pad
    d.rounded_rectangle([pad, pad + w * .18, pad + w, pad + w * .82], radius=w * .32, fill=(242, 233, 216))
    cols = [(161, 34, 121), (42, 96, 166), (167, 207, 59), (254, 146, 12)]
    r = w * .1; cy = pad + w / 2
    for i, c in enumerate(cols):
        cx = pad + w * (.2 + i * .2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    return im
for s in (192, 512): icon(s).save(os.path.join(DIST, 'icons', f'icon-{s}.png'))
icon(512, True).save(os.path.join(DIST, 'icons', 'icon-maskable-512.png'))
icon(180).save(os.path.join(DIST, 'icons', 'apple-touch-icon.png'))

manifest = {
  "name": "adaptABILITY Tokens", "short_name": "Tokens", "start_url": "./", "scope": "./", "display": "standalone",
  "orientation": "any", "background_color": "#fbf6ec", "theme_color": "#fbf6ec", "lang": "en",
  "description": "Digital token boards and reinforcer choice for adaptABILITY Therapie.",
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
json.dump(manifest, open(os.path.join(DIST, 'manifest.webmanifest'), 'w'), indent=2)

sw = """/* adaptABILITY Tokens offline cache — version %s */
const CACHE = 'at-%s';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
""" % (ver, ver)
open(os.path.join(DIST, 'sw.js'), 'w').write(sw)
open(os.path.join(DIST, '_headers'), 'w').write("/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n")
open(os.path.join(DIST, '.nojekyll'), 'w').write('')
print('built', ver, len(html)//1024, 'KB')
