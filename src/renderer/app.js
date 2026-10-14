import { icon } from './icons.js';
import { TUTORIALS, tutorialCover } from './tutorials.js';

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
const METHOD = { recompilation: 'Recompilação', decompilation: 'Decompilação', reimplementation: 'Reimplementação', 'source port': 'Source port', port: 'Port', remake: 'Remake' };
const NEEDS = { nothing: 'Não precisa de nada', rom: 'Precisa da sua ROM', files: 'Precisa dos arquivos do jogo', unknown: 'Confira no passo a passo', game: 'Precisa do jogo original', instant: 'Joga na hora' };
const fmtBytes = (n) => (!n ? '' : n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const repoOf = (url = '') => (String(url).match(/github\.com\/([^/\s?#]+\/[^/\s?#]+)/i) || [])[1]?.replace(/\.git$/, '') || null;

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
  { id: 'biblioteca', label: 'Minha Biblioteca', icon: 'library' },
  { id: 'comunidade', label: 'Comunidade', icon: 'users' },
  { id: 'links', label: 'Links Úteis', icon: 'link' },
  { id: 'config', label: 'Configurações', icon: 'gear' },
];
function renderNav(active) {
  const n = Object.keys(state.installed).length;
  $('#nav').innerHTML = NAV.map((i) => `<a class="nav-item ${i.id === active ? 'active' : ''}" href="#/${i.id}">${icon(i.icon)}<span>${i.label}</span>${i.id === 'biblioteca' && n ? `<em class="count">${n}</em>` : ''}${i.id === 'jogos' && state.games.length ? `<em class="count">${state.games.filter((g) => g.playable).length}</em>` : ''}</a>`).join('');
}

function route() {
  const [, rawPage = 'inicio', arg] = (location.hash || '#/inicio').split('?')[0].split('/');
  const page = rawPage || 'inicio';
  const map = { jogo: 'jogos', tutorial: 'tutoriais' };
  renderNav(map[page] || page);
  view.scrollTop = 0;
  const pages = { inicio: pageHome, tutoriais: pageTutorials, tutorial: pageTutorial, jogos: pageGames, jogo: pageGame, biblioteca: pageLibrary, comunidade: pageCommunity, links: pageLinks, config: pageSettings };
  (pages[page] || pageHome)(decodeURIComponent(arg || ''));
}
window.addEventListener('hashchange', route);

// ---------- componentes ----------
function cover(g, { small } = {}) {
  const img = g.cover || g.icon;
  const inst = state.installed[g.id];
  const badges = [];
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
  return state.games.filter((g) => g.playable && g.backdrop && g.kinds.includes('install')).slice(0, 8);
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
      <div class="section-head"><h2>Jogos Recompilados Recentes</h2><a href="#/jogos?sort=recent">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${recentGames().map((g) => cover(g)).join('')}</div>
      <div class="section-head"><h2>Mais populares</h2><a href="#/jogos">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${state.games.filter((g) => g.playable && g.kinds.includes('install') && g.cover).slice(0, 16).map((g) => cover(g)).join('')}</div>
      <div class="section-head"><h2>Online agora no navegador</h2><a href="#/jogos?kind=browser">Ver todos ${icon('arrow')}</a></div>
      <div class="row-scroll">${state.games.filter((g) => g.kinds.includes('browser') && g.browserOnline && g.cover).slice(0, 16).map((g) => cover(g)).join('')}</div>
      <div class="section-head"><h2>Tutoriais em destaque</h2><a href="#/tutoriais">Ver todos ${icon('arrow')}</a></div>
      <div class="tut-grid">${TUTORIALS.slice(0, 3).map(tutCard).join('')}</div>
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
function pageTutorials() {
  const withVideos = state.games.filter((g) => g.playable && g.kinds.includes('install') && g.videos?.length).slice(0, 12);
  view.innerHTML = `
    <div class="page-head"><div><h1>Tutoriais</h1><p>Guias em português, com imagens e vídeos, para instalar e aproveitar cada recomp.</p></div></div>
    <div class="tut-grid">${TUTORIALS.map(tutCard).join('')}</div>
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
function applyFilters() {
  const f = state.filter;
  const words = f.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  let list = state.games.filter((g) => {
    if (f.kind === 'playable' && !g.playable) return false;
    if (f.kind === 'install' && !g.kinds.includes('install')) return false;
    if (f.kind === 'browser' && !(g.kinds.includes('browser') && g.browserOnline !== false)) return false;
    if (f.kind === 'source' && g.playable) return false;
    if (f.kind === 'installed' && !state.installed[g.id]) return false;
    if (f.platform && !g.platforms.includes(f.platform)) return false;
    if (words.length) {
      const hay = g._hay || (g._hay = [g.title, ...g.aliases, ...g.platforms.map(platName), ...g.projects.map((p) => p.name)].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  if (f.sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
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
  const platCounts = {};
  for (const g of state.games) if (g.playable) for (const p of g.platforms) platCounts[p] = (platCounts[p] || 0) + 1;
  const plats = Object.entries(platCounts).sort((a, b) => b[1] - a[1]);
  const kinds = [['playable', 'Jogáveis', 'gamepad'], ['install', 'Instalar no PC', 'download'], ['browser', 'Navegador (online)', 'browser'], ['source', 'Só código-fonte', 'github'], ['all', 'Todos', 'filter']];
  view.innerHTML = `
    <div class="page-head"><div><h1>Jogos Recompilados</h1><p>Um jogo, uma página: juntamos os projetos de 5 fontes sem repetir nenhum.</p></div></div>
    <div class="filters">
      ${kinds.map(([k, l, ic]) => `<button class="chip ${state.filter.kind === k ? 'on' : ''}" data-kind="${k}">${icon(ic, 'style="width:15px;height:15px"')}${l}</button>`).join('')}
      ${state.filter.q ? `<button class="chip on" id="clear-q">"${esc(state.filter.q)}" ${icon('x', 'style="width:14px;height:14px"')}</button>` : ''}
      <span class="spacer"></span>
      <select class="select" id="f-plat"><option value="">Todas as plataformas</option>${plats.map(([p, n]) => `<option value="${p}" ${state.filter.platform === p ? 'selected' : ''}>${esc(platName(p))} (${n})</option>`).join('')}</select>
      <select class="select" id="f-sort">
        ${[['popular', 'Mais populares'], ['recent', 'Release mais recente'], ['az', 'A–Z'], ['year', 'Ano de lançamento']].map(([v, l]) => `<option value="${v}" ${state.filter.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="result-count" id="count"></div>
    <div class="grid" id="grid" style="margin-top:14px"></div>
    <div class="load-more"><button class="btn" id="more" hidden>Carregar mais</button></div>`;
  const draw = () => {
    const list = applyFilters();
    $('#count').textContent = `${list.length.toLocaleString('pt-BR')} jogos${state.filter.q ? ` para "${state.filter.q}"` : ''}`;
    $('#grid').innerHTML = list.length ? list.slice(0, state.shown).map((g) => cover(g)).join('') : `<div class="empty" style="grid-column:1/-1"><img src="assets/logo-128.png" alt="">Nenhum jogo encontrado com esses filtros.</div>`;
    $('#more').hidden = list.length <= state.shown;
  };
  $$('.chip[data-kind]').forEach((b) => b.addEventListener('click', () => { state.filter.kind = b.dataset.kind; state.shown = 60; $$('.chip[data-kind]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $('#f-plat').addEventListener('change', (e) => { state.filter.platform = e.target.value; state.shown = 60; draw(); });
  $('#f-sort').addEventListener('change', (e) => { state.filter.sort = e.target.value; draw(); });
  $('#more').addEventListener('click', () => { state.shown += 60; draw(); });
  $('#clear-q')?.addEventListener('click', () => { state.filter.q = ''; route(); });
  new IntersectionObserver((en) => { if (en[0].isIntersecting && !$('#more')?.hidden) { state.shown += 60; draw(); } }, { root: view, rootMargin: '600px' }).observe($('#more'));
  draw();
}

// ---------- PÁGINA DO JOGO (tutorial completo) ----------
function primaryInstallWay(g) {
  return g.ways.find((w) => w.kind === 'install' && repoOf(w.repo || w.url)) || null;
}
function pageGame(id) {
  const g = G(id);
  if (!g) { view.innerHTML = `<div class="empty"><img src="assets/logo-128.png" alt="">Jogo não encontrado. <a href="#/jogos">Voltar ao catálogo</a></div>`; return; }
  const bg = g.backdrop || g.screenshots[0] || g.cover;
  const iw = primaryInstallWay(g);
  const browser = g.ways.find((w) => w.kind === 'browser' && w.alive !== false);
  const deadBrowser = !browser && g.ways.some((w) => w.kind === 'browser');
  const needsRom = g.ways.some((w) => ['rom', 'files', 'game'].includes(w.needs)) || g.ways.some((w) => (w.steps || []).some((s) => /\b(rom|your own copy|game files|dump)\b/i.test(s)));
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
      ${needsRom ? `<div class="callout warn">${icon('cartridge')}<p><b>Você precisa da sua cópia do jogo.</b> O HydraHub instala o recomp, mas não fornece ROM nem arquivos do jogo. Veja <a href="#/tutorial/dump-rom">como fazer o dump do seu cartucho ou disco</a>.</p></div>` : ''}
      ${iw ? `<div class="callout">${icon('info')}<p><b>Requisitos:</b> placa de vídeo com Vulkan ou Direct3D 12 e o Visual C++ Redistributable. <a href="#/tutorial/requisitos">Veja o guia de preparação do PC</a>.</p></div>` : ''}
      ${deadBrowser ? `<div class="callout warn off">${icon('alert')}<p><b>Versão de navegador fora do ar.</b> No último teste (${fmtDate(g.ways.find((w) => w.kind === 'browser').checkedAt)}) os links de navegador deste jogo não responderam. O HydraHub testa de novo todo dia.</p></div>` : ''}
      ${g.ways.filter((w) => w.externalHost).map((w) => `<div class="callout warn">${icon('alert')}<p><b>Roda num servidor de terceiros.</b> A versão de navegador de ${esc(w.project || 'este port')} carrega de <code>${esc(w.externalHost)}</code>, que não é controlado pelo HydraHub nem pelo site que lista o jogo. Pode ficar lento ou sair do ar. Nunca instale nada que essa página pedir.</p></div>`).join('')}
      ${systems.length ? `<p>Disponível para: ${systems.map((s) => `<span class="tag">${esc(sysName[s] || s)}</span>`).join(' ')}</p>` : ''}
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
  bindInstallButtons(g, repo, latest, best);
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
function bindInstallButtons(g, repo, latest, best) {
  $('#btn-install')?.addEventListener('click', async () => {
    const p = window.hydra.install({ gameId: g.id, title: g.title, repo, asset: best, tag: latest.tag });
    state.downloads.set(g.id, { phase: 'start', received: 0, total: best.size, title: g.title, cover: g.cover });
    drawProgress(g, state.downloads.get(g.id));
    updateDownloadsDot();
    const r = await p;
    if (!r.ok && r.error !== 'Cancelado.') toast(`Falhou: ${r.error}`, 'error', 7000);
  });
  $('#btn-play')?.addEventListener('click', async () => {
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
  const label = d.phase === 'extract' ? 'Extraindo arquivos…' : d.phase === 'start' ? 'Iniciando download…' : `${fmtBytes(d.received)} de ${fmtBytes(d.total)}${d.speed ? ` · ${fmtBytes(d.speed)}/s` : ''}`;
  actions.innerHTML = `<div class="progress"><div class="track"><div class="fill ${d.phase === 'extract' || !d.total ? 'indet' : ''}" style="width:${pct}%"></div></div><div class="meta"><span>${label}</span><span>${d.total && d.phase === 'download' ? `${pct.toFixed(0)}%` : ''}</span></div></div>
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
    if (p.phase === 'done') toast(`${g?.title || 'Jogo'} instalado! Clique em Jogar.`, 'ok', 6000);
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
    return `<div class="dl-item">${d.cover ? `<img src="${esc(d.cover)}">` : '<img>'}<div style="flex:1;min-width:0"><div class="t">${esc(d.title)}</div><div class="progress"><div class="track"><div class="fill ${d.phase !== 'download' ? 'indet' : ''}" style="width:${pct}%"></div></div><div class="meta"><span>${d.phase === 'extract' ? 'Extraindo…' : `${fmtBytes(d.received)} / ${fmtBytes(d.total)}`}</span><a href="#/jogo/${id}">ver</a></div></div></div></div>`;
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

// ---------- CONFIGURAÇÕES ----------
async function pageSettings() {
  const s = state.settings = await window.hydra.getSettings();
  view.innerHTML = `
    <div class="page-head"><div><h1>Configurações</h1><p>HydraHub ${esc(state.info.version || '')} · catálogo de ${fmtDate(state.catalog?.generatedAt)} (${state.catalogOrigin || ''})</p></div></div>
    <div class="settings card">
      <div class="set-row"><div class="l"><b>Pasta de instalação</b><span id="dir">${esc(s.installDir)}</span></div><button class="btn small" id="pick">${icon('folder')}Alterar</button></div>
      <div class="set-row"><div class="l"><b>Token do GitHub (opcional)</b><span>Sem token o GitHub libera 60 consultas por hora. <a href="https://github.com/settings/tokens">Crie um token</a> sem nenhuma permissão e cole aqui.</span></div><input class="input" id="token" type="password" placeholder="ghp_…" value="${esc(s.githubToken)}"></div>
      <div class="set-row"><div class="l"><b>Incluir versões de teste (pre-release)</b><span>Mostra builds beta quando forem as mais novas.</span></div><label class="switch"><input type="checkbox" id="pre" ${s.includePrerelease ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><div class="l"><b>Atualizar catálogo agora</b><span>O catálogo é regenerado todo dia no GitHub e baixado sozinho a cada ${s.autoRefreshHours}h.</span></div><button class="btn small" id="refresh">${icon('refresh')}Atualizar</button></div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:20px;max-width:760px">O HydraHub só aponta e baixa projetos open source dos repositórios oficiais. Nenhuma ROM ou arquivo de jogo é distribuído. Nomes e marcas pertencem aos seus donos.</p>`;
  $('#pick').addEventListener('click', async () => { const d = await window.hydra.pickDir(); if (d) { state.settings = await window.hydra.setSettings({ installDir: d }); $('#dir').textContent = d; toast('Pasta salva.', 'ok'); } });
  $('#token').addEventListener('change', async (e) => { state.settings = await window.hydra.setSettings({ githubToken: e.target.value.trim() }); toast('Token salvo.', 'ok'); });
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
$('#btn-refresh').addEventListener('click', () => loadCatalog(true));

(async () => {
  view.innerHTML = `<div class="home"><div><div class="skeleton" style="height:290px"></div><div class="quick">${'<div class="skeleton" style="height:120px"></div>'.repeat(3)}</div></div><div class="skeleton" style="height:520px"></div></div>`;
  [state.installed, state.settings, state.info] = await Promise.all([window.hydra.installed(), window.hydra.getSettings(), window.hydra.info()]);
  await loadCatalog(false);
})();
