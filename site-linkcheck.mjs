import { readFileSync, readdirSync } from 'node:fs';
const pages = ['index.html','brands.html','creators.html','marketing.html','register.html','privacy.html','terms.html','refund-policy.html','faqs/index.html'];
const urls = new Set();
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/(?:href|src|action)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith('/') || u.startsWith('./')) urls.add(u.replace(/^\./, ''));
  }
}
const base = 'http://localhost:8099';
const results = [];
for (const u of [...urls].sort()) {
  try {
    const r = await fetch(base + u, { method: 'GET' });
    results.push([r.status, u]);
  } catch { results.push(['ERR', u]); }
}
const bad = results.filter(r => r[0] !== 200);
console.log('total:', results.length, 'bad:', bad.length);
bad.forEach(([s, u]) => console.log(s, u));
