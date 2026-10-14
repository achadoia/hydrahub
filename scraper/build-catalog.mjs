// Monta catalog/catalog.json juntando as 4 fontes de recomps num catálogo único,
// sem jogo repetido: recomp.gg (API), allrecomps.com, recompiledgames.com e a
// lista de repositórios do SirDiabo/GithubLauncher.
//
// Uso: node scraper/build-catalog.mjs [--quick]
//   --quick  limita cada fonte a poucos itens (teste rápido)
//   GEMINI_API_KEY no ambiente → traduz os passos pra pt-BR (cache em catalog/translations.json)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'catalog', 'catalog.json');
const TR_CACHE = path.join(ROOT, 'catalog', 'translations.json');
const QUICK = process.argv.includes('--quick');
const UA = 'HydraHub-catalog/1.0 (+https://github.com/achadoia/hydrahub)';

// ---------- utilidades ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRaw(url, { json = false, tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html,*/*' } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return null;
      return json ? await res.json() : await res.text();
    } catch (e) {
      if (i === tries - 1) { console.warn(`  ! falhou ${url}: ${e.message}`); return null; }
      await sleep(800 * (i + 1) ** 2);
    }
  }
  return null;
}
const getJson = (u) => fetchRaw(u, { json: true });
const getText = (u) => fetchRaw(u);

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0, done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      done++;
      if (done % 50 === 0) console.log(`    ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

const decode = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const strip = (s = '') => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Chave de deduplicação: título sem acento, pontuação, "recompiled", artigos etc.
const ROMAN = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
export function titleKey(t = '') {
  let s = t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\s*\([^)]*\)?\s*$/, '')            // "(Xbox 360)", "(EaglercraftX)" e parêntese cortado
    .replace(/&/g, ' and ')
    .replace(/\bgta\b/g, 'grand theft auto')
    .replace(/\b(recompiled|recomp|recompilation|port|pc port|native port|in your browser|for the web|edition|remastered)\b/g, ' ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  s = s.split(' ').map((w) => ROMAN[w] || w).filter((w) => !['the', 'a', 'an', 'of'].includes(w)).join(' ');
  return s;
}
const repoKey = (url = '') => {
  const m = String(url).match(/github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  return m ? `${m[1]}/${m[2].replace(/\.git$/, '')}`.toLowerCase() : null;
};
const ytId = (url = '') => (String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/) || [])[1] || null;

// Plataformas normalizadas (mesmos ids do recomp.gg)
const PLATFORM_ALIASES = {
  'nintendo 64': 'n64', n64: 'n64', playstation: 'ps1', 'playstation 1': 'ps1', ps1: 'ps1', psx: 'ps1',
  'playstation 2': 'ps2', ps2: 'ps2', 'playstation 3': 'ps3', ps3: 'ps3', 'playstation 4': 'ps4', psp: 'psp',
  'xbox 360': 'xbox-360', xbox: 'xbox', snes: 'snes', 'super nintendo': 'snes', nes: 'nes',
  gamecube: 'gamecube', wii: 'wii', 'wii u': 'wii-u', 'nintendo ds': 'ds', ds: 'ds', 'nintendo 3ds': '3ds',
  'nintendo switch': 'switch', switch: 'switch', 'game boy': 'game-boy', 'game boy color': 'game-boy-color',
  'game boy advance': 'game-boy-advance', gba: 'game-boy-advance', genesis: 'genesis', 'mega drive': 'genesis',
  'sega 32x': '32x', saturn: 'saturn', dreamcast: 'dreamcast', 'master system': 'master-system', 'game gear': 'game-gear',
  arcade: 'arcade', 'neo geo': 'neo-geo', 'pc dos': 'dos', dos: 'dos', 'pc windows': 'pc', pc: 'pc', 'classic mac': 'mac',
  'virtual boy': 'virtual-boy', 'commodore 64': 'c64', web: 'web', browser: 'web',
};
const normPlatform = (raw = '') => { const p = raw.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim(); return PLATFORM_ALIASES[p] || p.replace(/\s+/g, '-'); };

// ---------- Fonte 1: recomp.gg ----------
async function fromRecompGG() {
  console.log('> recomp.gg');
  const B = 'https://recomp.gg/api/v1';
  const list = [];
  let cursor = null;
  do {
    const d = await getJson(`${B}/games?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    if (!d) break;
    list.push(...d.items);
    cursor = d.page?.hasMore ? d.page.nextCursor : null;
  } while (cursor && !QUICK);
  const games = QUICK ? list.slice(0, 25) : list;
  console.log(`  ${games.length} jogos, buscando detalhes + mídia`);

  const details = await pool(games, 6, async (g) => {
    const [d, page] = await Promise.all([getJson(`${B}/games/${g.slug}`), getText(`https://recomp.gg/g/${g.slug}`)]);
    if (!d) return null;
    const media = {};
    if (page) {
      const all = [...new Set(page.match(new RegExp(`/media/(?:index/)?${g.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[a-z0-9._-]+`, 'g')) || [])];
      const pick = (re) => all.find((u) => re.test(u));
      media.cover = pick(/cover-528/) || pick(/cover-264/);
      media.backdrop = pick(/backdrop-\d+/);
      media.screenshots = all.filter((u) => /screenshot-\d+-1280/.test(u)).slice(0, 6);
      for (const k of ['cover', 'backdrop']) if (media[k]) media[k] = `https://recomp.gg${media[k]}`;
      media.screenshots = media.screenshots.map((u) => `https://recomp.gg${u}`);
    }
    return { d, media };
  });

  // Vídeos/artigos (indexados por slug de projeto e de jogo)
  console.log('  conteúdo (vídeos)');
  const content = [];
  cursor = null;
  let pages = 0;
  do {
    const d = await getJson(`${B}/content?limit=100&kind=video${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    if (!d) break;
    content.push(...d.items);
    cursor = d.page?.hasMore ? d.page.nextCursor : null;
  } while (cursor && ++pages < 60 && !QUICK);

  const videosBy = new Map();
  for (const c of content) {
    const id = ytId(c.url);
    if (!id) continue;
    for (const s of c.subjects || []) {
      const key = s.project?.slug ? `p:${s.project.slug}` : s.game?.slug ? `g:${s.game.slug}` : null;
      if (!key) continue;
      if (!videosBy.has(key)) videosBy.set(key, []);
      videosBy.get(key).push({ youtubeId: id, title: c.title, author: c.author || c.outlet || '' });
    }
  }

  const out = [];
  for (const it of details) {
    if (!it) continue;
    const { d, media } = it;
    const projects = [];
    const projSlugs = [];
    for (const role of ['restores', 'modifies', 'host', 'guest', 'extracts']) {
      for (const p of d.projects?.[role] || []) {
        projSlugs.push(p.project.slug);
        projects.push({
          name: p.project.name, repo: p.project.repoUrl, home: p.project.homeUrl, method: p.project.method || p.method,
          stars: p.project.stars, license: p.project.license, pushedAt: p.project.pushedAt, role, source: 'recomp.gg',
        });
      }
    }
    const ways = (d.ways || []).map((w) => ({
      kind: w.kind, url: w.url, needs: w.needs, systems: w.systems || [], inputs: w.inputs || [],
      project: w.project?.name || null, repo: repoKey(w.url) ? `https://github.com/${repoKey(w.url)}` : null,
      release: w.release ? { tag: w.release.tag, url: w.release.url, publishedAt: w.release.publishedAt } : null,
      steps: (w.steps || []).map((s) => s.text), source: 'recomp.gg',
    }));
    const videos = [...(videosBy.get(`g:${d.slug}`) || []), ...projSlugs.flatMap((s) => videosBy.get(`p:${s}`) || [])];
    out.push({
      title: d.title, slug: d.slug, year: d.year, platforms: d.platforms || [], genres: d.genres || [],
      aliases: (d.names || []).map((n) => n.name), studios: d.studios || [],
      cover: media.cover, backdrop: media.backdrop, screenshots: media.screenshots || [],
      projects, ways, videos,
      wiki: (d.externalIds || []).find((x) => x.system === 'wikipedia')?.url || null,
      links: [{ name: 'recomp.gg', url: d.url }],
    });
  }
  console.log(`  ok: ${out.length} jogos, ${content.length} vídeos`);
  return out;
}

// ---------- Fonte 2: allrecomps.com ----------
async function fromAllRecomps() {
  console.log('> allrecomps.com');
  const sm = await getText('https://allrecomps.com/sitemap.xml');
  if (!sm) return [];
  let urls = [...new Set([...sm.matchAll(/<loc>(https:\/\/allrecomps\.com\/games\/[^<]+)<\/loc>/g)].map((m) => m[1]))];
  if (QUICK) urls = urls.slice(0, 25);
  console.log(`  ${urls.length} páginas de projeto`);
  const pages = await pool(urls, 6, async (url) => {
    const s = await getText(url);
    if (!s) return null;
    const ld = [...s.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
    const graph = ld.flatMap((x) => x?.['@graph'] || []);
    const page = graph.find((x) => x['@type'] === 'WebPage');
    const crumbs = graph.find((x) => x['@type'] === 'BreadcrumbList')?.itemListElement || [];
    const consoleName = crumbs[1]?.name || '';
    const desc = page?.description || '';
    const typeM = desc.match(/\)\.\s*([A-Za-z ]+?)\s+—/);
    const text = strip(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/g, ''));
    const sys = (text.match(/Documented target systems\s+(.+?)\s+Sources checked/) || [])[1] || '';
    const hrefs = [...s.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => decode(m[1]));
    const repo = hrefs.find((h) => /github\.com\/[^/]+\/[^/]+\/?$/.test(h) && !/libretro-thumbnails/.test(h))
      || hrefs.find((h) => /(gitlab\.com|codeberg\.org)\/[^/]+\/[^/]+\/?$/.test(h)) || null;
    const releasePage = hrefs.find((h) => /\/releases(\/tag\/[^"]+)?$/.test(h)) || null;
    const quote = (text.match(/“([^”]{20,400})”/) || [])[1] || '';
    const stage = (text.match(/Development stage\s+(.+?)\s+Source/) || [])[1] || '';
    const version = (text.match(/Recorded version\s+(\S+)/) || [])[1] || null;
    const name = (page?.name || '').replace(/\s+—\s+.*$/, '').replace(/\s*\([^)]*$/, '');
    return {
      title: name, platforms: [normPlatform(consoleName)].filter(Boolean),
      cover: page?.primaryImageOfPage?.url || null,
      description: quote,
      projects: [{
        name: page?.name || name, repo, method: (typeM?.[1] || '').toLowerCase() || null,
        systems: sys && sys !== 'Not documented' ? sys.split('·').map((x) => x.trim().toLowerCase()) : [],
        stage, version, releasePage, source: 'allrecomps',
      }],
      ways: repoKey(repo) && /release/i.test(stage) ? [{
        kind: 'install', url: repo, repo, needs: /original game files/i.test(text) ? 'rom' : 'unknown',
        systems: sys && sys !== 'Not documented' ? sys.split('·').map((x) => x.trim().toLowerCase()) : [],
        project: name, release: version ? { tag: version, url: releasePage } : null, steps: [], source: 'allrecomps',
      }] : [],
      links: [{ name: 'AllRecomps', url }],
    };
  });
  const out = pages.filter((p) => p && p.title);
  console.log(`  ok: ${out.length}`);
  return out;
}

// ---------- Fonte 3: recompiledgames.com ----------
async function fromRecompiledGames() {
  console.log('> recompiledgames.com');
  const s = await getText('https://recompiledgames.com/');
  if (!s) return [];
  let rows = [...s.matchAll(/<li class="row"([^>]*)>([\s\S]*?)<\/li>/g)];
  if (QUICK) rows = rows.slice(0, 10);
  const items = await pool(rows, 4, async ([, attrs, body]) => {
    const a = (k) => (attrs.match(new RegExp(`data-${k}="([^"]*)"`)) || [])[1] || '';
    const link = body.match(/<span class="c-game"><a href="([^"]+)">([\s\S]*?)<\/a>(?:<small>([\s\S]*?)<\/small>)?/);
    if (!link) return null;
    const play = (body.match(/<a class="play[^"]*" href="([^"]+)"/) || [])[1] || null;
    const pageUrl = new URL(link[1], 'https://recompiledgames.com/').href;
    const page = await getText(pageUrl);
    let image = null, description = '', hosts = [];
    if (page) {
      const vg = [...page.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).find((x) => x?.['@type'] === 'VideoGame');
      image = vg?.image || null;
      description = vg?.description || '';
      hosts = [...page.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
        .map(([, h, t]) => ({ url: decode(h), label: strip(t) }))
        .filter((x) => !/wikipedia|x\.com|twitter|google|dexerto|recompiledgames\.com/.test(x.url));
    }
    const kind = a('kind') === 'browser' ? 'browser' : a('kind') === 'files' ? 'files' : 'install';
    const assets = a('assets');
    return {
      title: strip(link[2]), platforms: [normPlatform(a('plat'))],
      cover: image, description,
      ways: play ? [{
        kind, url: play, needs: assets === 'instant' ? 'nothing' : assets || 'unknown', systems: kind === 'browser' ? ['browser'] : [],
        project: strip(link[3] || ''), steps: [], source: 'recompiledgames', multiplayer: a('mp') === '1', working: a('ok') === '1',
      }] : [],
      extraLinks: hosts.slice(0, 4),
      links: [{ name: 'Recompiled Games', url: pageUrl }],
    };
  });
  const out = items.filter(Boolean);
  console.log(`  ok: ${out.length}`);
  return out;
}

// ---------- Fonte 4: SirDiabo/GithubLauncher ----------
// ports com nome próprio apontam pro jogo original (evita "jogo" duplicado)
const PORT_TO_GAME = {
  'ship of harkinian': 'The Legend of Zelda: Ocarina of Time',
  '2 ship 2 harkinian': "The Legend of Zelda: Majora's Mask",
  'zelda 64': "The Legend of Zelda: Majora's Mask",
  starship: 'Star Fox 64',
  spaghettikart: 'Mario Kart 64',
  ghostship: 'Super Mario 64',
  'super mario 64: coop deluxe': 'Super Mario 64',
  banjo: 'Banjo-Kazooie',
  'goemon 64': 'Mystical Ninja Starring Goemon',
};
async function fromGithubLauncher() {
  console.log('> SirDiabo/GithubLauncher');
  const files = [
    'https://raw.githubusercontent.com/SirDiabo/GithubLauncher/v1.70/Services/N64RecompLauncherProfile.cs',
    'https://raw.githubusercontent.com/SirDiabo/GithubLauncher/main/Services/GithubLauncherProfile.cs',
    'https://raw.githubusercontent.com/SirDiabo/GithubLauncher/main/apps.json',
  ];
  const seen = new Set();
  const out = [];
  for (const f of files) {
    const s = await getText(f);
    if (!s) continue;
    // cada entrada é um bloco `new { ... }` (C#) ou `{ ... }` (apps.json)
    for (const block of s.match(/\{[^{}]*repository[^{}]*\}/g) || []) {
      const field = (k) => (block.match(new RegExp(`"?${k}"?\\s*[=:]\\s*"([^"]*)"`)) || [])[1];
      const name = field('name'), repo = field('repository'), icon = field('gameIconUrl') || field('appIconUrl');
      if (!name || !repo) continue;
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || seen.has(repo.toLowerCase()) || /GithubLauncher|N64RecompLauncher/i.test(repo)) continue;
      seen.add(repo.toLowerCase());
      out.push({
        title: PORT_TO_GAME[name.replace(/:\s*Recompiled$/i, '').toLowerCase()] || name.replace(/:\s*Recompiled$/i, ''), platforms: ['n64'],
        icon: icon && icon !== 'null' ? icon : null,
        projects: [{ name, repo: `https://github.com/${repo}`, method: /recomp/i.test(name + repo) ? 'recompilation' : 'decompilation', source: 'GithubLauncher' }],
        ways: [{ kind: 'install', url: `https://github.com/${repo}`, repo: `https://github.com/${repo}`, needs: 'rom', systems: ['windows', 'linux'], steps: [], source: 'GithubLauncher' }],
        links: [{ name: 'GithubLauncher', url: 'https://github.com/SirDiabo/GithubLauncher' }],
      });
    }
  }
  console.log(`  ok: ${out.length}`);
  return out;
}

// ---------- Fonte 5: wasmarcade.com (ports de PC no navegador) ----------
// Só os ports (páginas de 1º nível). /retro-games/ (ROMs de fliperama hospedadas
// pelo site) e /flash-games/ (Ruffle) ficam de fora: não são recomps.
async function fromWasmArcade() {
  console.log('> wasmarcade.com');
  const sm = await getText('https://wasmarcade.com/sitemap.xml');
  if (!sm) return [];
  const entries = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, u]) => ({
    loc: (u.match(/<loc>(.*?)<\/loc>/) || [])[1],
    image: (u.match(/<image:loc>(.*?)<\/image:loc>/) || [])[1],
  })).filter((e) => e.loc && e.image && /^https:\/\/wasmarcade\.com\/[^/]+$/.test(e.loc));
  const items = await pool(entries, 3, async ({ loc, image }) => {
    const s = await getText(loc);
    if (!s) return null;
    const meta = (k) => decode((s.match(new RegExp(`<meta (?:name|property)="${k}" content="([^"]*)"`)) || [])[1] || '');
    const graph = [...s.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => { try { const j = JSON.parse(m[1]); return j['@graph'] || [j]; } catch { return []; } });
    const vg = graph.find((x) => x['@type'] === 'VideoGame') || {};
    const crumb = graph.find((x) => x['@type'] === 'BreadcrumbList')?.itemListElement?.[1]?.name;
    const title = vg.name || crumb;
    if (!title) return null;
    const text = strip(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/g, ''));
    const host = (text.match(/loads from ([a-z0-9.-]+\.[a-z]{2,})/i) || [])[1] || null;
    const engine = (text.match(/·\s*([A-Za-z0-9 ]+ port)\s*·/) || [])[1] || 'Port WebAssembly';
    const year = +((text.match(/Released\s+(\d{4})/) || [])[1]) || null;
    return {
      title, year, platforms: ['pc'], cover: image, backdrop: meta('og:image') || null,
      description: meta('description'),
      ways: [{
        kind: 'browser', url: loc, needs: 'nothing', systems: ['browser'], project: `WASM Arcade · ${engine}`,
        steps: [], source: 'wasmarcade', externalHost: host && !/wasmarcade/.test(host) ? host : null,
      }],
      links: [{ name: 'WASM Arcade', url: loc }],
    };
  });
  const out = items.filter(Boolean);
  console.log(`  ok: ${out.length}`);
  return out;
}

// ---------- Emuladores com download direto (fora do GitHub) ----------
// Frame Perfect: emulador arcade com rollback netcode; a API oficial dá a versão e os links.
async function fromFramePerfect() {
  console.log('> frameperfect.cc');
  const api = 'https://www.frameperfect.cc/api/app/version/';
  const v = await getJson(api);
  if (!v?.full_download_url) return [];
  const file = (url, size, label) => (url ? { name: decodeURIComponent(url.split('/').pop()), url, size: size || 0, label } : null);
  console.log(`  ok: v${v.latest_version}`);
  return [{
    title: 'Frame Perfect', platforms: ['arcade'], genres: ['emulador', 'luta'], category: 'emulador',
    cover: 'assets/covers/frameperfect.jpg', backdrop: 'assets/covers/frameperfect-site-1.jpg',
    // prints do próprio frameperfect.cc (vídeo do YouTube por busca não acertava o emulador)
    screenshots: [1, 2, 3, 4, 5, 6].map((n) => `assets/covers/frameperfect-site-${n}.jpg`),
    noVideos: true,
    description: 'Emulador retrô brasileiro com rollback netcode: jogue clássicos de luta dos anos 90 online sem lag, com salas ranqueadas, treino offline, filtro CRT e detecção automática de controles arcade e USB. Roda The King of Fighters 2002 e 98, Real Bout Fatal Fury, Street Fighter II (CE e Super Turbo), Street Fighter Alpha 2 e Vampire Savior.',
    projects: [{ name: 'Frame Perfect', home: 'https://www.frameperfect.cc/', method: 'emulator', source: 'frameperfect' }],
    ways: [{
      kind: 'install', url: 'https://www.frameperfect.cc/', needs: 'unknown', systems: ['windows'], project: 'Frame Perfect',
      release: { tag: `v${v.latest_version}`, url: 'https://www.frameperfect.cc/' },
      direct: {
        api, version: v.latest_version, sha256: v.sha256 || null,
        exeHint: ['FramePerfect.exe', 'RbfLauncher.exe'],
        files: [
          file(v.full_download_url, v.full_file_size_bytes, 'Pacote portátil (.zip)'),
          file(v.installer_download_url || v.exe_download_url, v.installer_file_size_bytes, 'Instalador (.exe)'),
          file(v.installer_win7_download_url, v.installer_win7_file_size_bytes, 'Instalador Windows 7 (.exe)'),
        ].filter(Boolean),
      },
      steps: [], stepsPt: null, source: 'frameperfect',
      stepsFixedPt: [
        'Clique em <b>Instalar</b>: o HydraHub baixa o pacote portátil oficial (.zip) direto do frameperfect.cc e extrai pra você.',
        'Clique em <b>Jogar</b> pra abrir o launcher (RbfLauncher / FramePerfect.exe). As próximas versões se atualizam sozinhas pelo updater do próprio Frame Perfect.',
        'Crie sua conta no launcher pra entrar nas salas online e nas partidas ranqueadas.',
        'Prefere instalar no Windows com atalhos? Use o botão <b>Instalador (.exe)</b> em Downloads, logo abaixo.',
      ],
    }],
    links: [{ name: 'Frame Perfect', url: 'https://www.frameperfect.cc/' }],
  }];
}

// ---------- Junção sem repetir ----------
function slugify(t) { return titleKey(t).replace(/\s+/g, '-') || 'jogo'; }

function merge(sources) {
  const games = [];
  const byTitle = new Map();
  const byRepo = new Map();

  const attach = (g, item) => {
    for (const p of item.platforms || []) if (p && !g.platforms.includes(p)) g.platforms.push(p);
    for (const k of ['year', 'cover', 'backdrop', 'wiki', 'icon', 'category', 'noVideos']) if (!g[k] && item[k]) g[k] = item[k];
    if (!g.description && item.description) g.description = item.description;
    if (!g.screenshots.length && item.screenshots?.length) g.screenshots = item.screenshots;
    for (const a of item.aliases || []) if (!g.aliases.includes(a)) g.aliases.push(a);
    for (const x of item.genres || []) if (!g.genres.includes(x)) g.genres.push(x);
    for (const p of item.projects || []) {
      const rk = repoKey(p.repo);
      const ex = rk ? g.projects.find((q) => repoKey(q.repo) === rk) : g.projects.find((q) => q.name === p.name && !q.repo);
      if (ex) {
        for (const [k, v] of Object.entries(p)) if (ex[k] == null || (Array.isArray(ex[k]) && !ex[k].length)) ex[k] = v;
        ex.sources = [...new Set([...(ex.sources || [ex.source]), p.source])];
      } else g.projects.push({ ...p, sources: [p.source] });
      if (rk && (!p.role || p.role === 'restores')) byRepo.set(rk, g);
    }
    for (const w of item.ways || []) {
      const ex = g.ways.find((q) => q.url === w.url || (repoKey(q.url) && repoKey(q.url) === repoKey(w.url) && q.kind === w.kind));
      if (ex) { if (!ex.steps?.length && w.steps?.length) ex.steps = w.steps; if (!ex.systems?.length) ex.systems = w.systems; }
      else g.ways.push(w);
      const rk = repoKey(w.url);
      const owner = (item.projects || []).find((p) => repoKey(p.repo) === rk);
      if (rk && (!owner || !owner.role || owner.role === 'restores')) byRepo.set(rk, g);
    }
    for (const v of item.videos || []) if (!g.videos.some((x) => x.youtubeId === v.youtubeId)) g.videos.push(v);
    for (const l of [...(item.links || []), ...(item.extraLinks || [])]) if (!g.links.some((x) => x.url === l.url)) g.links.push(l.name ? l : { name: l.label, url: l.url });
    byTitle.set(titleKey(item.title), g);
    for (const a of item.aliases || []) { const k = titleKey(a); if (k.length > 3 && !byTitle.has(k)) byTitle.set(k, g); }
  };

  for (const items of sources) {
    for (const item of items) {
      const repos = [...(item.projects || []).filter((p) => !p.role || p.role === 'restores'), ...(item.ways || [])].map((p) => repoKey(p.repo || p.url)).filter(Boolean);
      let g = repos.map((r) => byRepo.get(r)).find(Boolean) || byTitle.get(titleKey(item.title));
      if (!g) {
        g = { id: null, title: item.title, aliases: [], year: null, platforms: [], genres: [], studios: item.studios || [], cover: null, backdrop: null, screenshots: [], description: '', projects: [], ways: [], videos: [], links: [], wiki: null };
        games.push(g);
      }
      attach(g, item);
    }
  }

  const used = new Set();
  for (const g of games) {
    let id = slugify(g.title);
    while (used.has(id)) id += '-2';
    used.add(id);
    g.id = id;
    const kinds = new Set(g.ways.map((w) => w.kind));
    g.playable = kinds.has('install') || kinds.has('browser') || kinds.has('files');
    g.kinds = [...kinds];
    g.stars = Math.max(0, ...g.projects.map((p) => p.stars || 0));
    g.videos = g.videos.slice(0, 8);
    g.sources = [...new Set(g.links.map((l) => l.name).filter((n) => ['recomp.gg', 'AllRecomps', 'Recompiled Games', 'GithubLauncher', 'WASM Arcade', 'Frame Perfect'].includes(n)))];
    // jogo instalável primeiro, depois navegador; dentro disso, os mais populares
    g.ways.sort((a, b) => ({ install: 0, browser: 1, files: 2, source: 3 }[a.kind] ?? 4) - ({ install: 0, browser: 1, files: 2, source: 3 }[b.kind] ?? 4));
  }
  games.sort((a, b) => (b.playable - a.playable) || (b.stars - a.stars) || a.title.localeCompare(b.title));
  return games;
}

// ---------- Tradução opcional dos passos (Gemini) ----------
async function translateSteps(games) {
  let cache = {};
  try { cache = JSON.parse(await fs.readFile(TR_CACHE, 'utf8')); } catch {}
  const key = process.env.GEMINI_API_KEY;
  const texts = [...new Set(games.flatMap((g) => [g.description, ...g.ways.flatMap((w) => w.steps || [])]).filter(Boolean))];
  const missing = texts.filter((t) => !cache[t]);
  if (key && missing.length) {
    console.log(`> traduzindo ${missing.length} textos pra pt-BR`);
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    for (let i = 0; i < missing.length; i += 12) {
      const chunk = missing.slice(i, i + 12);
      const prompt = 'Traduza cada item deste array JSON para português do Brasil, num tom direto e amigável de tutorial gamer. Mantenha nomes de jogos, sistemas, extensões de arquivo (.z64, .iso) e termos técnicos (ROM, mod, release, Steam Deck) como estão. Responda APENAS com um array JSON de strings na mesma ordem.\n\n' + JSON.stringify(chunk);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 8192 } }),
        });
        const j = await res.json();
        const arr = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
        if (Array.isArray(arr) && arr.length === chunk.length) chunk.forEach((t, k) => { cache[t] = arr[k]; });
        else console.warn('  ! tradução fora do formato, pulando bloco');
      } catch (e) { console.warn('  ! tradução falhou:', e.message); }
      await fs.writeFile(TR_CACHE, JSON.stringify(cache, null, 0));
    }
  }
  for (const g of games) {
    if (g.description) g.descriptionPt = cache[g.description] || null;
    for (const w of g.ways) if (w.steps?.length) w.stepsPt = w.steps.map((s) => cache[s] || null);
  }
}

// ---------- Vídeos do YouTube pros jogos jogáveis sem vídeo (cache em catalog/videos.json) ----------
const VID_CACHE = path.join(ROOT, 'catalog', 'videos.json');
async function findVideos(games) {
  let cache = {};
  try { cache = JSON.parse(await fs.readFile(VID_CACHE, 'utf8')); } catch {}
  const todo = games.filter((g) => g.playable && !g.noVideos && !cache[g.id]).slice(0, QUICK ? 5 : 600);
  if (todo.length) console.log(`> buscando vídeos no YouTube pra ${todo.length} jogos`);
  await pool(todo, 3, async (g) => {
    const kind = g.kinds.includes('install') ? 'recomp pc' : 'browser';
    const q = encodeURIComponent(`${g.title} ${kind}`);
    const html = await fetchRaw(`https://www.youtube.com/results?search_query=${q}&hl=en`);
    if (!html) return;
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return;
    const found = [];
    const walk = (o) => {
      if (!o || typeof o !== 'object' || found.length >= 4) return;
      if (o.videoRenderer?.videoId) {
        const v = o.videoRenderer;
        const title = v.title?.runs?.map((r) => r.text).join('') || '';
        const len = v.lengthText?.simpleText || '';
        const secs = len.split(':').reduce((a, b) => a * 60 + +b, 0);
        if (secs >= 45) found.push({ youtubeId: v.videoId, title, author: v.ownerText?.runs?.[0]?.text || '', length: len });
        return;
      }
      for (const k in o) walk(o[k]);
    };
    try { walk(JSON.parse(m[1])); } catch { return; }
    // só aceita vídeo cujo título cita o jogo (evita resultado aleatório)
    const words = titleKey(g.title).split(' ').filter((w) => w.length > 2);
    cache[g.id] = found.filter((v) => { const t = titleKey(v.title); return !words.length || words.filter((w) => t.includes(w)).length >= Math.ceil(words.length / 2); }).slice(0, 2);
    await sleep(300);
  });
  await fs.writeFile(VID_CACHE, JSON.stringify(cache));
  for (const g of games) for (const v of (g.noVideos ? [] : cache[g.id] || [])) if (!g.videos.some((x) => x.youtubeId === v.youtubeId)) g.videos.push({ ...v, from: 'youtube' });
}

// ---------- Links de navegador: testa se ainda estão no ar ----------
async function checkLinks(games) {
  const ways = games.flatMap((g) => g.ways.filter((w) => w.kind === 'browser'));
  const urls = [...new Set(ways.map((w) => w.url))];
  console.log(`> testando ${urls.length} links de navegador`);
  const status = new Map();
  await pool(urls, 8, async (url) => {
    let alive = false, code = 0;
    for (let i = 0; i < 2 && !alive; i++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', Accept: 'text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
        code = res.status;
        // 403/429 = proteção anti-robô (Cloudflare etc.): o site existe
        alive = res.ok || code === 403 || code === 429;
        // cópia do Wayback abre a página, mas o jogo não roda (assets não arquivados)
        if (/web\.archive\.org/.test(url)) alive = false;
        res.body?.cancel().catch(() => {});
      } catch { await sleep(1500); }
    }
    status.set(url, { alive, code });
  });
  const now = new Date().toISOString();
  for (const w of ways) { const st = status.get(w.url); w.alive = st.alive; w.httpStatus = st.code; w.checkedAt = now; }
  for (const g of games) {
    g.browserOnline = g.ways.some((w) => w.kind === 'browser' && w.alive);
    // jogo só de navegador com todos os links mortos deixa de contar como jogável
    if (!g.kinds.includes('install') && !g.kinds.includes('files') && g.kinds.includes('browser') && !g.browserOnline) g.playable = false;
  }
  console.log(`  no ar: ${[...status.values()].filter((x) => x.alive).length}/${urls.length}`);
}

// ---------- main ----------
const t0 = Date.now();
const results = await Promise.allSettled([fromRecompGG(), fromAllRecomps(), fromRecompiledGames(), fromGithubLauncher(), fromWasmArcade(), fromFramePerfect()]);
const [rgg, ar, rcg, gl, wa, fp] = results.map((r) => (r.status === 'fulfilled' ? r.value : (console.warn(r.reason), [])));
// ordem importa: recomp.gg (mais rico) define o jogo; os outros completam
const games = merge([rgg, gl, ar, rcg, wa, fp]);
await translateSteps(games);
await findVideos(games);
await checkLinks(games);

let previous = null;
try { previous = JSON.parse(await fs.readFile(OUT, 'utf8')); } catch {}
if (previous && games.length < previous.games.length * 0.6) {
  console.error(`Catálogo novo (${games.length}) bem menor que o anterior (${previous.games.length}); fonte fora do ar? Mantendo o anterior.`);
  process.exit(1);
}

const catalog = {
  version: 1,
  generatedAt: new Date().toISOString(),
  counts: { games: games.length, playable: games.filter((g) => g.playable).length, browserOnline: games.filter((g) => g.browserOnline).length, recompgg: rgg.length, allrecomps: ar.length, recompiledgames: rcg.length, githublauncher: gl.length, wasmarcade: wa.length, emuladores: fp.length },
  games,
};
await fs.writeFile(OUT, JSON.stringify(catalog));
console.log(`\nCatálogo: ${games.length} jogos únicos (${catalog.counts.playable} jogáveis) em ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(ROOT, OUT)}`);
