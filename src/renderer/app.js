import { icon } from './icons.js';
import { TUTORIALS, tutorialCover } from './tutorials.js';
import { COPY_GUIDE, COPY_FALLBACK } from './copia.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = $('#view');

const PLATFORMS = {
  n64: 'Nintendo 64', pc: 'PC', ps1: 'PlayStation', ps2: 'PlayStation 2', ps3: 'PlayStation 3', ps4: 'PlayStation 4',
  'xbox-360': 'Xbox 360', xbox: 'Xbox', snes: 'Super Nintendo', nes: 'NES', gamecube: 'GameCube', wii: 'Wii', 'wii-u': 'Wii U',
  ds: 'Nintendo DS', '3ds': 'Nintendo 3DS', switch: 'Switch', 'game-boy': 'Game Boy', 'game-boy-color': 'Game Boy Color',
  'game-boy-advance': 'Game Boy Advance', genesis: 'Mega Drive', '32x': '32X', saturn: 'Saturn', dreamcast: 'Dreamcast',
  'master-system': 'Master System', 'game-gear': 'Game Gear', arcade: 'Arcade', dos: 'DOS', web: 'Web', psp: 'PSP',
  'virtual-boy': 'Virtual Boy', mac: 'Mac', 'neo-geo': 'Neo Geo', 'apple-ii': 'Apple II', 'zx-spectrum': 'ZX Spectrum', msx: 'MSX',
};
const platName = (p) => PLATFORMS[p] || p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const METHOD = { emulator: 'Emulador', recompilation: 'Recompilação', decompilation: 'Decompilação', reimplementation: 'Reimplementação', 'source port': 'Source port', port: 'Port', remake: 'Remake' };
const NEEDS = { nothing: 'Não precisa de nada', rom: 'Precisa da sua ROM', files: 'Precisa dos arquivos do jogo', unknown: 'Confira no passo a passo', game: 'Precisa do jogo original', instant: 'Joga na hora' };
const fmtBytes = (n) => (!n ? '' : n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const repoOf = (url = '') => (String(url).match(/github\.com\/([^/\s?#]+\/[^/\s?#]+)/i) || [])[1]?.replace(/\.git$/, '') || null;

// ---------- Achado IA (criador do HydraHub) ----------
const ACHADO = [
  { id: 'site', label: 'achadoia.com', url: 'https://achadoia.com', icon: 'globe', text: 'O site do Achado IA: repositórios, ferramentas e jogos que valem a pena.' },
  { id: 'youtube', label: 'YouTube', handle: '@achadoia', url: 'https://www.youtube.com/@achadoia', icon: 'youtube', text: 'Shorts todo dia com os achados do GitHub e de IA.' },
  { id: 'instagram', label: 'Instagram', handle: '@achadoia', url: 'https://www.instagram.com/achadoia/', icon: 'instagram', text: 'Reels, tutoriais e os links dos vídeos no direct.' },
  { id: 'tiktok', label: 'TikTok', handle: '@achadoiaoficial', url: 'https://www.tiktok.com/@achadoiaoficial', icon: 'tiktok', text: 'Os mesmos achados, no formato TikTok.' },
];
function renderAchado() {
  $('#achado').innerHTML = `
    <a class="achado-brand" href="https://achadoia.com" title="achadoia.com"><img src="assets/achadoia.png" alt=""><div><small>UM PROJETO</small><b>Achado IA</b></div></a>
    <div class="achado-links">${ACHADO.map((l) => `<a href="${l.url}" title="${l.label}${l.handle ? ` ${l.handle}` : ''}">${icon(l.icon)}</a>`).join('')}</div>`;
}

// ---------- estado ----------
const state = {
  catalog: null, games: [], byId: new Map(), installed: {}, settings: {}, downloads: new Map(), info: {},
  filter: { kind: 'playable', platform: '', sort: 'popular', q: '' }, shown: 60,
};
const G = (id) => state.byId.get(id);

// ---------- navegação ----------
const NAV = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'tutoriais', label: 'Tutoriais', icon: 'book' },
  { id: 'jogos', label: 'Jogos Recompilados', icon: 'gamepad' },
  { id: 'repos', label: 'Repositórios', icon: 'github' },
  { id: 'biblioteca', label: 'Minha Biblioteca', icon: 'library' },
  { id: 'comunidade', label: 'Comunidade', icon: 'users' },
  { id: 'links', label: 'Links Úteis', icon: 'link' },
  { id: 'config', label: 'Configurações', icon: 'gear' },
];
function renderNav(active) {
  const n = Object.keys(state.installed).length;
  $('#nav').innerHTML = NAV.map((i) => `<a class="nav-item ${i.id === active ? 'active' : ''}" href="#/${i.id}">${icon(i.icon)}<span>${i.label}</span>${i.id === 'biblioteca' && n ? `<em class="count">${n}</em>` : ''}${i.id === 'repos' && state.repos ? `<em class="count">${state.repos.repos.length}</em>` : ''}${i.id === 'jogos' && state.games.length ? `<em class="count">${state.games.filter((g) => g.playable).length}</em>` : ''}</a>`).join('');
}

function route() {
  const [, rawPage = 'inicio', arg] = (location.hash || '#/inicio').split('?')[0].split('/');
  const page = rawPage || 'inicio';
  const map = { jogo: 'jogos', tutorial: 'tutoriais', repo: 'repos' };
  renderNav(map[page] || page);
  view.scrollTop = 0;
  const pages = { inicio: pageHome, tutoriais: pageTutorials, tutorial: pageTutorial, jogos: pageGames, jogo: pageGame, repos: pageRepos, repo: pageRepo, biblioteca: pageLibrary, comunidade: pageCommunity, links: pageLinks, config: pageSettings };
  (pages[page] || pageHome)(decodeURIComponent(arg || ''));
}
window.addEventListener('hashchange', route);

// ---------- componentes ----------
function cover(g, { small } = {}) {
  const img = g.cover || g.icon;
  const inst = state.installed[g.id];
  const badges = [];
  if (g.category === 'emulador') badges.push(`<span class="tag warn">${icon('chip')}Emulador</span>`);
  if (g.kinds?.includes('install')) badges.push(`<span class="tag cyan">${icon('download')}PC</span>`);
  if (g.kinds?.includes('browser') && g.browserOnline !== false) badges.push(`<span class="tag">${icon('browser')}Web</span>`);
  return `<a class="game-card" href="#/jogo/${g.id}" title="${esc(g.title)}">
    <div class="cover">
      ${img ? `<img src="${esc(img)}" loading="lazy" alt="" onerror="this.remove()">` : ''}
      ${img ? '' : `<div class="ph"><div><img src="assets/logo-128.png" alt="">${esc(g.title)}</div></div>`}
      ${small ? '' : `<div class="badges">${badges.join('')}</div>`}
      ${inst ? `<span class="installed-flag" title="Instalado">${icon('check')}</span>` : ''}
    </div>
    <div class="gc-title">${esc(g.title)}</div>
    <div class="gc-sub">${esc(g.platforms.slice(0, 2).map(platName).join(' · '))}${g.year ? ` · ${g.year}` : ''}</div>
  </a>`;
}

function videoBlock(v) {
  return `<div class="video" data-yt="${esc(v.youtubeId)}">
    <div class="poster-btn" style="background-image:url(https://i.ytimg.com/vi/${esc(v.youtubeId)}/hqdefault.jpg)">
      <div class="play">${icon('play')}</div>
      <div class="vt">${esc(v.title || 'Vídeo')}<small>${esc(v.author || 'YouTube')}${v.length ? ` · ${esc(v.length)}` : ''}</small></div>
    </div></div>`;
}

function toast(text, type = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'ok' ? 'check' : type === 'error' ? 'alert' : 'info')}<span>${esc(text)}</span>`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), ms);
}

// imagem que não carrega some (o CSP bloqueia onerror inline)
document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);

// cliques globais: vídeos, links externos, lightbox
document.addEventListener('click', (e) => {
  const poster = e.target.closest('.video .poster-btn');
  if (poster) {
    const id = poster.parentElement.dataset.yt;
    poster.parentElement.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    return;
  }
  const a = e.target.closest('a[href]');
  if (a && /^https?:/.test(a.getAttribute('href'))) { e.preventDefault(); window.hydra.open(a.href); return; }
  const shot = e.target.closest('.shots img');
  if (shot) { const lb = $('#lightbox'); lb.innerHTML = `<img src="${shot.src.replace('-640', '-1280')}">`; lb.hidden = false; return; }
  if (e.target.closest('#lightbox')) $('#lightbox').hidden = true;
  if (!e.target.closest('#downloads-panel, #btn-downloads')) $('#downloads-panel').hidden = true;
  if (!e.target.closest('.search, #search-results')) $('#search-results').hidden = true;
});

// ---------- INÍCIO ----------
function heroGames() {
  const all = state.games.filter((g) => g.playable && g.backdrop && g.kinds.includes('install'));
  return [...all.filter((g) => g.featured).sort((a, b) => a.featured - b.featured), ...all.filter((g) => !g.featured)].slice(0, 8);
}
function recentGames() {
  const latest = (g) => g.ways.reduce((m, w) => Math.max(m, w.release?.publishedAt ? Date.parse(w.release.publishedAt) : 0), 0);
  return state.games.filter((g) => g.playable && g.kinds.includes('install') && (g.cover || g.icon)).map((g) => [g, latest(g)]).filter(([, t]) => t).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([g]) => g);
}
let heroTimer;
function pageHome() {
  const c = state.catalog?.counts || {};
  const heroes = heroGames();
  view.innerHTML = `
  <div class="home">
    <div>
      <section class="hero">
        <div class="hero-bg" id="hero-bg"></div><div class="hero-bg next" id="hero-bg2"></div>
        <div class="hero-content">
          <h1>Tutoriais passo a passo e links de jogos recompilados, tudo em <span class="accent">um só lugar.</span></h1>
          <span class="bar"></span>
        </div>
        <div class="hero-meta"><span id="hero-name"></span><div class="hero-dots">${heroes.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div></div>
      </section>
      <div class="quick">
        ${quickCard('tutoriais', 'book', 'Tutoriais', 'Aprenda de forma simples e direta.')}
        ${quickCard('jogos', 'gamepad', 'Jogos Recompilados', 'Títulos recentes, em um só link.')}
        ${quickCard('comunidade', 'users', 'Comunidade', 'Tire dúvidas, compartilhe e fique por dentro.')}
      </div>
      <div class="surprise-bar card"><div><b>Não sabe o que jogar ou testar?</b><span>A gente escolhe um jogo ou repositório pra você.</span></div>${surpriseBtn('games', 'Jogo surpresa')}${surpriseBtn('repos', 'Repo surpresa')}</div>
      ${rankingsSection()}
      <div class="section-head"><h2>Jogos Recompilados Recentes</h2><a href="#/jogos?sort=recent">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${recentGames().map((g) => cover(g)).join('')}</div>
      <div class="section-head"><h2>Mais populares</h2><a href="#/jogos">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${state.games.filter((g) => g.playable && g.kinds.includes('install') && g.cover).slice(0, 16).map((g) => cover(g)).join('')}</div>
      ${reposHomeSection()}
      <div class="section-head"><h2>Online agora no navegador</h2><a href="#/jogos?kind=browser">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${state.games.filter((g) => g.kinds.includes('browser') && g.browserOnline && g.cover).slice(0, 16).map((g) => cover(g)).join('')}</div>
      ${state.games.some((g) => g.category === 'emulador') ? `<div class="section-head"><h2>Emuladores</h2><a href="#/jogos?kind=emulator">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${state.games.filter((g) => g.category === 'emulador').map((g) => cover(g)).join('')}</div>` : ''}
      <div class="section-head"><h2>Tutoriais em destaque</h2><a href="#/tutoriais">Ver todos ${icon('arrow')}</a></div>
      <div class="tut-grid">${[...featuredGames().map(gameTutCard), ...TUTORIALS.map(tutCard)].slice(0, 3).join('')}</div>
    </div>
    <aside class="aside card">
      <div class="brand-mini"><img src="assets/logo-128.png" alt=""><span>Hydra<i>Hub</i></span></div>
      <h2>Jogue mais. Descubra mais.</h2>
      <span class="bar"></span>
      ${feature('bolt', 'Links verificados', 'Direto do GitHub oficial de cada projeto.')}
      ${feature('shield', 'Conteúdo atualizado', 'Catálogo renovado todo dia, sozinho.')}
      ${feature('star', 'Tutoriais detalhados', 'Do básico ao avançado, em português.')}
      ${feature('users', 'Comunidade ativa', 'Troque ideias e tire dúvidas.')}
      <div class="stats">
        <div class="stat"><b>${(c.games || 0).toLocaleString('pt-BR')}</b><span>JOGOS NO CATÁLOGO</span></div>
        <div class="stat"><b>${(c.playable || 0).toLocaleString('pt-BR')}</b><span>JOGÁVEIS AGORA</span></div>
        <div class="stat"><b>5</b><span>FONTES UNIDAS</span></div>
        <div class="stat"><b>${Object.keys(state.installed).length}</b><span>INSTALADOS</span></div>
      </div>
      <p class="muted" style="font-size:11.5px;margin:18px 0 0">Catálogo de ${fmtDate(state.catalog?.generatedAt)}. Fontes: recomp.gg, AllRecomps, Recompiled Games, WASM Arcade e GithubLauncher.</p>
    </aside>
  </div>`;
  // carrossel do banner
  clearInterval(heroTimer);
  let i = 0, front = $('#hero-bg'), back = $('#hero-bg2');
  const show = (k) => {
    const g = heroes[k];
    if (!g) return;
    back.style.backgroundImage = `url("${g.backdrop}")`;
    back.classList.remove('next'); front.classList.add('next');
    [front, back] = [back, front];
    const name = $('#hero-name');
    if (!name) return clearInterval(heroTimer);
    name.innerHTML = `<a href="#/jogo/${g.id}" style="color:inherit"><b>${esc(g.title)}</b></a>`;
    $$('.hero-dots i').forEach((d, j) => d.classList.toggle('on', j === k));
  };
  if (heroes.length) { show(0); heroTimer = setInterval(() => { i = (i + 1) % heroes.length; show(i); }, 6000); }
  $$('.hero-dots i').forEach((d) => d.addEventListener('click', () => { i = +d.dataset.i; show(i); }));
  bindRankings();
}
const quickCard = (to, ic, t, p) => `<a class="quick-card card" href="#/${to}"><div class="qh">${icon(ic)}<h3>${t}</h3></div><p>${p}</p><span class="arrow">${icon('arrow')}</span></a>`;
const feature = (ic, t, s) => `<div class="feature"><div class="ring">${icon(ic)}</div><div><b>${t}</b><span>${s}</span></div></div>`;

// ---------- TUTORIAIS ----------
function tutCard(t) {
  const img = tutorialCover(t, G);
  return `<a class="tut-card card" href="#/tutorial/${t.id}">
    <div class="thumb" style="${img ? `background-image:url('${img}')` : 'background:linear-gradient(135deg,#1d2a33,#111418)'}"><span class="tag cyan lvl">${icon(t.icon)}${t.level}</span></div>
    <div class="body"><h3>${esc(t.title)}</h3><p>${esc(t.summary)}</p><div class="foot">${icon('clock')}${t.minutes} min de leitura</div></div>
  </a>`;
}
// tutoriais dos jogos em destaque: vêm do catálogo online (passo a passo + prints + vídeo na página do jogo)
const featuredGames = () => state.games.filter((g) => g.featured).sort((a, b) => a.featured - b.featured);
function gameTutCard(g) {
  const w = g.ways.find((x) => x.stepsFixedPt?.length);
  return `<a class="tut-card card" href="#/jogo/${g.id}">
    <div class="thumb" style="background-image:url('${esc(g.backdrop || g.cover)}')"><span class="tag cyan lvl">${icon('gamepad')}No PC</span></div>
    <div class="body"><h3>Como jogar ${esc(g.title)} no PC</h3><p>${esc((g.descriptionPt || g.description || '').split('. ')[0])}.</p><div class="foot">${icon('clock')}${w ? `${w.stepsFixedPt.length} passos` : 'Passo a passo'} · com prints e vídeo</div></div>
  </a>`;
}
function pageTutorials() {
  const withVideos = state.games.filter((g) => g.playable && g.kinds.includes('install') && g.videos?.length).slice(0, 12);
  view.innerHTML = `
    <div class="page-head"><div><h1>Tutoriais</h1><p>Guias em português, com imagens e vídeos, para instalar e aproveitar cada recomp.</p></div></div>
    <div class="tut-grid">${featuredGames().map(gameTutCard).join('')}${TUTORIALS.map(tutCard).join('')}</div>
    <div class="section-head"><h2>Guias por jogo</h2><a href="#/jogos">Todos os jogos ${icon('arrow')}</a></div>
    <p class="muted" style="margin-top:-6px">Cada jogo do catálogo tem um tutorial próprio, com o passo a passo do projeto oficial traduzido, vídeos e o download direto.</p>
    <div class="row-scroll" style="margin-top:14px">${withVideos.map((g) => cover(g)).join('')}</div>`;
}
function pageTutorial(id) {
  const t = TUTORIALS.find((x) => x.id === id);
  if (!t) return pageTutorials();
  const img = tutorialCover(t, G);
  const others = TUTORIALS.filter((x) => x.id !== id).slice(0, 3);
  view.innerHTML = `
    <div class="article">
      <div class="crumbs" style="margin-top:14px"><a href="#/tutoriais">Tutoriais</a> / <span>${esc(t.title)}</span></div>
      <div class="article-hero"><div class="bg" style="${img ? `background-image:url('${img}')` : ''}"></div>
        <div><span class="tag cyan">${icon(t.icon)}${t.level} · ${t.minutes} min</span><h1>${esc(t.title)}</h1><p class="muted" style="margin:8px 0 0">${esc(t.summary)}</p></div>
      </div>
      <article class="tut">${t.body({ g: G, games: state.games })}</article>
      <div class="section-head"><h2>Continue aprendendo</h2></div>
      <div class="tut-grid">${others.map(tutCard).join('')}</div>
    </div>`;
}

// ---------- CATÁLOGO ----------
// o botão de tipo (Jogáveis, Instalar no PC, Navegador...) separado da plataforma, pra contar cada um
function matchKind(g, kind) {
  if (kind === 'playable') return g.playable;
  if (kind === 'install') return g.kinds.includes('install') && g.ways.some((w) => w.kind === 'install' && !w.noWindows);
  if (kind === 'browser') return g.kinds.includes('browser') && g.browserOnline !== false;
  if (kind === 'source') return !g.playable;
  if (kind === 'emulator') return g.category === 'emulador';
  if (kind === 'installed') return !!state.installed[g.id];
  return true;
}
function applyFilters() {
  const f = state.filter;
  const words = f.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  let list = state.games.filter((g) => {
    if (!matchKind(g, f.kind)) return false;
    if (f.platform && !g.platforms.includes(f.platform)) return false;
    if (words.length) {
      const hay = g._hay || (g._hay = [g.title, ...g.aliases, ...g.platforms.map(platName), ...g.projects.map((p) => p.name)].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  if (f.sort === 'downloads') { const d = (g) => state.stats?.games?.[g.id]?.total ?? -1; list = [...list].sort((a, b) => d(b) - d(a)); }
  else if (f.sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  else if (f.sort === 'recent') {
    const t = (g) => g.ways.reduce((m, w) => Math.max(m, w.release?.publishedAt ? Date.parse(w.release.publishedAt) : 0), 0);
    list = [...list].sort((a, b) => t(b) - t(a));
  } else if (f.sort === 'year') list = [...list].sort((a, b) => (a.year || 9999) - (b.year || 9999));
  return list;
}
function pageGames(arg) {
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  if (params.get('kind')) state.filter.kind = params.get('kind');
  if (params.get('sort')) state.filter.sort = params.get('sort');
  if (params.get('platform')) state.filter.platform = params.get('platform');
  state.shown = 60;
  const kinds = [['playable', 'Jogáveis', 'gamepad'], ['install', 'Instalar no PC', 'download'], ['browser', 'Jogar no navegador', 'browser'], ['emulator', 'Emuladores', 'chip'], ['source', 'Só código-fonte', 'github'], ['all', 'Todos', 'filter']];
  const kindCount = Object.fromEntries(kinds.map(([k]) => [k, state.games.filter((g) => matchKind(g, k)).length]));
  // plataformas com a contagem do tipo escolhido (antes contava todos os jogáveis e dava "Virtual Boy (3)" → 0 jogos)
  const platOptions = () => {
    const counts = {};
    for (const g of state.games) if (matchKind(g, state.filter.kind)) for (const p of g.platforms) counts[p] = (counts[p] || 0) + 1;
    const cur = state.filter.platform;
    if (cur && !counts[cur]) counts[cur] = 0;
    return `<option value="">Todas as plataformas</option>${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<option value="${p}" ${cur === p ? 'selected' : ''}>${esc(platName(p))} (${n})</option>`).join('')}`;
  };
  view.innerHTML = `
    <div class="page-head"><div><h1>Jogos Recompilados</h1><p>Um jogo, uma página: juntamos os projetos de 5 fontes sem repetir nenhum.</p></div></div>
    <div class="filters">
      ${kinds.map(([k, l, ic]) => `<button class="chip ${state.filter.kind === k ? 'on' : ''}" data-kind="${k}">${icon(ic, 'style="width:15px;height:15px"')}${l}<em class="chip-n">${kindCount[k].toLocaleString('pt-BR')}</em></button>`).join('')}
      ${state.filter.q ? `<button class="chip on" id="clear-q">"${esc(state.filter.q)}" ${icon('x', 'style="width:14px;height:14px"')}</button>` : ''}
      <span class="spacer"></span>
      <select class="select" id="f-plat">${platOptions()}</select>
      <select class="select" id="f-sort">
        ${[['popular', 'Mais populares'], ['downloads', 'Mais baixados'], ['recent', 'Release mais recente'], ['az', 'A–Z'], ['year', 'Ano de lançamento']].map(([v, l]) => `<option value="${v}" ${state.filter.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="result-count" id="count"></div>
    <div class="grid" id="grid" style="margin-top:14px"></div>
    <div class="load-more"><button class="btn" id="more" hidden>Carregar mais</button></div>`;
  const draw = () => {
    const list = applyFilters();
    $('#count').textContent = `${list.length.toLocaleString('pt-BR')} jogos${state.filter.q ? ` para "${state.filter.q}"` : ''}`;
    const plat = state.filter.platform;
    const why = plat ? `Nenhum jogo de <b>${esc(platName(plat))}</b> com o filtro "${esc(kinds.find(([k]) => k === state.filter.kind)?.[1] || 'Todos')}".<br><button class="btn small" id="clear-plat" style="margin-top:12px">${icon('x')}Ver todas as plataformas</button>` : 'Nenhum jogo encontrado com esses filtros.';
    $('#grid').innerHTML = list.length ? list.slice(0, state.shown).map((g) => cover(g)).join('') : `<div class="empty" style="grid-column:1/-1"><img src="assets/logo-128.png" alt="">${why}</div>`;
    $('#clear-plat')?.addEventListener('click', () => { state.filter.platform = ''; $('#f-plat').innerHTML = platOptions(); draw(); });
    $('#more').hidden = list.length <= state.shown;
  };
  $$('.chip[data-kind]').forEach((b) => b.addEventListener('click', () => { state.filter.kind = b.dataset.kind; state.shown = 60; $$('.chip[data-kind]').forEach((x) => x.classList.toggle('on', x === b)); $('#f-plat').innerHTML = platOptions(); draw(); }));
  $('#f-plat').addEventListener('change', (e) => { state.filter.platform = e.target.value; state.shown = 60; draw(); });
  $('#f-sort').addEventListener('change', (e) => { state.filter.sort = e.target.value; draw(); });
  $('#more').addEventListener('click', () => { state.shown += 60; draw(); });
  $('#clear-q')?.addEventListener('click', () => { state.filter.q = ''; route(); });
  new IntersectionObserver((en) => { if (en[0].isIntersecting && !$('#more')?.hidden) { state.shown += 60; draw(); } }, { root: view, rootMargin: '600px' }).observe($('#more'));
  draw();
}

// ---------- PÁGINA DO JOGO (tutorial completo) ----------
// o que o jogo pede do jogador, extraído do README do projeto (catalog/requirements.json)
function gameReq(g, w = primaryInstallWay(g)) {
  const repo = repoOf(w?.repo || w?.url);
  return (repo && state.reqs?.[repo.toLowerCase()]) || null;
}
const reqNeedsFile = (r) => !!r && (r.precisa === 'rom' || r.precisa === 'arquivos');
function reqHtml(r, g, { compact } = {}) {
  const plat = g.platforms[0];
  const isPc = ['pc', 'dos', 'mac'].includes(plat);
  const rows = compact ? [
    r.regiao && ['Região', esc(r.regiao)],
    r.idJogo && ['ID do jogo', `<code>${esc(r.idJogo)}</code>`],
    r.versao && ['Versão', esc(r.versao)],
    r.atualizacao && ['Atualização', esc(r.atualizacao)],
    r.formatos?.length && ['Formato', r.formatos.map((f) => `<code>${esc(f)}</code>`).join(' ')],
    r.nomeArquivo && ['Nome do arquivo', `<code>${esc(r.nomeArquivo)}</code>`],
    r.hash?.valor && [esc(r.hash.tipo || 'Hash'), `<code class="hash" title="Clique pra copiar">${esc(r.hash.valor)}</code>`],
  ].filter(Boolean) : [
    // ficha completa: tudo que identifica a cópia certa, mesmo quando o projeto não especifica
    ['Jogo', esc(r.nomeExato || g.title)],
    plat && ['Console', esc(platName(plat))],
    !isPc && ['Região', r.regiao ? esc(r.regiao) : '<i>o projeto não especifica (na dúvida, use a americana: USA / NTSC-U)</i>'],
    r.idJogo && ['ID do jogo', `<code>${esc(r.idJogo)}</code>`],
    ['Versão do jogo', r.versao ? esc(r.versao) : '<i>o projeto não especifica</i>'],
    ['Atualização (update)', r.atualizacao ? `${esc(r.atualizacao)} <i>(instalada junto com o jogo base)</i>` : '<i>nenhuma exigida</i>'],
    r.formatos?.length && ['Formato', r.formatos.map((f) => `<code>${esc(f)}</code>`).join(' ')],
    r.nomeArquivo && ['Nome do arquivo', `<code>${esc(r.nomeArquivo)}</code>`],
    r.hash?.valor && [esc(r.hash.tipo || 'Hash'), `<code class="hash" title="Clique pra copiar">${esc(r.hash.valor)}</code>`],
  ].filter(Boolean);
  if (compact) return `<div class="callout warn req">${icon('cartridge')}<div><p><b>${esc(r.arquivo || g.title)}</b></p>${rows.length ? `<div class="req-grid">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>` : ''}${r.obs ? `<p class="small">${esc(r.obs)}</p>` : ''}</div></div>`;
  return `<div class="callout warn req">${icon('cartridge')}<div>
    <p><b>${r.precisa === 'arquivos' ? 'Você precisa dos arquivos do seu jogo original' : 'Você precisa da ROM/imagem do seu jogo'}:</b> ${esc(r.arquivo || g.title)}.</p>
    ${rows.length ? `<div class="req-grid">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>` : ''}
    ${r.comoUsar ? `<p><b>Como usar:</b> ${esc(r.comoUsar)}</p>` : ''}
    ${r.obs ? `<p>${esc(r.obs)}</p>` : ''}
    ${r.hash?.valor ? `<div class="rom-check"><button class="btn small" data-romcheck="${esc(g.id)}">${icon('check')}Conferir minha ROM</button><span data-romresult></span></div>` : ''}
    <p class="small"><b>O HydraHub não envia nem indica links de download</b> de ROM, ISO ou arquivos de jogo: você precisa conseguir essa cópia por conta própria. O caminho legal é tirar da sua própria cópia, como mostra o passo a passo "Como conseguir a cópia certa" logo abaixo. Use esta ficha pra conferir se o arquivo que você tem é exatamente o certo.${r.hash?.valor ? ' O botão acima calcula o hash do seu arquivo e diz se bate.' : ''}</p>
  </div></div>`;
}
// passo a passo de como tirar a cópia certa do próprio console/loja (copia.js), sem links de download
function copyGuideHtml(r, g) {
  const plat = g.platforms.find((p) => COPY_GUIDE[p]) || g.platforms[0];
  const c = COPY_GUIDE[plat] || COPY_FALLBACK;
  const alvo = [r?.nomeExato || g.title, r?.regiao, r?.idJogo, r?.versao && `versão ${r.versao}`, r?.atualizacao && `atualização ${r.atualizacao}`].filter(Boolean).map(esc).join(' · ');
  return `<p>Você vai precisar de: <b>${alvo}</b>${c.formato ? ` (arquivo <code>${esc(c.formato)}</code>)` : ''}.</p>
    <div class="callout">${icon('wrench')}<p><b>O que você precisa ter:</b> ${c.aparelho}</p></div>
    <ol class="steps copy-steps">${c.passos.map((p) => `<li>${p}</li>`).join('')}</ol>
    ${c.extra ? `<p>${c.extra}</p>` : ''}
    <div class="callout">${icon('check')}<p><b>Como conferir se é a cópia certa:</b> ${c.conferir}${r?.hash?.valor ? ' O hash que o projeto aceita está na ficha acima (clique pra copiar).' : ''}</p></div>
    <p class="muted small">Mais detalhes no tutorial <a href="#/tutorial/dump-rom">Como fazer o dump legal do seu cartucho ou disco</a>. Baixar ROM/ISO de sites de terceiros é pirataria na maioria dos países, e arquivos de origem duvidosa costumam vir na região ou versão errada.</p>`;
}
// resultado da conferência da ROM, em português de gente
function romMsg(c, r) {
  if (c.error) return `<span class="rom-bad">${icon('x')}Não consegui ler o arquivo: ${esc(c.error)}</span>`;
  const conv = c.converted ? ` (era .${c.converted}, o HydraHub converte pra .z64)` : '';
  if (c.ok === true) return `<span class="rom-ok">${icon('check')}<b>Cópia certa!</b> O ${esc(c.tipo)} de <code>${esc(c.name || '')}</code> confere${conv}.</span>`;
  if (c.ok === false) {
    const want = [r.regiao, r.versao].filter(Boolean).join(', ');
    return `<span class="rom-bad">${icon('alert')}<b>Não é a cópia que o jogo pede.</b> O ${esc(c.tipo)} da sua (<code>${esc(c.got.slice(0, 12))}…</code>) é diferente${conv}. ${want ? `O jogo pede a versão <b>${esc(want)}</b>; ` : ''}pode ser outra região, outra revisão ou um arquivo modificado.</span>`;
  }
  return `<span>${esc(c.tipo)} calculado: <code>${esc(c.got)}</code> (o projeto não publicou hash pra comparar).</span>`;
}
// antes de abrir pela 1ª vez, mostra exatamente o arquivo que o jogo vai pedir
function reqModal(g, r) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'modal-bg';
    el.innerHTML = `<div class="modal"><h3>Antes de abrir ${esc(g.title)}</h3>${reqHtml(r, g)}
      <div class="modal-actions"><button class="btn primary" data-ok>${icon('play')}Tenho o arquivo, abrir</button><button class="btn ghost" data-no>Agora não</button></div></div>`;
    const close = (v) => { el.remove(); resolve(v); };
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-no]')) close(false); else if (e.target.closest('[data-ok]')) close(true); });
    document.body.append(el);
  });
}
// jogo que exige o arquivo numa pasta com nome certo: o HydraHub pede, confere e coloca no lugar
function placeModal(g, r) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'modal-bg';
    const where = `${r.pasta && r.pasta !== '.' ? `pasta <code>${esc(r.pasta)}</code> do jogo` : 'pasta do jogo'}${r.nomeArquivo ? ` com o nome <code>${esc(r.nomeArquivo)}</code>` : ''}`;
    el.innerHTML = `<div class="modal"><h3>Falta o arquivo do ${esc(g.title)}</h3>
      <p>Esse jogo só abre com o arquivo na ${where}. Escolha o seu arquivo que o HydraHub ${r.hash?.valor ? 'confere se é a cópia certa, ' : ''}copia e renomeia pra você.</p>
      ${reqHtml(r, g, { compact: true })}<div data-msg></div>
      <div class="modal-actions" data-acts><button class="btn primary" data-pick>${icon('folder')}Escolher o arquivo</button><button class="btn ghost" data-no>Agora não</button></div></div>`;
    const close = (v) => { el.remove(); resolve(v); };
    let lastFile = null;
    const place = async (file, force) => {
      el.querySelector('[data-msg]').innerHTML = `<p class="muted">${icon('refresh')}Conferindo e copiando…</p>`;
      const res = await window.hydra.romPlace({ gameId: g.id, req: r, file, force });
      if (res.ok) { toast(`Arquivo colocado: ${res.target}`, 'ok', 6000); return close(true); }
      if (res.mismatch) {
        el.querySelector('[data-msg]').innerHTML = `<p>${romMsg({ ...res.check, name: file.split(/[\\/]/).pop() }, r)}</p>`;
        el.querySelector('[data-acts]').innerHTML = `<button class="btn primary" data-pick>${icon('folder')}Escolher outro arquivo</button><button class="btn ghost" data-force>Usar mesmo assim</button><button class="btn ghost" data-no>Agora não</button>`;
        el.querySelector('[data-acts]').scrollIntoView({ block: 'end', behavior: 'smooth' });
        return;
      }
      el.querySelector('[data-msg]').innerHTML = `<p class="rom-bad">${icon('x')}${esc(res.error || 'Não consegui copiar o arquivo.')}</p>`;
    };
    el.addEventListener('click', async (e) => {
      if (e.target === el || e.target.closest('[data-no]')) return close(false);
      if (e.target.closest('[data-force]') && lastFile) return place(lastFile, true);
      if (e.target.closest('[data-pick]')) { const f = await window.hydra.romPick({ title: g.title, req: r }); if (f) { lastFile = f; place(f, false); } }
    });
    document.body.append(el);
  });
}
// copiar hash com um clique (página do jogo e modal)
document.addEventListener('click', (e) => { const h = e.target.closest('code.hash'); if (h) navigator.clipboard.writeText(h.textContent).then(() => toast('Hash copiado.', 'ok')); });
// "Conferir minha ROM" (página do jogo e avisos)
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-romcheck]');
  if (!b) return;
  const g = G(b.dataset.romcheck); const r = g && gameReq(g);
  if (!r) return;
  const out = b.parentElement.querySelector('[data-romresult]');
  const file = await window.hydra.romPick({ title: g.title, req: r });
  if (!file) return;
  out.innerHTML = `<span class="muted">Calculando o hash…</span>`;
  out.innerHTML = romMsg(await window.hydra.romCheck({ file, req: r }), r);
});

function primaryInstallWay(g) {
  // prefere o projeto que publica arquivo pra Windows (noWindows vem do build-stats)
  const gh = g.ways.filter((w) => w.kind === 'install' && repoOf(w.repo || w.url));
  return g.ways.find((w) => w.kind === 'install' && w.direct) || gh.find((w) => !w.noWindows) || gh[0] || null;
}
function pageGame(id) {
  const g = G(id);
  if (!g) { view.innerHTML = `<div class="empty"><img src="assets/logo-128.png" alt="">Jogo não encontrado. <a href="#/jogos">Voltar ao catálogo</a></div>`; return; }
  const bg = g.backdrop || g.screenshots[0] || g.cover;
  const iw = primaryInstallWay(g);
  const browser = g.ways.find((w) => w.kind === 'browser' && w.alive !== false);
  const deadBrowser = !browser && g.ways.some((w) => w.kind === 'browser');
  const req = gameReq(g, iw);
  // sem leitura conclusiva do README: jogo de console quase sempre pede a ROM/ISO original
  const guessRom = g.ways.some((w) => ['rom', 'files', 'game'].includes(w.needs)) || g.ways.some((w) => (w.steps || []).some((s) => /\b(rom|iso|disc image|your own copy|game files|dump)\b/i.test(s))) || g.platforms.some((p) => !['pc', 'dos', 'multiple-platforms'].includes(p));
  const needsRom = req && req.precisa !== 'incerto' ? reqNeedsFile(req) : guessRom;
  const stepsWay = g.ways.find((w) => w.steps?.length && w.kind === 'install') || g.ways.find((w) => w.steps?.length);
  const desc = g.descriptionPt || g.description;
  const methods = [...new Set(g.projects.map((p) => METHOD[p.method] || p.method).filter(Boolean))];
  const systems = [...new Set(g.ways.flatMap((w) => w.systems || []))];
  const sysName = { windows: 'Windows', linux: 'Linux', macos: 'macOS', browser: 'Navegador', android: 'Android', ios: 'iOS', switch: 'Switch' };

  const genericSteps = (w) => {
    if (w.kind === 'browser') return ['Clique em <b>Jogar no navegador</b>: o jogo abre no seu navegador padrão.', w.needs === 'nothing' || w.needs === 'instant' ? 'Não precisa instalar nem fornecer nada; é só jogar.' : 'Se a página pedir, carregue os arquivos da sua cópia do jogo.', 'O progresso costuma ficar salvo no próprio navegador; não limpe os dados do site.'];
    if (w.kind === 'install') return ['Clique em <b>Instalar</b>: o HydraHub baixa a versão mais nova direto do GitHub oficial e extrai pra você.', needsRom ? 'Tenha em mãos o <a href="#/tutorial/dump-rom">dump da sua cópia</a> do jogo, na região indicada pelo projeto.' : 'Leia as notas da versão abaixo para saber se o projeto pede arquivos do jogo original.', 'Clique em <b>Jogar</b>. Na primeira execução, siga o que o próprio jogo pedir (selecionar ROM/arquivos, controle, resolução).', 'Se aparecer o aviso do SmartScreen, clique em <b>Mais informações → Executar assim mesmo</b>.'];
    if (w.kind === 'files') return ['Abra a página do projeto e baixe o pacote indicado.', 'Siga o README: normalmente é preciso juntar os arquivos do seu jogo original.'];
    return ['Este projeto ainda é só código-fonte: não há build pronta pra baixar.', 'Acompanhe o repositório; quando sair uma release, o HydraHub mostra o botão Instalar automaticamente.'];
  };
  const stepsHtml = (w) => {
    if (w?.stepsFixedPt?.length) return `<ol class="steps">${w.stepsFixedPt.map((x) => `<li>${x}</li>`).join('')}</ol>`;
    if (w?.steps?.length) {
      return `<ol class="steps">${w.steps.map((s, i) => { const pt = w.stepsPt?.[i]; return `<li>${esc(pt || s)}${pt ? `<span class="orig">${esc(s)}</span>` : ''}</li>`; }).join('')}</ol>`;
    }
    return `<ol class="steps">${genericSteps(w || { kind: g.playable ? 'install' : 'source' }).map((s) => `<li>${s}</li>`).join('')}</ol>`;
  };

  let n = 0;
  const sec = (title) => `<h2><span class="num">${++n}</span> ${title}</h2>`;
  view.innerHTML = `
  <section class="game-hero">
    <div class="bg" style="${bg ? `background-image:url('${esc(bg)}')` : ''}"></div>
    <div class="inner">
      <div class="poster">${g.cover || g.icon ? `<img src="${esc(g.cover || g.icon)}" alt="">` : ''}</div>
      <div class="info">
        <div class="crumbs"><a href="#/jogos">Jogos Recompilados</a> / <span>${esc(g.platforms.map(platName).join(', '))}</span></div>
        <h1>${esc(g.title)}</h1>
        <div class="tags">
          ${g.year ? `<span class="tag">${g.year}</span>` : ''}
          ${g.platforms.map((p) => `<span class="tag">${esc(platName(p))}</span>`).join('')}
          ${methods.map((m) => `<span class="tag cyan">${esc(m)}</span>`).join('')}
          ${needsRom ? `<span class="tag warn">${icon('cartridge')}Precisa da sua cópia</span>` : ''}
          ${g.stars ? `<span class="tag">${icon('star')}${g.stars.toLocaleString('pt-BR')}</span>` : ''}
        </div>
        <div class="actions" id="actions">
          ${iw ? `<button class="btn primary" disabled>${icon('refresh')}Consultando GitHub…</button>` : ''}
          ${browser ? `<a class="btn ${iw ? '' : 'primary'}" href="${esc(browser.url)}">${icon('browser')}Jogar no navegador</a>` : ''}
          ${!iw && !browser && g.ways[0] ? `<a class="btn primary" href="${esc(g.ways[0].url)}">${icon('external')}Abrir página do projeto</a>` : ''}
        </div>
      </div>
    </div>
  </section>
  <div class="game-body">
    <article class="tut">
      ${desc ? `<p class="lead">${esc(desc)}</p>` : ''}
      ${sec('Antes de começar')}
      ${req && needsRom ? reqHtml(req, g) : ''}
      ${req?.precisa === 'nada' ? `<div class="callout">${icon('check')}<p><b>Não precisa de ROM.</b> Segundo o projeto, ele já vem pronto pra jogar.</p></div>` : ''}
      ${(!req || req.precisa === 'incerto') && needsRom ? `<div class="callout warn">${icon('cartridge')}<p><b>Você provavelmente precisa da sua cópia do jogo${g.platforms[0] && !['pc', 'dos'].includes(g.platforms[0]) ? ` de ${esc(platName(g.platforms[0]))}` : ''}.</b> A documentação do projeto não diz exatamente qual arquivo (região, versão); na primeira vez que abrir, o próprio jogo costuma pedir. O HydraHub instala o recomp, mas não fornece ROM nem arquivos do jogo. Veja <a href="#/tutorial/dump-rom">como fazer o dump do seu cartucho ou disco</a>.</p></div>` : ''}
      ${iw && !iw.direct ? `<div class="callout">${icon('info')}<p><b>Requisitos:</b> placa de vídeo com Vulkan ou Direct3D 12 e o Visual C++ Redistributable. <a href="#/tutorial/requisitos">Veja o guia de preparação do PC</a>.</p></div>` : ''}
      ${deadBrowser ? `<div class="callout warn off">${icon('alert')}<p><b>Versão de navegador fora do ar.</b> No último teste (${fmtDate(g.ways.find((w) => w.kind === 'browser').checkedAt)}) os links de navegador deste jogo não responderam. O HydraHub testa de novo todo dia.</p></div>` : ''}
      ${g.ways.filter((w) => w.externalHost).map((w) => `<div class="callout warn">${icon('alert')}<p><b>Roda num servidor de terceiros.</b> A versão de navegador de ${esc(w.project || 'este port')} carrega de <code>${esc(w.externalHost)}</code>, que não é controlado pelo HydraHub nem pelo site que lista o jogo. Pode ficar lento ou sair do ar. Nunca instale nada que essa página pedir.</p></div>`).join('')}
      ${needsRom && req?.precisa !== 'nada' ? `${sec('Como conseguir a cópia certa')}${copyGuideHtml(req, g)}` : ''}
      ${systems.length ? `<p>Disponível para:${systems.map((s) => `<span class="tag">${esc(sysName[s] || s)}</span>`).join(' ')}</p>` : ''}
      ${sec('Passo a passo')}
      ${stepsHtml(stepsWay || iw || browser)}
      ${stepsWay?.steps?.length ? `<p class="muted" style="font-size:12px">Passos tirados da documentação oficial do projeto (via recomp.gg) e traduzidos. O texto original aparece em cinza.</p>` : ''}
      ${g.videos.length ? `${sec('Vídeos')}${g.videos.length > 1 ? `<div class="videos-2">${g.videos.slice(0, 4).map(videoBlock).join('')}</div>` : videoBlock(g.videos[0])}` : ''}
      ${g.screenshots.length ? `${sec('Imagens')}<div class="shots">${g.screenshots.map((u) => `<img src="${esc(u.replace('-1280', '-640'))}" loading="lazy" alt="">`).join('')}</div>` : ''}
      ${sec('Downloads e formas de jogar')}
      <div id="release-box"></div>
      ${g.ways.map((w, i) => wayCard(w, i, iw)).join('')}
    </article>
    <aside>
      <div class="card side-box" id="install-box"><h4>Instalação</h4><div id="install-state" class="muted">Não instalado.</div></div>
      <div class="card side-box"><h4>Projetos</h4>
        ${g.projects.slice(0, 8).map((p) => `<div class="kv"><span>${esc(p.name)}</span><b>${esc(METHOD[p.method] || p.method || '')}${p.stars ? ` · ★ ${p.stars.toLocaleString('pt-BR')}` : ''}</b></div>`).join('') || '<p class="muted">—</p>'}
      </div>
      <div class="card side-box"><h4>Links do projeto</h4><div class="link-list">
        ${[...new Map([...g.projects.filter((p) => p.repo).map((p) => [p.repo.toLowerCase(), { url: p.repo, name: p.name, ic: /github/.test(p.repo) ? 'github' : 'globe' }]), ...g.projects.filter((p) => p.home).map((p) => [p.home, { url: p.home, name: `${p.name} (site)`, ic: 'globe' }])]).values()].slice(0, 8).map((l) => `<a href="${esc(l.url)}">${icon(l.ic)}<span>${esc(l.name)}</span>${icon('external')}</a>`).join('')}
        ${g.wiki ? `<a href="${esc(g.wiki)}">${icon('book')}<span>Wikipédia</span>${icon('external')}</a>` : ''}
      </div></div>
      <div class="card side-box"><h4>Fontes do catálogo</h4><div class="link-list">
        ${g.links.filter((l) => ['recomp.gg', 'AllRecomps', 'Recompiled Games', 'GithubLauncher', 'WASM Arcade'].includes(l.name)).map((l) => `<a href="${esc(l.url)}">${icon('link')}<span>${esc(l.name)}</span>${icon('external')}</a>`).join('')}
      </div></div>
    </aside>
  </div>`;
  renderInstallState(g, iw);
}

function wayCard(w, i, primary) {
  const label = { install: 'Instalar no PC', browser: 'Jogar no navegador', files: 'Pacote de arquivos', source: 'Código-fonte' }[w.kind] || w.kind;
  const ic = { install: 'download', browser: 'browser', files: 'folder', source: 'github' }[w.kind] || 'link';
  const repo = repoOf(w.repo || w.url);
  return `<div class="card way">
    <div class="way-head">
      <span class="tag ${w.kind === 'install' || w.kind === 'browser' ? 'cyan' : ''}">${icon(ic)}${label}</span>
      <h3>${esc(w.project || repo || new URL(w.url).hostname)}</h3>
      <span class="spacer"></span>
      ${w.kind === 'browser' && w.alive === true ? `<span class="tag ok">${icon('check')}Online</span>` : ''}${w.kind === 'browser' && w.alive === false ? `<span class="tag off">${icon('x')}Fora do ar</span>` : ''}
      ${w.release?.tag ? `<span class="tag">${esc(w.release.tag)}${w.release.publishedAt ? ` · ${fmtDate(w.release.publishedAt)}` : ''}</span>` : ''}
      <a class="btn small" href="${esc(w.kind === 'install' && repo ? `https://github.com/${repo}/releases` : w.url)}">${icon('external')}${w.kind === 'install' ? 'Releases' : 'Abrir'}</a>
    </div>
    <p class="muted" style="margin:10px 0 0;font-size:13px">${w.externalHost ? `Servidor externo: ${esc(w.externalHost)} · ` : ''}${esc(NEEDS[w.needs] || '')}${(w.systems || []).length ? ` · ${w.systems.join(', ')}` : ''}${w === primary ? ' · <b style="color:var(--accent)">usado pelo botão Instalar</b>' : ''}</p>
  </div>`;
}

async function renderInstallState(g, iw) {
  const actions = $('#actions');
  const stateBox = $('#install-state');
  const inst = state.installed[g.id];
  const browser = g.ways.find((w) => w.kind === 'browser' && w.alive !== false);
  const extra = browser ? `<a class="btn" href="${esc(browser.url)}">${icon('browser')}Jogar no navegador</a>` : '';
  const dl = state.downloads.get(g.id);
  if (dl) { drawProgress(g, dl); return; }
  if (!iw) {
    if (inst) actions.innerHTML = installedButtons(g, inst, null) + extra;
    stateBox.innerHTML = inst ? installedInfo(inst) : 'Este jogo não tem instalação automática; use os links abaixo.';
    bindInstallButtons(g, null, null, null);
    return;
  }
  if (iw.direct) return renderDirectInstall(g, iw, inst, extra);
  const repo = repoOf(iw.repo || iw.url);
  const rel = await window.hydra.releases(repo);
  if (location.hash !== `#/jogo/${g.id}`) return;
  const box = $('#release-box');
  if (!rel.ok) {
    const msg = rel.error === 'rate' ? 'O GitHub limitou as consultas (60/hora sem token). Coloque um token em Configurações ou tente mais tarde.' : rel.error === 'notfound' ? 'O repositório não foi encontrado (pode ter mudado de nome).' : 'Sem conexão com o GitHub agora.';
    actions.innerHTML = (inst ? installedButtons(g, inst, null) : `<a class="btn primary" href="https://github.com/${repo}/releases">${icon('external')}Baixar no GitHub</a>`) + extra;
    box.innerHTML = `<div class="callout warn">${icon('alert')}<p><b>Não consegui consultar a release.</b> ${msg}</p></div>`;
    stateBox.innerHTML = inst ? installedInfo(inst) : 'Não instalado.';
    bindInstallButtons(g, repo, null, null);
    return;
  }
  const latest = rel.latest;
  const best = rel.best;
  if (!latest) {
    actions.innerHTML = (inst ? installedButtons(g, inst, null) : `<a class="btn primary" href="https://github.com/${repo}">${icon('github')}Ver no GitHub</a>`) + extra;
    box.innerHTML = `<div class="callout">${icon('info')}<p><b>Ainda sem release publicada.</b> O projeto não tem versão pronta pra baixar; acompanhe no GitHub.</p></div>`;
    bindInstallButtons(g, repo, null, null);
    return;
  }
  if (inst) actions.innerHTML = installedButtons(g, inst, latest, best) + extra;
  else if (best) actions.innerHTML = `<button class="btn primary" id="btn-install">${icon('download')}Instalar <span style="opacity:.7;font-weight:600">${esc(latest.tag)} · ${fmtBytes(best.size)}</span></button>` + extra;
  else actions.innerHTML = `<a class="btn primary" href="${esc(latest.url)}">${icon('external')}Baixar no GitHub</a>` + extra;
  stateBox.innerHTML = inst ? installedInfo(inst) : `Última versão: <b style="color:var(--white)">${esc(latest.tag)}</b><br>${fmtDate(latest.publishedAt)}${best ? '' : '<br>Nenhum arquivo pronto pro seu sistema.'}`;
  box.innerHTML = `<div class="card way">
    <div class="way-head"><span class="tag ok">${icon('check')}Release oficial</span><h3>${esc(latest.name || latest.tag)}</h3><span class="spacer"></span><span class="tag">${fmtDate(latest.publishedAt)}</span></div>
    <div class="assets">${latest.assets.map((a) => `<div class="asset ${best && a.url === best.url ? 'best' : ''}">${icon(best && a.url === best.url ? 'check' : 'download')}<span class="n">${esc(a.name)}</span><span class="s">${fmtBytes(a.size)}</span><a class="btn small ghost" href="${esc(a.url)}">Baixar</a></div>`).join('')}</div>
    ${latest.body ? `<details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:13px">Notas da versão</summary><div class="release-notes">${esc(latest.body)}</div></details>` : ''}
  </div>`;
  bindInstallButtons(g, repo, latest, best, iw.exeHint);
}
// Emuladores com download direto: versão consultada ao vivo na API do site
async function renderDirectInstall(g, iw, inst, extra) {
  const actions = $('#actions'), stateBox = $('#install-state'), box = $('#release-box');
  const live = await window.hydra.directVersion(iw.direct.api);
  if (location.hash !== `#/jogo/${g.id}`) return;
  const d = live.ok ? live : { version: iw.direct.version, files: iw.direct.files, sha256: iw.direct.sha256, changelog: [] };
  const tag = `v${d.version}`;
  const best = d.files.find((f) => /\.zip$/i.test(f.name)) || d.files[0];
  const latest = { tag, name: `${g.title} ${tag}`, url: iw.url, assets: d.files };
  if (inst) actions.innerHTML = installedButtons(g, inst, latest, best) + extra;
  else actions.innerHTML = `<button class="btn primary" id="btn-install">${icon('download')}Instalar <span style="opacity:.7;font-weight:600">${esc(tag)} · ${fmtBytes(best.size)}</span></button>` + extra;
  stateBox.innerHTML = inst ? installedInfo(inst) : `Última versão: <b style="color:var(--white)">${esc(tag)}</b><br>Download direto do site oficial${live.ok ? '' : ' (versão salva; site sem resposta agora)'}`;
  box.innerHTML = `<div class="card way">
    <div class="way-head"><span class="tag ok">${icon('check')}Download oficial</span><h3>${esc(g.title)} ${esc(tag)}</h3><span class="spacer"></span><a class="btn small" href="${esc(iw.url)}">${icon('external')}Site</a></div>
    <div class="assets">${d.files.map((a) => `<div class="asset ${a.url === best.url ? 'best' : ''}">${icon(a.url === best.url ? 'check' : 'download')}<span class="n">${esc(a.label || a.name)} <span class="s">${esc(a.name)}</span></span><span class="s">${fmtBytes(a.size)}</span><a class="btn small ghost" href="${esc(a.url)}">Baixar</a></div>`).join('')}</div>
    ${d.sha256 ? `<p class="muted" style="font-size:12px;margin:10px 0 0;word-break:break-all">SHA-256 da atualização: <code>${esc(d.sha256)}</code></p>` : ''}
    ${d.changelog?.length ? `<details style="margin-top:10px" open><summary class="muted" style="cursor:pointer;font-size:13px">Novidades da ${esc(tag)}</summary><div class="release-notes">${d.changelog.map((c) => `• ${esc(c)}`).join('<br>')}</div></details>` : ''}
  </div>`;
  bindInstallButtons(g, null, latest, best, iw.direct.exeHint);
}
const installedInfo = (inst) => `<span class="tag ok">${icon('check')}Instalado</span><div style="margin-top:10px;font-size:12.5px;word-break:break-all">Versão ${esc(inst.tag || '?')}<br>${esc(inst.dir)}</div>`;
function installedButtons(g, inst, latest, best) {
  const update = latest && best && inst.tag && latest.tag !== inst.tag;
  return `<button class="btn primary" id="btn-play">${icon('play')}Jogar</button>
    ${update ? `<button class="btn" id="btn-install">${icon('refresh')}Atualizar para ${esc(latest.tag)}</button>` : ''}
    <button class="btn" id="btn-folder">${icon('folder')}Abrir pasta</button>
    <button class="btn ghost small" id="btn-exe" title="Escolher outro executável">${icon('wrench')}Escolher executável</button>
    <button class="btn ghost small danger" id="btn-uninstall">${icon('trash')}Desinstalar</button>`;
}
function bindInstallButtons(g, repo, latest, best, exeHint) {
  $('#btn-install')?.addEventListener('click', async () => {
    const p = window.hydra.install({ gameId: g.id, title: g.title, repo, asset: best, tag: latest.tag, exeHint });
    state.downloads.set(g.id, { phase: 'start', received: 0, total: best.size, title: g.title, cover: g.cover });
    drawProgress(g, state.downloads.get(g.id));
    updateDownloadsDot();
    const r = await p;
    if (!r.ok && r.error !== 'Cancelado.') toast(`Falhou: ${r.error}`, 'error', 7000);
  });
  $('#btn-play')?.addEventListener('click', async () => {
    const req = gameReq(g);
    // jogo que exige o arquivo numa pasta: se ainda não está lá, o HydraHub pede e coloca
    if (reqNeedsFile(req) && req.modo === 'pasta' && req.nomeArquivo) {
      const st = await window.hydra.romStatus({ gameId: g.id, req });
      if (st.target && !st.exists && !(await placeModal(g, req))) return;
    } else if (reqNeedsFile(req) && !state.installed[g.id]?.lastPlayed && !(await reqModal(g, req))) return;
    const r = await window.hydra.launch(g.id);
    if (r.ok) toast(`Abrindo ${g.title}…`, 'ok'); else toast(r.error, 'error');
  });
  $('#btn-folder')?.addEventListener('click', () => window.hydra.openFolder(g.id));
  $('#btn-exe')?.addEventListener('click', async () => { const f = await window.hydra.setExe(g.id); if (f) toast('Executável atualizado.', 'ok'); });
  $('#btn-uninstall')?.addEventListener('click', async () => {
    if (await window.hydra.uninstall(g.id)) { state.installed = await window.hydra.installed(); toast(`${g.title} removido.`, 'ok'); route(); }
  });
}
function drawProgress(g, d) {
  const actions = $('#actions');
  if (!actions || location.hash !== `#/jogo/${g.id}`) return;
  const pct = d.total ? Math.min(100, (d.received / d.total) * 100) : 0;
  const label = d.phase === 'setup' ? 'Instalador aberto: siga as janelas dele. Quando terminar, o HydraHub abre o jogo.' : d.phase === 'build' ? `Compilando o jogo (só na 1ª vez): ${esc(d.message || '')}` : d.phase === 'extract' ? 'Extraindo arquivos…' : d.phase === 'start' ? 'Iniciando download…' : `${fmtBytes(d.received)} de ${fmtBytes(d.total)}${d.speed ? ` · ${fmtBytes(d.speed)}/s` : ''}`;
  actions.innerHTML = `<div class="progress"><div class="track"><div class="fill ${d.phase === 'extract' || !d.total ? 'indet' : ''}" style="width:${pct}%"></div></div><div class="meta"><span>${label}</span><span>${d.total && (d.phase === 'download' || d.phase === 'build') ? `${pct.toFixed(0)}%` : ''}</span></div></div>
    <button class="btn small" id="btn-cancel">${icon('x')}Cancelar</button>`;
  $('#btn-cancel').addEventListener('click', () => window.hydra.cancel(g.id));
}

// progresso vindo do processo principal
window.hydra.onProgress(async (p) => {
  const g = G(p.gameId);
  const cur = state.downloads.get(p.gameId) || { title: g?.title, cover: g?.cover };
  if (p.phase === 'done' || p.phase === 'error' || p.phase === 'cancelled') {
    state.downloads.delete(p.gameId);
    state.installed = await window.hydra.installed();
    if (p.phase === 'done' && !p.setup) toast(p.built ? `${g?.title || 'Jogo'} compilado! Abrindo…` : `${g?.title || 'Jogo'} instalado! Clique em Jogar.`, 'ok', 6000);
    if (p.phase === 'cancelled') toast('Download cancelado.', 'info');
    if (location.hash === `#/jogo/${p.gameId}`) route();
    else renderNav((location.hash.split('/')[1]) || 'inicio');
  } else {
    Object.assign(cur, p);
    state.downloads.set(p.gameId, cur);
    if (g) drawProgress(g, cur);
  }
  updateDownloadsDot();
  if (!$('#downloads-panel').hidden) drawDownloadsPanel();
});
window.hydra.onToast((t) => toast(t.text, t.type));

function updateDownloadsDot() { $('#btn-downloads .dot').hidden = state.downloads.size === 0; }
function drawDownloadsPanel() {
  const items = [...state.downloads.entries()];
  $('#downloads-panel').innerHTML = `<h4>Downloads</h4>${items.length ? items.map(([id, d]) => {
    const pct = d.total ? Math.min(100, (d.received / d.total) * 100) : 0;
    return `<div class="dl-item">${d.cover ? `<img src="${esc(d.cover)}">` : '<img>'}<div style="flex:1;min-width:0"><div class="t">${esc(d.title)}</div><div class="progress"><div class="track"><div class="fill ${d.phase !== 'download' && d.phase !== 'build' ? 'indet' : ''}" style="width:${pct}%"></div></div><div class="meta"><span>${d.phase === 'extract' ? 'Extraindo…' : d.phase === 'setup' ? 'Instalador aberto…' : d.phase === 'build' ? `Compilando… ${pct.toFixed(0)}%` : `${fmtBytes(d.received)} / ${fmtBytes(d.total)}`}</span><a href="#/jogo/${id}">ver</a></div></div></div></div>`;
  }).join('') : '<p class="muted" style="margin:0">Nenhum download em andamento.</p>'}`;
}
$('#btn-downloads').addEventListener('click', () => { const p = $('#downloads-panel'); p.hidden = !p.hidden; if (!p.hidden) drawDownloadsPanel(); });

// ---------- BIBLIOTECA ----------
function pageLibrary() {
  const ids = Object.keys(state.installed);
  const games = ids.map((id) => G(id) || { id, title: state.installed[id].title, platforms: [], kinds: [], ways: [] });
  view.innerHTML = `
    <div class="page-head"><div><h1>Minha Biblioteca</h1><p>Os recomps que você instalou pelo HydraHub.</p></div></div>
    ${games.length ? `<div class="grid">${games.map((g) => cover(g)).join('')}</div>` : `<div class="empty card"><img src="assets/logo-128.png" alt=""><h3 style="color:var(--white)">Nada instalado ainda</h3><p>Escolha um jogo e clique em Instalar. Ele aparece aqui pronto pra jogar.</p><a class="btn primary" href="#/jogos">${icon('gamepad')}Explorar jogos</a></div>`}`;
}

// ---------- COMUNIDADE e LINKS ----------
const linkCard = (l) => `<a class="link-card card" href="${l.url}"><div class="lc-top"><div class="lc-ico">${icon(l.icon)}</div><div><h3>${esc(l.title)}</h3><small>${esc(new URL(l.url).hostname.replace('www.', ''))}</small></div></div><p>${esc(l.text)}</p></a>`;
function pageCommunity() {
  const L = [
    { title: 'Sugira um jogo ou reporte um erro', url: 'https://github.com/achadoia/hydrahub/issues', icon: 'github', text: 'Faltou um recomp? Link quebrado? Abra uma issue no repositório do HydraHub.' },
    { title: 'N64: Recompiled', url: 'https://github.com/N64Recomp/N64Recomp', icon: 'github', text: 'A ferramenta por trás de Zelda, Banjo, Star Fox e dezenas de recomps de N64.' },
    { title: 'Awesome Decomp Games', url: 'https://github.com/SubmitGame/awesome-decomp-games', icon: 'github', text: 'Lista colaborativa de projetos de decompilação e ports.' },
    { title: 'GithubLauncher (SirDiabo)', url: 'https://github.com/SirDiabo/GithubLauncher', icon: 'github', text: 'Launcher open source que inspirou a lista de recomps do HydraHub.' },
    { title: 'r/emulation', url: 'https://www.reddit.com/r/emulation/', icon: 'reddit', text: 'Notícias de novos recomps, ports e decompilações.' },
    { title: 'Mods no Thunderstore', url: 'https://thunderstore.io/c/zelda-64-recompiled/', icon: 'puzzle', text: 'Mods e pacotes de textura feitos pela comunidade para os recomps de N64.' },
  ];
  view.innerHTML = `
    <div class="page-head"><div><h1>Comunidade</h1><p>Onde os recomps nascem, e onde tirar dúvidas e trocar ideias.</p></div></div>
    <section class="achado-hero card">
      <img src="assets/achadoia.png" alt="Achado IA">
      <div><span class="tag">FEITO PELO</span><h2>Achado IA</h2><p>O HydraHub é um projeto do Achado IA. Siga pra ver os melhores achados do GitHub, de IA e de jogos recompilados.</p></div>
    </section>
    <div class="link-cards achado-cards">${ACHADO.map((l) => linkCard({ title: l.handle ? `${l.label} ${l.handle}` : l.label, url: l.url, icon: l.icon, text: l.text })).join('')}</div>
    <div class="section-head"><h2>Recomps e projetos</h2></div>
    <div class="link-cards">${L.map(linkCard).join('')}</div>
    <div class="section-head"><h2>Tutoriais da comunidade em vídeo</h2></div>
    <div class="videos-2">${state.games.filter((g) => g.videos?.some((v) => !v.from)).flatMap((g) => g.videos.filter((v) => !v.from)).slice(0, 4).map(videoBlock).join('')}</div>`;
}
function pageLinks() {
  const sections = [
    ['Fontes do catálogo', [
      { title: 'recomp.gg', url: 'https://recomp.gg/', icon: 'globe', text: 'O maior índice de jogos cujo código voltou: recomps, decomps e ports, com API aberta.' },
      { title: 'AllRecomps', url: 'https://allrecomps.com/', icon: 'globe', text: 'Catálogo por console com requisitos, sistemas e repositórios oficiais.' },
      { title: 'Recompiled Games', url: 'https://recompiledgames.com/', icon: 'browser', text: 'Índice de ports que rodam direto no navegador.' },
      { title: 'WASM Arcade', url: 'https://wasmarcade.com/', icon: 'browser', text: 'Ports de PC em WebAssembly: GTA 5, GTA III, Vice City, Hit & Run e mais.' },
      { title: 'GithubLauncher', url: 'https://github.com/SirDiabo/GithubLauncher', icon: 'github', text: 'Lista de recomps de N64 mantida pelo SirDiabo.' },
    ]],
    ['Achado IA', ACHADO.map((l) => ({ title: l.handle ? `${l.label} ${l.handle}` : l.label, url: l.url, icon: l.icon, text: l.text }))],
    ['Emuladores', [
      { title: 'Frame Perfect', url: 'https://www.frameperfect.cc/', icon: 'chip', text: 'Emulador arcade com rollback netcode: KOF, Street Fighter e mais, online sem lag.' },
      { title: 'Frame Perfect: downloads', url: 'https://www.frameperfect.cc/download', icon: 'download', text: 'Instalador .exe, pacote portátil .zip e versão pra Windows 7.' },
    ]],
    ['Preparar o PC', [
      { title: 'Visual C++ Redistributable (x64)', url: 'https://aka.ms/vs/17/release/vc_redist.x64.exe', icon: 'download', text: 'Resolve erros de MSVCP140.dll e VCRUNTIME140.dll.' },
      { title: 'Drivers AMD', url: 'https://www.amd.com/pt/support/download/drivers.html', icon: 'chip', text: 'Driver de vídeo atualizado evita tela preta e travamentos.' },
      { title: 'Drivers NVIDIA', url: 'https://www.nvidia.com/pt-br/drivers/', icon: 'chip', text: 'Driver de vídeo atualizado evita tela preta e travamentos.' },
      { title: 'Token do GitHub', url: 'https://github.com/settings/tokens', icon: 'github', text: 'Crie um token sem permissões e libere 5.000 consultas/hora no HydraHub.' },
    ]],
    ['Fazer o dump do seu jogo', [
      { title: 'Sanni Cart Reader', url: 'https://github.com/sanni/cartreader', icon: 'cartridge', text: 'Leitor de cartuchos open source (N64, SNES, Mega Drive, GB…).' },
      { title: 'ImgBurn', url: 'https://www.imgburn.com/', icon: 'download', text: 'Cria imagem .iso / .bin dos seus discos de PS1 e PS2.' },
      { title: 'CleanRip', url: 'https://github.com/emukidid/cleanrip', icon: 'github', text: 'Dump de discos de GameCube e Wii pelo próprio Wii.' },
      { title: 'No-Intro / Redump', url: 'https://datomatic.no-intro.org/', icon: 'shield', text: 'Bancos de hashes para conferir se o seu dump está perfeito.' },
    ]],
  ];
  view.innerHTML = `<div class="page-head"><div><h1>Links Úteis</h1><p>Tudo o que você precisa fora do HydraHub, organizado.</p></div></div>
    ${sections.map(([t, L]) => `<div class="section-head"><h2>${t}</h2></div><div class="link-cards">${L.map(linkCard).join('')}</div>`).join('')}`;
}

// ---------- RANKINGS (downloads das releases no GitHub, retrato diário) ----------
const fmtNum = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mi` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace('.', ',')} mil` : String(n ?? 0));
const RANKS = [
  { id: 'week', label: 'Da semana', unit: 'downloads na semana' },
  { id: 'month', label: 'Do mês', unit: 'downloads no mês' },
  { id: 'total', label: 'De todos os tempos', unit: 'downloads' },
];
// semana/mês só existem depois de alguns dias de histórico; até lá cai pro total
function rankList(kind) {
  const r = state.stats?.rankings || {};
  const ids = (r[kind]?.length ? r[kind] : r.total || []).map(G).filter(Boolean);
  return { games: ids, fallback: !r[kind]?.length && kind !== 'total' };
}
function rankCard(g, i, kind) {
  const s = state.stats?.games?.[g.id] || {};
  const n = kind === 'total' || s[kind] == null ? s.total : s[kind];
  return `<div class="rank-item"><span class="rank-n">${i + 1}</span>${cover(g)}<span class="rank-dl">${icon('download')}${fmtNum(n)}</span></div>`;
}
function rankingsSection() {
  if (!state.stats?.rankings?.total?.length) return '';
  return `<div class="section-head"><h2>Mais baixados</h2><div class="seg" id="rank-tabs">${RANKS.map((r, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-rank="${r.id}">${r.label}</button>`).join('')}</div></div>
    <p class="muted rank-note" id="rank-note"></p>
    <div class="row-scroll rank-row" id="rank-row"></div>`;
}
function bindRankings() {
  const row = $('#rank-row');
  if (!row) return;
  const draw = (kind) => {
    const { games, fallback } = rankList(kind);
    row.innerHTML = games.slice(0, 16).map((g, i) => rankCard(g, i, fallback ? 'total' : kind)).join('');
    const r = RANKS.find((x) => x.id === kind);
    $('#rank-note').textContent = fallback
      ? 'O ranking da semana e do mês aparece depois de alguns dias de contagem; por enquanto mostramos o total de downloads.'
      : `Somando os downloads das releases oficiais no GitHub (${r.unit}).`;
    $$('#rank-tabs .chip').forEach((b) => b.classList.toggle('on', b.dataset.rank === kind));
  };
  $$('#rank-tabs .chip').forEach((b) => b.addEventListener('click', () => draw(b.dataset.rank)));
  draw('week');
}

// ---------- SURPREENDA-ME ----------
function surprise(kind = 'any') {
  const games = state.games.filter((g) => g.playable && g.cover);
  const repos = state.repos?.repos || [];
  const pool = kind === 'games' ? games : kind === 'repos' ? repos : [...games, ...repos];
  if (!pool.length) return;
  const x = pool[Math.floor(Math.random() * pool.length)];
  location.hash = x.full ? `#/repo/${encodeURIComponent(x.full)}` : `#/jogo/${x.id}`;
}
const surpriseBtn = (kind, label = 'Surpreenda-me') => `<button class="btn surprise" data-surprise="${kind}">${icon('dice')}${label}</button>`;
document.addEventListener('click', (e) => { const b = e.target.closest('[data-surprise]'); if (b) surprise(b.dataset.surprise); });

// ---------- REPOSITÓRIOS ----------
const R = (full) => state.repoByFull?.get(full.toLowerCase());
const REPO_TABS = [
  { id: 'recomendados', label: 'Recomendados', icon: 'star', text: 'Os que já apareceram no Achado IA, com skill pronta pro Claude Code.' },
  { id: 'novos', label: 'Em alta (2 meses)', icon: 'fire', text: 'Os 100 com mais estrelas entre os criados nos últimos 2 meses.' },
  { id: 'semana', label: 'Mais estrelas na semana', icon: 'bolt', text: 'Quem mais ganhou estrelas nos últimos 7 dias.' },
  { id: 'top', label: 'Top 100 da história', icon: 'trophy', text: 'Os 100 repositórios com mais estrelas de todos os tempos.' },
];
function repoList(tab) {
  const d = state.repos;
  if (!d) return [];
  if (tab === 'semana') return [...d.repos].sort((a, b) => (b.starsWeek || 0) - (a.starsWeek || 0)).slice(0, 100);
  return (d.lists[tab] || []).map(R).filter(Boolean);
}
function repoCard(r, i, tab) {
  const posted = state.repos?.achadoia?.[r.full];
  return `<a class="repo-card" href="#/repo/${encodeURIComponent(r.full)}">
    <div class="rc-img"><img src="${esc(r.shots?.[0] || '')}" loading="lazy" alt="" onerror="this.remove()">${i != null && tab !== 'recomendados' ? `<span class="rc-n">#${i + 1}</span>` : ''}${posted ? `<span class="tag achado">${icon('star')}Achado IA</span>` : ''}</div>
    <div class="rc-body">
      <div class="rc-name"><img src="${esc(r.ownerAvatar || '')}" alt="" onerror="this.remove()"><span><small>${esc(r.owner)}/</small>${esc(r.name)}</span></div>
      <p>${esc(r.resumo || r.description || '')}</p>
      <div class="rc-meta"><span>${icon('star')}${fmtNum(r.stars)}</span>${r.starsWeek ? `<span class="up">+${fmtNum(r.starsWeek)} na semana</span>` : ''}${r.language ? `<span>${icon('code')}${esc(r.language)}</span>` : ''}${r.categoria ? `<span class="tag">${esc(r.categoria)}</span>` : ''}</div>
    </div>
  </a>`;
}
function pageRepos() {
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  const tab = REPO_TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : state.repoTab || 'recomendados';
  state.repoTab = tab;
  const t = REPO_TABS.find((x) => x.id === tab);
  if (!state.repos) { view.innerHTML = `<div class="page-head"><div><h1>Repositórios</h1><p>Carregando…</p></div></div>`; return; }
  const cats = [...new Set(repoList(tab).map((r) => r.categoria).filter(Boolean))].sort();
  view.innerHTML = `
    <div class="page-head"><div><h1>Repositórios</h1><p>Os projetos do GitHub que valem a pena, explicados em português: o que são, pra que servem e quem aproveita.</p></div>${surpriseBtn('repos')}</div>
    <div class="filters">${REPO_TABS.map((x) => `<a class="chip ${x.id === tab ? 'on' : ''}" href="#/repos?tab=${x.id}">${icon(x.icon, 'style="width:15px;height:15px"')}${x.label}</a>`).join('')}
      <span class="spacer"></span>
      <select class="select" id="r-cat"><option value="">Todas as categorias</option>${cats.map((c) => `<option ${state.repoCat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    </div>
    <p class="muted" style="margin:4px 0 16px">${t.text} Atualizado em ${fmtDate(state.repos.generatedAt)}.</p>
    <div class="repo-grid" id="repo-grid"></div>`;
  const draw = () => {
    const list = repoList(tab).map((r, i) => [r, i]).filter(([r]) => !state.repoCat || r.categoria === state.repoCat);
    $('#repo-grid').innerHTML = list.length ? list.map(([r, i]) => repoCard(r, i, tab)).join('') : `<div class="empty" style="grid-column:1/-1"><img src="assets/logo-128.png" alt="">Nada por aqui ainda.</div>`;
  };
  $('#r-cat').addEventListener('change', (e) => { state.repoCat = e.target.value; draw(); });
  draw();
}
function pageRepo(full) {
  const r = full && R(full);
  if (!r) { view.innerHTML = `<div class="empty"><img src="assets/logo-128.png" alt="">Repositório não encontrado. <a href="#/repos">Voltar</a></div>`; return; }
  const posted = state.repos.achadoia?.[r.full];
  const lists = [['top', 'Top 100 da história'], ['novos', 'Em alta (2 meses)'], ['recomendados', 'Recomendado pelo Achado IA']].filter(([k]) => state.repos.lists[k]?.includes(r.full));
  const clone = `git clone https://github.com/${r.full}.git`;
  view.innerHTML = `
    <div class="repo-hero card">
      <img class="rh-img" src="${esc(r.shots[0])}" alt="">
      <div class="rh-body">
        <a class="crumb" href="#/repos">${icon('back', 'style="width:15px;height:15px"')}Repositórios</a>
        <h1>${esc(r.name)}</h1>
        <div class="rh-owner"><img src="${esc(r.ownerAvatar || '')}" alt="" onerror="this.remove()">${esc(r.owner)}</div>
        <p class="rh-sum">${esc(r.resumo || r.description)}</p>
        <div class="rc-meta">${lists.map(([, l]) => `<span class="tag cyan">${esc(l)}</span>`).join('')}${r.categoria ? `<span class="tag">${esc(r.categoria)}</span>` : ''}</div>
        <div class="actions">
          <a class="btn primary" href="${esc(r.url)}">${icon('github')}Abrir no GitHub</a>
          ${r.homepage ? `<a class="btn" href="${esc(r.homepage)}">${icon('globe')}Site do projeto</a>` : ''}
          ${posted?.skill ? `<a class="btn achado-btn" href="${esc(posted.skill)}">${icon('star')}Skill do Achado IA</a>` : ''}
        </div>
      </div>
    </div>
    <div class="game-body">
      <article class="tut">
        <h2>O que é</h2>
        <p class="lead">${esc(r.explicacao || r.description || '')}</p>
        ${r.praQuem ? `<div class="callout">${icon('users')}<p><b>Pra quem é:</b> ${esc(r.praQuem)}</p></div>` : ''}
        ${posted ? `<div class="callout achado-call">${icon('star')}<p><b>Saiu no Achado IA em ${fmtDate(posted.postedAt + 'T12:00:00')}.</b> ${esc(posted.skillWhat || '')}</p></div>` : ''}
        ${r.description && r.explicacao ? `<p class="muted" style="font-size:13px">Descrição original: “${esc(r.description)}”</p>` : ''}
        ${r.shots.length > 1 ? `<h2>Prints</h2><div class="shots repo-shots">${r.shots.slice(1).map((u) => `<img src="${esc(u)}" loading="lazy" alt="" onerror="this.remove()">`).join('')}</div>` : ''}
        <h2>Baixar o código</h2>
        <div class="clone"><code>${esc(clone)}</code><button class="btn small" id="copy-clone">${icon('copy')}Copiar</button></div>
      </article>
      <aside>
        <div class="card side-box"><h4>Números</h4>
          <div class="kv"><span>Estrelas</span><b>${r.stars.toLocaleString('pt-BR')}</b></div>
          <div class="kv"><span>Na semana</span><b>+${(r.starsWeek || 0).toLocaleString('pt-BR')}${r.trendEstimated ? '*' : ''}</b></div>
          <div class="kv"><span>No mês</span><b>+${(r.starsMonth || 0).toLocaleString('pt-BR')}${r.trendEstimated ? '*' : ''}</b></div>
          <div class="kv"><span>Forks</span><b>${(r.forks || 0).toLocaleString('pt-BR')}</b></div>
          ${r.language ? `<div class="kv"><span>Linguagem</span><b>${esc(r.language)}</b></div>` : ''}
          ${r.license ? `<div class="kv"><span>Licença</span><b>${esc(r.license)}</b></div>` : ''}
          <div class="kv"><span>Criado em</span><b>${fmtDate(r.createdAt)}</b></div>
          <div class="kv"><span>Última mudança</span><b>${fmtDate(r.pushedAt)}</b></div>
          ${r.trendEstimated ? '<p class="muted" style="font-size:11.5px;margin:8px 0 0">* estimativa pelo ritmo médio; vira número exato depois de uma semana de contagem.</p>' : ''}
        </div>
        ${r.topics?.length ? `<div class="card side-box"><h4>Tópicos</h4><div class="rc-meta">${r.topics.slice(0, 14).map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></div>` : ''}
      </aside>
    </div>`;
  $('#copy-clone').addEventListener('click', () => { navigator.clipboard.writeText(clone).then(() => toast('Comando copiado.', 'ok')); });
}
function reposHomeSection() {
  const d = state.repos;
  if (!d) return '';
  const recs = repoList('recomendados').slice(0, 8);
  const hot = repoList('semana').slice(0, 8);
  return `${recs.length ? `<div class="section-head"><h2>Repositórios recomendados</h2><a href="#/repos?tab=recomendados">Ver todos ${icon('arrow')}</a></div>
    <div class="repo-row">${recs.map((r) => repoCard(r, null, 'recomendados')).join('')}</div>` : ''}
    <div class="section-head"><h2>Repositórios em alta na semana</h2><a href="#/repos?tab=semana">Ver todos ${icon('arrow')}</a></div>
    <div class="repo-row">${hot.map((r, i) => repoCard(r, i, 'semana')).join('')}</div>`;
}

// ---------- CONFIGURAÇÕES ----------
async function pageSettings() {
  const s = state.settings = await window.hydra.getSettings();
  view.innerHTML = `
    <div class="page-head"><div><h1>Configurações</h1><p>HydraHub ${esc(state.info.version || '')} · catálogo de ${fmtDate(state.catalog?.generatedAt)} (${state.catalogOrigin || ''})</p></div></div>
    <div class="settings card">
      <div class="set-row"><div class="l"><b>Pasta de instalação</b><span id="dir">${esc(s.installDir)}</span></div><button class="btn small" id="pick">${icon('folder')}Alterar</button></div>
      <div class="set-row"><div class="l"><b>Token do GitHub (opcional)</b><span>Sem token o GitHub libera 60 consultas por hora. <a href="https://github.com/settings/tokens">Crie um token</a> sem nenhuma permissão e cole aqui.</span></div><input class="input" id="token" type="password" placeholder="ghp_…" value="${esc(s.githubToken)}"></div>
      <div class="set-row"><div class="l"><b>Atualizar jogos sozinho</b><span>Quando sair release nova de um jogo instalado, o HydraHub baixa e atualiza ao abrir. Saves e arquivos seus na pasta continuam lá.</span></div><label class="switch"><input type="checkbox" id="auto-games" ${s.autoUpdateGames !== false ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><div class="l"><b>Incluir versões de teste (pre-release)</b><span>Mostra builds beta quando forem as mais novas.</span></div><label class="switch"><input type="checkbox" id="pre" ${s.includePrerelease ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><div class="l"><b>Atualizar catálogo agora</b><span>O catálogo é regenerado todo dia no GitHub e baixado sozinho a cada ${s.autoRefreshHours}h.</span></div><button class="btn small" id="refresh">${icon('refresh')}Atualizar</button></div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:20px;max-width:760px">O HydraHub só aponta e baixa projetos open source dos repositórios oficiais. Nenhuma ROM ou arquivo de jogo é distribuído. Nomes e marcas pertencem aos seus donos.</p>`;
  $('#pick').addEventListener('click', async () => { const d = await window.hydra.pickDir(); if (d) { state.settings = await window.hydra.setSettings({ installDir: d }); $('#dir').textContent = d; toast('Pasta salva.', 'ok'); } });
  $('#token').addEventListener('change', async (e) => { state.settings = await window.hydra.setSettings({ githubToken: e.target.value.trim() }); toast('Token salvo.', 'ok'); });
  $('#auto-games').addEventListener('change', async (e) => { state.settings = await window.hydra.setSettings({ autoUpdateGames: e.target.checked }); });
  $('#pre').addEventListener('change', async (e) => { state.settings = await window.hydra.setSettings({ includePrerelease: e.target.checked }); });
  $('#refresh').addEventListener('click', () => loadCatalog(true));
}

// ---------- BUSCA ----------
const search = $('#search');
let sel = 0;
function runSearch() {
  const q = search.value.trim();
  const box = $('#search-results');
  if (!q) { box.hidden = true; return; }
  state.filter.q = '';
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = norm(q).split(/\s+/);
  const games = state.games.filter((g) => { const h = g._hay || (g._hay = norm([g.title, ...g.aliases, ...g.platforms.map(platName), ...g.projects.map((p) => p.name)].join(' '))); return words.every((w) => h.includes(w)); })
    .sort((a, b) => (norm(b.title).startsWith(words[0]) - norm(a.title).startsWith(words[0])) || (b.playable - a.playable)).slice(0, 7);
  const tuts = TUTORIALS.filter((t) => words.every((w) => norm(t.title + ' ' + t.summary).includes(w))).slice(0, 3);
  const items = [
    ...games.map((g) => ({ href: `#/jogo/${g.id}`, html: `${g.cover ? `<img src="${esc(g.cover)}">` : `<span class="sr-ico">${icon('gamepad')}</span>`}<div><b>${esc(g.title)}</b><small>${esc(g.platforms.map(platName).join(', '))}${g.playable ? '' : ' · só código-fonte'}</small></div>` })),
    ...tuts.map((t) => ({ href: `#/tutorial/${t.id}`, html: `<span class="sr-ico">${icon('book')}</span><div><b>${esc(t.title)}</b><small>Tutorial · ${t.minutes} min</small></div>` })),
    { href: `#/jogos?all`, html: `<span class="sr-ico">${icon('filter')}</span><div><b>Ver todos os resultados para "${esc(q)}"</b><small>No catálogo completo</small></div>`, all: true },
  ];
  sel = Math.min(sel, items.length - 1);
  box.innerHTML = `${games.length ? '<div class="sr-group">Jogos</div>' : ''}${items.map((it, i) => `${tuts.length && i === games.length ? '<div class="sr-group">Tutoriais</div>' : ''}<a class="sr-item ${i === sel ? 'sel' : ''}" data-i="${i}" href="${it.href}">${it.html}</a>`).join('')}`;
  box.hidden = false;
  box._items = items;
  $$('.sr-item', box).forEach((a) => a.addEventListener('click', (e) => { const it = items[+a.dataset.i]; if (it.all) { e.preventDefault(); goAll(q); } box.hidden = true; }));
}
function goAll(q) { state.filter.q = q; state.filter.kind = 'all'; $('#search-results').hidden = true; if (location.hash.startsWith('#/jogos')) route(); else location.hash = '#/jogos'; }
search.addEventListener('input', () => { sel = 0; runSearch(); });
search.addEventListener('focus', runSearch);
search.addEventListener('keydown', (e) => {
  const box = $('#search-results');
  const items = box._items || [];
  if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); runSearch(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); runSearch(); e.preventDefault(); }
  else if (e.key === 'Enter') { const it = items[sel]; if (!it) return; if (it.all) goAll(search.value.trim()); else { location.hash = it.href; box.hidden = true; } search.blur(); }
  else if (e.key === 'Escape') { box.hidden = true; search.blur(); }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.focus(); search.select(); }
  if (e.key === 'Escape') $('#lightbox').hidden = true;
});

// ---------- inicialização ----------
async function loadCatalog(force = false) {
  const btn = $('#btn-refresh');
  btn.classList.add('spin');
  try {
    const { catalog, origin } = await window.hydra.getCatalog({ force });
    state.catalogOrigin = { online: 'online', cache: 'em cache', offline: 'offline', vazio: 'vazio' }[origin] || origin;
    if (catalog?.games) {
      state.catalog = catalog;
      state.games = catalog.games;
      state.byId = new Map(catalog.games.map((g) => [g.id, g]));
      if (force) toast(origin === 'online' ? `Catálogo atualizado: ${catalog.games.length} jogos.` : 'Sem conexão; usando o catálogo salvo.', origin === 'online' ? 'ok' : 'info');
    } else toast('Não consegui carregar o catálogo.', 'error');
  } finally { btn.classList.remove('spin'); }
  route();
}
async function loadExtras(force) {
  const [repos, stats, reqs] = await Promise.all([window.hydra.getData('repos', { force }), window.hydra.getData('stats', { force }), window.hydra.getData('requirements', { force })]);
  if (reqs?.repos) state.reqs = reqs.repos;
  if (repos?.repos) { state.repos = repos; state.repoByFull = new Map(repos.repos.map((r) => [r.full.toLowerCase(), r])); }
  if (stats?.games) state.stats = stats;
  const page = (location.hash.split('/')[1] || 'inicio').split('?')[0];
  if (['inicio', '', 'repos', 'repo', 'jogos', 'jogo'].includes(page)) route(); else renderNav(page);
}
$('#btn-refresh').addEventListener('click', () => { loadCatalog(true); loadExtras(true); });

(async () => {
  view.innerHTML = `<div class="home"><div><div class="skeleton" style="height:290px"></div><div class="quick">${'<div class="skeleton" style="height:120px"></div>'.repeat(3)}</div></div><div class="skeleton" style="height:520px"></div></div>`;
  renderAchado();
  [state.installed, state.settings, state.info] = await Promise.all([window.hydra.installed(), window.hydra.getSettings(), window.hydra.info()]);
  await loadCatalog(false);
  loadExtras(false);
  autoUpdateGames();
})();

// jogos instalados se atualizam sozinhos quando sai release nova (o que está na pasta e não veio no zip, como saves e o dump, fica)
async function autoUpdateGames() {
  if (state.settings.autoUpdateGames === false) return;
  for (const [id, inst] of Object.entries(state.installed)) {
    const repo = repoOf(inst.repo || '');
    if (!repo || state.downloads.has(id)) continue;
    const rel = await window.hydra.releases(repo);
    if (!rel?.ok || !rel.latest || !rel.best || rel.latest.tag === inst.tag) continue;
    const g = G(id);
    toast(`Atualizando ${inst.title} para ${rel.latest.tag}…`, 'info', 6000);
    const r = await window.hydra.install({ gameId: id, title: inst.title, repo, asset: rel.best, tag: rel.latest.tag, exeHint: inst.exeHint || g?.ways.find((w) => w.exeHint)?.exeHint });
    if (r.ok) { state.installed = await window.hydra.installed(); toast(`${inst.title} atualizado para ${rel.latest.tag}.`, 'ok'); }
  }
}
// atualização obrigatória: tela que cobre o app até a versão nova instalar e reiniciar
function updateLock(u) {
  let el = $('#update-lock');
  if (!el) {
    el = document.createElement('div');
    el.id = 'update-lock';
    el.className = 'modal-bg';
    el.innerHTML = `<div class="modal update-lock"><img src="assets/logo-128.png" alt=""><h3>Atualizando o HydraHub</h3><p class="muted" data-msg></p>
      <div class="progress"><div class="track"><div class="fill indet" data-fill style="width:0%"></div></div><div class="meta"><span data-meta>Baixando…</span><span data-pct></span></div></div>
      <div class="modal-actions" data-retry hidden><button class="btn primary">${icon('refresh')}Tentar de novo</button></div></div>`;
    el.querySelector('[data-retry] button').addEventListener('click', () => { el.querySelector('[data-retry]').hidden = true; window.hydra.retryUpdate(); });
    document.body.append(el);
  }
  const set = (sel, v) => { el.querySelector(sel).textContent = v; };
  const fill = el.querySelector('[data-fill]');
  if (u.version) set('[data-msg]', `Saiu a versão ${u.version}. Ela é obrigatória: o app reinicia sozinho quando terminar.`);
  if (u.state === 'progress') {
    fill.classList.remove('indet'); fill.style.width = `${u.percent || 0}%`;
    set('[data-pct]', `${(u.percent || 0).toFixed(0)}%`); set('[data-meta]', u.speed ? `Baixando · ${fmtBytes(u.speed)}/s` : 'Baixando…');
  }
  if (u.state === 'installing') { fill.classList.add('indet'); set('[data-meta]', 'Instalando e reiniciando…'); set('[data-pct]', ''); }
  if (u.state === 'error') {
    set('[data-meta]', 'Não consegui baixar a atualização. Confira a internet e tente de novo.'); set('[data-pct]', '');
    el.querySelector('[data-retry]').hidden = false;
  }
}
window.hydra.onUpdate?.((u) => {
  if (['forcing', 'progress', 'installing', 'error'].includes(u.state)) return updateLock(u);
  if (u.state === 'available') toast(`Nova versão do HydraHub (${u.version}) baixando em segundo plano…`, 'info', 6000);
  if (u.state === 'ready') toast(`HydraHub ${u.version} pronto: a atualização entra quando você fechar o app.`, 'ok', 9000);
});
