// HydraHub — gera catalog/repos.json: repositórios do GitHub explicados em pt-BR.
//  - recomendados: os que já saíram no Achado IA (tabela do README do achadoia-skills)
//  - top: os 100 com mais estrelas da história
//  - novos: os 100 com mais estrelas criados nos últimos 2 meses
// Cada repo ganha explicação em português (Gemini), prints (imagem social + imagens do README)
// e histórico diário de estrelas pra calcular quem mais cresceu na semana e no mês.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'catalog', 'repos.json');
const EXPLAIN_CACHE = path.join(ROOT, 'catalog', 'repos-explain.json');
const HISTORY = path.join(ROOT, 'catalog', 'stars-history.json');
const QUICK = process.argv.includes('--quick');
const UA = 'HydraHub-catalog/1.0 (+https://github.com/achadoia/hydrahub)';
const TOKEN = process.env.GITHUB_TOKEN || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gh(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) } });
    if (res.ok) return res.json();
    if (res.status === 403 || res.status === 429) { if (!TOKEN && !url.includes('/search/')) return null; await sleep(15000 * (i + 1)); continue; }
    if (res.status === 404) return null;
    await sleep(2000);
  }
  return null;
}
async function text(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); return r.ok ? r.text() : null; } catch { return null; }
}
async function pool(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } }));
}

// ---------- listas ----------
async function search(q, n = 100) {
  const j = await gh(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${n}`);
  return j?.items || [];
}

async function recommended() {
  const md = await text('https://raw.githubusercontent.com/achadoia/achadoia-skills/main/README.md');
  if (!md) return [];
  const today = new Date(Date.now() - 3 * 3600e3); // Brasília
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(\d{2})\/(\d{2})\s*\|\s*\[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)\s*\|([^|]*)\|([^|]*)\|/);
    if (!m) continue;
    const [, dd, mm, full, , skillCell, what] = m;
    const date = new Date(Date.UTC(today.getUTCFullYear(), +mm - 1, +dd));
    if (date > today) continue; // vídeo ainda não saiu
    const skill = (skillCell.match(/\]\(([^)]+)\)/) || [])[1] || null;
    out.push({
      full, postedAt: date.toISOString().slice(0, 10),
      skill: skill ? (skill.startsWith('http') ? skill : `https://github.com/achadoia/achadoia-skills/tree/main/${skill.replace(/\/SKILL\.md$/, '')}`) : null,
      skillWhat: what.trim(),
    });
  }
  return out.reverse(); // mais recente primeiro
}

// ---------- prints do README ----------
const BADGE = /shields\.io|badge|badgen|travis-ci|codecov|circleci|github\.com\/[^/]+\/[^/]+\/(actions|workflows)|contrib\.rocks|star-history|api\.star|visitor|hits\.|komarev|vercel\.com\/button|deploy|sponsor|opencollective|buymeacoffee|ko-fi|paypal|discord|twitter|\.svg(\?|$)|emoji|icon|logo|avatar|gravatar|trendshift|producthunt|repobeats/i;
function readmeImages(md, full, branch) {
  const urls = [];
  const add = (u) => {
    if (!u) return;
    u = u.trim().replace(/^<|>$/g, '').split(/\s+/)[0];
    if (u.startsWith('//')) u = 'https:' + u;
    else if (!/^https?:/.test(u)) u = `https://raw.githubusercontent.com/${full}/${branch}/${u.replace(/^\.?\//, '')}`;
    u = u.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(blob|raw)\//, 'https://raw.githubusercontent.com/$1/');
    if (BADGE.test(u)) return;
    if (!/\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) && !/user-attachments\/assets|user-images\.githubusercontent/.test(u)) return;
    if (!urls.includes(u)) urls.push(u);
  };
  for (const m of md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) add(m[1]);
  for (const m of md.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
  return urls.slice(0, 4);
}
// trecho do README pra IA entender o projeto
const readmeText = (md) => md.replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').slice(0, 1800);

// ---------- explicação em pt-BR (Gemini, com cache) ----------
async function explain(repos, cache) {
  const key = process.env.GEMINI_API_KEY;
  const todo = repos.filter((r) => !cache[r.full] || cache[r.full].pushed !== r.pushedAt.slice(0, 7));
  if (!key || !todo.length) return;
  console.log(`> explicando ${todo.length} repositórios em pt-BR`);
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  for (let i = 0; i < todo.length; i += 8) {
    const chunk = todo.slice(i, i + 8);
    const input = chunk.map((r) => ({ repo: r.full, descricao: r.description, linguagem: r.language, topicos: r.topics.slice(0, 8), readme: r._readme }));
    const prompt = `Você escreve pro HydraHub, app brasileiro que mostra jogos e repositórios do GitHub pra gente comum. Pra cada repositório abaixo, responda em português do Brasil, tom direto e amigável, sem exagero e sem inventar recurso que não está no texto:
- "resumo": 1 frase curta dizendo o que é (máx. 110 caracteres)
- "explicacao": 2 a 3 frases explicando o que faz e pra que serve, pra quem nunca programou
- "praQuem": 1 frase curta dizendo quem aproveita (ex.: "Quem edita vídeo", "Devs de front-end")
- "categoria": uma destas: "IA", "Dev", "Web", "Ferramentas", "Aprender", "Jogos", "Sistemas", "Dados", "Mobile", "Design", "Segurança", "Outros"
Mantenha nomes de produtos e termos técnicos como estão. Responda APENAS com um array JSON na mesma ordem, objetos com as chaves repo, resumo, explicacao, praQuem, categoria.

${JSON.stringify(input)}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 8192 } }),
      });
      const j = await res.json();
      let arr = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
      if (!Array.isArray(arr)) arr = Object.values(arr).find(Array.isArray) || [];
      if (!arr.length) console.warn('  ! resposta vazia', j.error?.message || j.candidates?.[0]?.finishReason || '');
      for (const [k, x] of arr.entries()) {
        const r = chunk.find((c) => c.full.toLowerCase() === String(x.repo || '').toLowerCase()) || (arr.length === chunk.length ? chunk[k] : null);
        if (r && x.resumo) cache[r.full] = { resumo: x.resumo, explicacao: x.explicacao, praQuem: x.praQuem, categoria: x.categoria, pushed: r.pushedAt.slice(0, 7) };
      }
    } catch (e) { console.warn('  ! explicação falhou:', e.message); }
    await fs.writeFile(EXPLAIN_CACHE, JSON.stringify(cache));
    console.log(`    ${Math.min(i + 8, todo.length)}/${todo.length}`);
  }
}

// ---------- main ----------
const t0 = Date.now();
const since = new Date(Date.now() - 61 * 86400e3).toISOString().slice(0, 10);
const n = QUICK ? 10 : 100;
const [top, fresh, recs] = [await search('stars:>20000', n), await search(`created:>=${since} stars:>50`, n), await recommended()];
console.log(`> top ${top.length} · novos ${fresh.length} · recomendados ${recs.length}`);

const byFull = new Map();
const norm = (it) => ({
  full: it.full_name, name: it.name, owner: it.owner?.login, ownerAvatar: it.owner?.avatar_url,
  url: it.html_url, homepage: it.homepage || null, description: it.description || '',
  stars: it.stargazers_count, forks: it.forks_count, language: it.language, topics: it.topics || [],
  license: it.license?.spdx_id && it.license.spdx_id !== 'NOASSERTION' ? it.license.spdx_id : null,
  createdAt: it.created_at, pushedAt: it.pushed_at || it.updated_at, branch: it.default_branch || 'main', archived: !!it.archived,
});
for (const it of [...top, ...fresh]) byFull.set(it.full_name.toLowerCase(), norm(it));
// recomendados que não estão nas listas: busca em lote (a busca tem limite próprio, separado da API comum)
const missing = recs.filter((r) => !byFull.has(r.full.toLowerCase()));
for (let i = 0; i < missing.length; i += 5) {
  for (const it of await search(missing.slice(i, i + 5).map((r) => `repo:${r.full}`).join(' '), 10)) byFull.set(it.full_name.toLowerCase(), norm(it));
}
const repos = [...byFull.values()];

// README: prints + texto pra explicação
await pool(repos, 8, async (r) => {
  let md = null;
  for (const f of ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.rst', 'README']) { md = await text(`https://raw.githubusercontent.com/${r.full}/${r.branch}/${f}`); if (md) break; }
  r.shots = [`https://opengraph.githubassets.com/1/${r.full}`, ...(md ? readmeImages(md, r.full, r.branch) : [])];
  r._readme = md ? readmeText(md) : '';
});

let cache = {};
try { cache = JSON.parse(await fs.readFile(EXPLAIN_CACHE, 'utf8')); } catch {}
await explain(repos, cache);

// histórico de estrelas (1 ponto por dia, guarda 45 dias) → crescimento na semana e no mês
let hist = {};
try { hist = JSON.parse(await fs.readFile(HISTORY, 'utf8')); } catch {}
const today = new Date().toISOString().slice(0, 10);
hist[today] = Object.fromEntries(repos.map((r) => [r.full, r.stars]));
const days = Object.keys(hist).sort();
for (const d of days.slice(0, -45)) delete hist[d];
const at = (ago) => { const target = new Date(Date.now() - ago * 86400e3).toISOString().slice(0, 10); return days.filter((d) => d <= target).pop() || days[0]; };
const [dWeek, dMonth] = [at(7), at(30)];
const ageDays = (iso) => Math.max(1, (Date.now() - Date.parse(iso)) / 86400e3);
for (const r of repos) {
  const was = (d) => hist[d]?.[r.full];
  // sem histórico ainda: estima pelo ritmo médio de estrelas desde a criação
  const pace = r.stars / ageDays(r.createdAt);
  r.starsWeek = d0(was(dWeek)) !== null && dWeek !== today ? r.stars - was(dWeek) : Math.round(pace * Math.min(7, ageDays(r.createdAt)));
  r.starsMonth = d0(was(dMonth)) !== null && dMonth !== today ? r.stars - was(dMonth) : Math.round(pace * Math.min(30, ageDays(r.createdAt)));
  r.trendEstimated = dWeek === today;
  const ex = cache[r.full];
  if (ex) Object.assign(r, { resumo: ex.resumo, explicacao: ex.explicacao, praQuem: ex.praQuem, categoria: ex.categoria });
  delete r._readme;
}
function d0(v) { return v == null ? null : v; }

const pick = (list) => list.map((it) => byFull.get(it.full_name.toLowerCase())?.full).filter(Boolean);
const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  lists: {
    recomendados: recs.map((r) => byFull.get(r.full.toLowerCase())?.full).filter(Boolean),
    top: pick(top),
    novos: pick(fresh),
  },
  achadoia: Object.fromEntries(recs.map((r) => [byFull.get(r.full.toLowerCase())?.full || r.full, { postedAt: r.postedAt, skill: r.skill, skillWhat: r.skillWhat }])),
  repos,
};
await fs.writeFile(OUT, JSON.stringify(out));
await fs.writeFile(HISTORY, JSON.stringify(hist));
console.log(`\nRepositórios: ${repos.length} (${repos.filter((r) => r.resumo).length} explicados) em ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(ROOT, OUT)}`);
