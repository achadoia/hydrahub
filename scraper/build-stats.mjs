// HydraHub — gera catalog/stats.json: downloads de cada jogo instalável, somando todas as
// releases do GitHub do projeto. Guarda um retrato por dia (catalog/downloads-history.json)
// pra montar os rankings "mais baixados da semana / do mês / de sempre".
// Roda no GitHub Actions depois do build-catalog (usa GITHUB_TOKEN: ~1 consulta por repo).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'catalog', 'catalog.json');
const OUT = path.join(ROOT, 'catalog', 'stats.json');
const HISTORY = path.join(ROOT, 'catalog', 'downloads-history.json');
const UA = 'HydraHub-catalog/1.0 (+https://github.com/achadoia/hydrahub)';
const TOKEN = process.env.GITHUB_TOKEN || '';
const LIMIT = TOKEN ? Infinity : 40; // sem token o GitHub só libera 60 consultas por hora
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const repoOf = (url = '') => (String(url).match(/github\.com\/([^/\s?#]+\/[^/\s?#]+)/i) || [])[1]?.replace(/\.git$/, '') || null;

async function gh(url) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    if (res.status === 403 || res.status === 429) { if (!TOKEN) return undefined; await sleep(20000 * (i + 1)); continue; }
    await sleep(1500);
  }
  return undefined;
}

const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
let hist = {};
try { hist = JSON.parse(await fs.readFile(HISTORY, 'utf8')); } catch {}
const today = new Date().toISOString().slice(0, 10);
const prevDay = Object.keys(hist).sort().pop();

// jogo → repos de instalação
const targets = [];
for (const g of catalog.games) {
  const repos = [...new Set(g.ways.filter((w) => w.kind === 'install').map((w) => repoOf(w.repo || w.url)).filter(Boolean))];
  if (repos.length) targets.push({ id: g.id, repos });
}
console.log(`> contando downloads de ${targets.length} jogos`);

const totals = {};
let next = 0, asked = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < targets.length) {
    const t = targets[next++];
    let sum = 0, ok = false;
    for (const repo of t.repos) {
      if (asked >= LIMIT) break;
      asked++;
      const rel = await gh(`https://api.github.com/repos/${repo}/releases?per_page=100`);
      if (!Array.isArray(rel)) continue;
      ok = true;
      for (const r of rel) for (const a of r.assets || []) if (!/\.(sha\d+|sig|asc|txt|json|md)$/i.test(a.name)) sum += a.download_count || 0;
    }
    // sem resposta: mantém o último número conhecido
    totals[t.id] = ok ? sum : hist[prevDay]?.[t.id] ?? null;
  }
}));
for (const k of Object.keys(totals)) if (totals[k] == null) delete totals[k];

hist[today] = totals;
const days = Object.keys(hist).sort();
for (const d of days.slice(0, -45)) delete hist[d];
const at = (ago) => { const target = new Date(Date.now() - ago * 86400e3).toISOString().slice(0, 10); return days.filter((d) => d <= target).pop() || null; };
const [dWeek, dMonth] = [at(7), at(30)];
// ainda sem 7/30 dias de histórico: usa o retrato mais antigo que houver
const base = (d) => (d && d !== today ? d : days.find((x) => x !== today) || null);

const games = {};
for (const [id, total] of Object.entries(totals)) {
  const w = base(dWeek), m = base(dMonth);
  games[id] = {
    total,
    week: w && hist[w][id] != null ? Math.max(0, total - hist[w][id]) : null,
    month: m && hist[m][id] != null ? Math.max(0, total - hist[m][id]) : null,
  };
}
const rank = (k) => Object.entries(games).filter(([, v]) => v[k] != null).sort((a, b) => b[1][k] - a[1][k]).slice(0, 30).map(([id]) => id);
const out = {
  version: 1, generatedAt: new Date().toISOString(),
  since: { week: base(dWeek), month: base(dMonth) },
  rankings: { week: rank('week'), month: rank('month'), total: rank('total') },
  games,
};
await fs.writeFile(OUT, JSON.stringify(out));
await fs.writeFile(HISTORY, JSON.stringify(hist));
console.log(`Downloads: ${Object.keys(games).length} jogos, ${asked} consultas → ${path.relative(ROOT, OUT)}`);
