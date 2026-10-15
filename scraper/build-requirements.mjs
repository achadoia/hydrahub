// HydraHub — o que cada jogo instalável pede do jogador (ROM/ISO, região, versão, formato, hash, onde colocar).
// Lê o README de cada projeto com botão Instalar e pede pro Gemini extrair isso em pt-BR.
// Cache por repositório: só reprocessa quando o trecho relevante do README muda.
//   node scraper/build-requirements.mjs            (todos)
//   node scraper/build-requirements.mjs --only mario-kart-wii,sm64

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'catalog', 'catalog.json');
const OUT = path.join(ROOT, 'catalog', 'requirements.json');
const UA = 'HydraHub-catalog/1.0 (+https://github.com/achadoia/hydrahub)';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); return r.ok ? r.text() : null; } catch { return null; }
}
async function pool(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } }));
}
const repoOf = (u) => (String(u || '').match(/github\.com\/([^/]+\/[^/#?]+)/i)?.[1] || '').replace(/\.git$/, '');

async function readme(repo) {
  for (const f of ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.rst', 'README.txt', 'README']) {
    const md = await text(`https://raw.githubusercontent.com/${repo}/HEAD/${f}`);
    if (md) return md;
  }
  return '';
}

// Trecho do README que fala do que o jogador precisa fornecer (o resto não interessa aqui)
const KEY = /\b(roms?|iso|isos|disc|disk|dump|dumped|dumping|baserom|cartridge|copy of|own copy|game files|game data|original game|assets?|extract|sha-?1|sha256|md5|crc|checksum|hash|region|ntsc|pal|usa|europe|japan|jp|us\b|eu\b|version 1\.|v1\.\d|serial|\.z64|\.n64|\.v64|\.sfc|\.smc|\.nes|\.gba|\.gb|\.gbc|\.nds|\.3ds|\.cia|\.xci|\.nsp|\.iso|\.rvz|\.wbfs|\.gcm|\.ciso|\.xex|\.xiso|\.god|\.elf|\.bin|\.cue|\.chd|\.pak|\.wad|\.vpk|\.pkg|\.dat|\.exe|first (run|launch|time)|select|place|put|copy|drag)\b/i;
function relevant(md) {
  const clean = md.replace(/<!--[\s\S]*?-->/g, '').replace(/<img[^>]*>/gi, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, ' ');
  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const keep = new Set();
  lines.forEach((l, i) => { if (KEY.test(l) || /^#+\s/.test(l)) { keep.add(i); if (KEY.test(l)) { keep.add(i - 1); keep.add(i + 1); keep.add(i + 2); } } });
  const head = lines.slice(0, 8).join('\n').slice(0, 700);
  const body = [...keep].filter((i) => i >= 8 && i < lines.length).sort((a, b) => a - b).map((i) => lines[i]).join('\n');
  return `${head}\n...\n${body}`.slice(0, 5000);
}

const PROMPT = `Você ajuda o HydraHub, app brasileiro que instala ports/recompilações de jogos antigos pro PC pra gente leiga.
Pra cada projeto abaixo (README + plataforma original), diga EXATAMENTE o que o jogador precisa fornecer pra jogar, SÓ com base no texto. Não invente: se o texto não diz, use null.
Campos (português do Brasil, frases curtas e simples):
- "repo"
- "precisa": "rom" (uma ROM/ISO/imagem de disco do jogo original), "arquivos" (arquivos/pasta do jogo original instalado, ex.: dados de PC/Steam, .pak, assets extraídos), "nada" (o projeto já vem jogável sem nada do jogo original, ex.: jogo livre/homebrew/engine com dados próprios), "incerto" (o texto não deixa claro)
- "arquivo": o que é, em 1 frase leiga. Ex.: "ROM do Super Mario 64 da versão americana (USA)", "imagem do disco de Mario Kart Wii, versão europeia (PAL, RMCP01)"
- "regiao": ex. "USA", "Europa (PAL)", "Japão", ou null
- "versao": versão do jogo BASE, ex. "1.0", "Rev 1", "GOTY", "versão da GOG", ou null
- "atualizacao": atualização/patch/title update que precisa estar instalada JUNTO com o jogo base, ex. "1.09", "TU 2", "v1.2.0", ou null. Se o README diz só "update 1.09" ou "patch 1.09", vai aqui (não em "versao").
- "idJogo": código oficial que identifica a cópia exata, ex. "CUSA00900", "RMCP01", "SLUS-00594", "NUS-NSME-USA", "4D5307E6" (Title ID do Xbox 360). Use o do README; se o README não traz mas define a região e você tem CERTEZA ABSOLUTA do código oficial daquele jogo naquela região, pode preencher; na dúvida, null
- "nomeExato": nome da cópia como aparece nos bancos No-Intro/Redump, ex. "Super Mario 64 (USA)", "Mario Kart Wii (Europe) (En,Fr,De,Es,It)"; só se a região/versão for conhecida, senão null
- "formatos": lista de extensões aceitas citadas, ex. [".z64"], [".iso", ".rvz"]; [] se não citar
- "hash": {"tipo": "SHA1"|"MD5"|"CRC32"|"SHA256", "valor": "..."} se o README traz o hash do arquivo certo, senão null
- "nomeArquivo": nome exato que o arquivo precisa ter, se o README exigir (ex. "baserom.us.z64"), senão null
- "modo": como o jogo PRONTO (baixado da release) recebe o arquivo: "seletor" (o jogo abre e pede pra escolher o arquivo numa janela/menu), "pasta" (o arquivo tem que estar numa pasta, com nome certo, ANTES de abrir), "outro" (instalador próprio, extração manual, compilar etc.) ou null se não diz. Ignore instruções de compilar o código-fonte quando houver release pronta.
- "pasta": se modo = "pasta", a pasta relativa ao executável do jogo onde o arquivo vai, com "/" (ex. "data", "assets/rom", "." para a mesma pasta do .exe); senão null
- "comoUsar": 1 a 2 frases dizendo onde/como entregar o arquivo pro jogo. Ex.: "Na primeira vez que abrir, o jogo pede pra você escolher a ROM." ou "Coloque o arquivo na pasta do jogo com o nome baserom.us.z64 antes de abrir."
- "obs": 1 frase com algum outro requisito importante (ex.: "Cópias modificadas ou de outras regiões são recusadas"), ou null
Mantenha nomes de jogos, extensões, hashes e nomes de arquivo exatamente como no texto. Responda APENAS com um array JSON na mesma ordem.`;

// o app confere a ROM por esse hash: só passa se tiver o tamanho certo do tipo
const HASH_LEN = { MD5: 32, SHA1: 40, CRC32: 8, SHA256: 64 };
function cleanHash(h) {
  if (!h?.valor) return null;
  const tipo = String(h.tipo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const valor = String(h.valor).trim().toLowerCase().replace(/^0x/, '');
  return HASH_LEN[tipo] && valor.length === HASH_LEN[tipo] && /^[0-9a-f]+$/.test(valor) ? { tipo, valor } : null;
}
// o app copia o arquivo pra essa pasta: nada de caminho absoluto ou subir de pasta
function cleanDir(p) {
  if (p == null) return null;
  const s = String(p).trim().split(String.fromCharCode(92)).join('/').replace(/^\.\/+/, '').replace(/\/+$/, '');
  if (!s || s === '.') return '.';
  if (/:|^\/|(^|\/)\.\.(\/|$)/.test(s)) return null; // C:\..., sd:/..., /abs, ../
  return s;
}

async function ask(chunk) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const input = chunk.map((r) => ({ repo: r.repo, jogo: r.title, plataforma: r.platforms.join(', '), readme: r.snippet }));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${PROMPT}\n\n${JSON.stringify(input)}` }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 } }),
      });
      const j = await res.json();
      if (j.error) { console.warn('  ! gemini:', j.error.message); await sleep(20000 * (attempt + 1)); continue; }
      let arr = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
      if (!Array.isArray(arr)) arr = Object.values(arr).find(Array.isArray) || [];
      return arr;
    } catch (e) { console.warn('  ! falhou:', e.message); await sleep(5000); }
  }
  return [];
}

const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
let prev = {};
try { prev = JSON.parse(await fs.readFile(OUT, 'utf8')).repos || {}; } catch {}

// um item por repositório instalável (o mesmo repo pode servir a mais de um jogo)
const byRepo = new Map();
for (const g of catalog.games) {
  if (ONLY && !ONLY.has(g.id)) continue;
  for (const w of g.ways) {
    if (w.kind !== 'install') continue;
    const repo = repoOf(w.repo || w.url);
    if (!repo) continue;
    const k = repo.toLowerCase();
    if (!byRepo.has(k)) byRepo.set(k, { repo, title: g.title, platforms: g.platforms, steps: w.steps || [] });
  }
}
const items = [...byRepo.values()];
console.log(`> ${items.length} repositórios instaláveis`);

await pool(items, 8, async (it) => {
  const md = await readme(it.repo);
  // passos do recomp.gg ajudam quando o README é curto
  it.snippet = `${it.steps.length ? `PASSOS OFICIAIS: ${it.steps.join(' ')}\n` : ''}${relevant(md)}`;
  // a versão do pedido entra no cache: mudou o PROMPT (ex.: campos novos), reprocessa tudo
  it.hash = crypto.createHash('sha1').update(PROMPT).update(it.snippet).digest('hex').slice(0, 12);
});

const out = {};
const todo = [];
for (const it of items) {
  const k = it.repo.toLowerCase();
  if (prev[k]?.src === it.hash) out[k] = prev[k]; else todo.push(it);
}
console.log(`> ${todo.length} pra analisar (${items.length - todo.length} do cache)`);
if (!process.env.GEMINI_API_KEY) console.warn('! sem GEMINI_API_KEY: mantendo só o cache');
else {
  for (let i = 0; i < todo.length; i += 6) {
    const chunk = todo.slice(i, i + 6);
    const arr = await ask(chunk);
    for (const [n, x] of arr.entries()) {
      const it = chunk.find((c) => c.repo.toLowerCase() === String(x.repo || '').toLowerCase()) || (arr.length === chunk.length ? chunk[n] : null);
      if (!it || !x.precisa) continue;
      const { repo: _r, ...rest } = x;
      out[it.repo.toLowerCase()] = { ...rest, formatos: Array.isArray(x.formatos) ? x.formatos : [], hash: cleanHash(x.hash), pasta: cleanDir(x.pasta), src: it.hash };
    }
    // README que não mudou mas falhou agora: fica com a versão antiga
    for (const it of chunk) { const k = it.repo.toLowerCase(); if (!out[k] && prev[k]) out[k] = prev[k]; }
    console.log(`    ${Math.min(i + 6, todo.length)}/${todo.length}`);
  }
}
if (ONLY) for (const [k, v] of Object.entries(prev)) if (!out[k]) out[k] = v;

// onde o HydraHub faz diferente do README (ex.: o próprio app pede o arquivo e compila)
const OVERRIDES = {
  'patchzyy/wiicompiled': {
    comoUsar: 'Clique em Jogar: o HydraHub pede a imagem do disco, compila o jogo uma vez (precisa de uns 20 GB livres) e depois abre direto.',
    obs: 'Sem controle? O teclado vem desligado: no jogo aperte F10 → Controller settings → marque "Keyboard and mouse" (WASD vira, clique esquerdo acelera, clique direito faz drift, Shift usa item, Espaço freia).',
  },
};
for (const [k, v] of Object.entries(OVERRIDES)) if (out[k]) Object.assign(out[k], v);

const count = (p) => Object.values(out).filter((x) => x.precisa === p).length;
console.log(`> rom ${count('rom')} · arquivos ${count('arquivos')} · nada ${count('nada')} · incerto ${count('incerto')}`);
await fs.writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), repos: out }));
