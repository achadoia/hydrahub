// HydraHub — processo principal: janela, catálogo remoto, GitHub releases,
// download/instalação dos recomps e execução dos jogos.

const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { pickAsset, rankExecutables } = require('./assets');

// Repositório onde o catálogo é regenerado todo dia pelo GitHub Actions
const CATALOG_URL = 'https://raw.githubusercontent.com/achadoia/hydrahub/main/catalog/catalog.json';
const BUNDLED_CATALOG = path.join(__dirname, '..', '..', 'catalog', 'catalog.json');
const RENDERER = path.join(__dirname, '..', 'renderer');
const UA = `HydraHub/${app.getVersion()}`;

const userData = app.getPath('userData');
const SETTINGS_FILE = path.join(userData, 'settings.json');
const INSTALLED_FILE = path.join(userData, 'installed.json');
const CATALOG_CACHE = path.join(userData, 'catalog-cache.json');

let win;

// ---------- persistência simples ----------
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
const defaultSettings = () => ({
  installDir: path.join(app.getPath('documents'), 'HydraHub', 'Jogos'),
  githubToken: '',
  includePrerelease: false,
  showSourceOnly: false,
  autoRefreshHours: 6,
});
const getSettings = () => ({ ...defaultSettings(), ...readJson(SETTINGS_FILE, {}) });
const getInstalled = () => readJson(INSTALLED_FILE, {});

// ---------- protocolo app:// (YouTube embed exige origem http-like) ----------
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1020, minHeight: 640,
    backgroundColor: '#0f1114',
    title: 'HydraHub',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0f1114', symbolColor: '#a7b0bd', height: 40 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://hydrahub/index.html');
  // links externos abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); } });
  // HYDRA_SHOT="pasta;#/inicio,#/jogos" → salva prints das rotas e fecha (verificação visual)
  if (process.env.HYDRA_SHOT) {
    const [dir, ...rest] = process.env.HYDRA_SHOT.split(';'); const routes = rest.join(';');
    win.webContents.on('console-message', (_e, level, msg, line, src) => { if (level >= 2) console.log('RENDERER>', msg, src, line); });
    win.webContents.once('did-finish-load', async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      await wait(3500);
      for (const [i, r] of routes.split(',').entries()) {
        if (r.startsWith('wait:')) { await wait(+r.slice(5) * 1000); continue; }
        if (r.startsWith('js:')) { console.log('JS>', JSON.stringify(await win.webContents.executeJavaScript(r.slice(3)))); continue; }
        await win.webContents.executeJavaScript(`location.hash=${JSON.stringify(r)}`);
        await wait(4000);
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(dir, `${i}-${r.replace(/[^a-z0-9]+/gi, '_')}.png`), img.toPNG());
      }
      app.quit();
    });
  }
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(RENDERER, decodeURIComponent(pathname)));
    if (!file.startsWith(RENDERER)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // O player do YouTube recusa embed sem Referer (erro 153)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.ytimg.com/*', '*://*.googlevideo.com/*'] },
    (details, cb) => {
      details.requestHeaders.Referer = 'https://hydrahub.app/';
      cb({ requestHeaders: details.requestHeaders });
    },
  );
  createWindow();
});
app.on('window-all-closed', () => app.quit());

// ---------- catálogo ----------
async function fetchJson(url, headers = {}, timeoutMs = 10000) {
  const res = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) { const err = new Error(`HTTP ${res.status}`); err.status = res.status; throw err; }
  return res.json();
}

ipcMain.handle('catalog:get', async (_e, { force } = {}) => {
  const cached = readJson(CATALOG_CACHE, null);
  const bundled = readJson(BUNDLED_CATALOG, null);
  const newest = [cached, bundled].filter(Boolean).sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''))[0] || null;
  const maxAge = getSettings().autoRefreshHours * 3600e3;
  const fresh = cached && cached.fetchedAt && Date.now() - cached.fetchedAt < maxAge;
  if (!force && fresh) return { catalog: newest, origin: 'cache' };
  try {
    const remote = await fetchJson(`${CATALOG_URL}?t=${Date.now()}`, {}, 8000);
    if (remote?.games?.length) {
      remote.fetchedAt = Date.now();
      writeJson(CATALOG_CACHE, remote);
      const best = !newest || (remote.generatedAt || '') >= (newest.generatedAt || '') ? remote : newest;
      return { catalog: best, origin: 'online' };
    }
  } catch (e) {
    console.warn('catálogo remoto indisponível:', e.message);
  }
  return { catalog: newest, origin: newest ? 'offline' : 'vazio' };
});

// ---------- GitHub releases ----------
const releaseCache = new Map();
ipcMain.handle('github:releases', async (_e, repo) => {
  const key = repo.toLowerCase();
  const hit = releaseCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60e3) return hit.data;
  const { githubToken, includePrerelease } = getSettings();
  const headers = githubToken ? { Authorization: `Bearer ${githubToken}` } : {};
  try {
    const list = await fetchJson(`https://api.github.com/repos/${repo}/releases?per_page=10`, headers);
    const releases = list.filter((r) => !r.draft && (includePrerelease || !r.prerelease));
    const latest = releases[0] || list[0] || null;
    const data = {
      ok: true,
      latest: latest && {
        tag: latest.tag_name, name: latest.name, url: latest.html_url, publishedAt: latest.published_at, prerelease: latest.prerelease,
        body: (latest.body || '').slice(0, 6000),
        assets: latest.assets.map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url, downloads: a.download_count })),
      },
      best: latest ? pickAsset(latest.assets.map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url })), process.platform) : null,
    };
    releaseCache.set(key, { at: Date.now(), data });
    return data;
  } catch (e) {
    return { ok: false, error: e.status === 403 ? 'rate' : e.status === 404 ? 'notfound' : 'network', message: e.message };
  }
});

// ---------- downloads diretos (emuladores fora do GitHub) ----------
ipcMain.handle('direct:version', async (_e, api) => {
  if (!/^https:\/\/[^/]+\//.test(api || '')) return { ok: false };
  try {
    const v = await fetchJson(api, {}, 10000);
    const file = (url, size, label) => (url ? { name: decodeURIComponent(url.split('/').pop()), url, size: size || 0, label } : null);
    return {
      ok: true, version: v.latest_version, sha256: v.sha256 || null, changelog: v.changelog || [],
      files: [
        file(v.full_download_url, v.full_file_size_bytes, 'Pacote portátil (.zip)'),
        file(v.installer_download_url || v.exe_download_url, v.installer_file_size_bytes, 'Instalador (.exe)'),
        file(v.installer_win7_download_url, v.installer_win7_file_size_bytes, 'Instalador Windows 7 (.exe)'),
      ].filter(Boolean),
    };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

// ---------- downloads e instalação ----------
const active = new Map(); // gameId -> { controller }

function send(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); }

async function downloadFile(url, dest, gameId, controller) {
  const res = await net.fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
  if (!res.ok) throw new Error(`Download falhou: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const out = fs.createWriteStream(dest);
  let received = 0, lastEmit = 0, lastBytes = 0, lastT = Date.now(), speed = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (!out.write(value)) await new Promise((r) => out.once('drain', r));
      const now = Date.now();
      if (now - lastEmit > 250) {
        speed = ((received - lastBytes) / (now - lastT)) * 1000;
        lastBytes = received; lastT = now; lastEmit = now;
        send('download:progress', { gameId, phase: 'download', received, total, speed });
      }
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  return dest;
}

async function walkFiles(dir, depth = 0, acc = []) {
  if (depth > 4) return acc;
  let entries = [];
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkFiles(full, depth + 1, acc);
    else acc.push(full);
  }
  return acc;
}

const preferExe = (files, hints = []) => {
  for (const h of hints) { const f = files.find((x) => path.basename(x).toLowerCase() === h.toLowerCase()); if (f) return f; }
  return null;
};

ipcMain.handle('game:install', async (_e, { gameId, title, repo, asset, tag, exeHint }) => {
  if (active.has(gameId)) return { ok: false, error: 'Já está baixando.' };
  const controller = new AbortController();
  active.set(gameId, { controller });
  const settings = getSettings();
  const dir = path.join(settings.installDir, gameId);
  const tmp = path.join(settings.installDir, '.downloads', asset.name);
  try {
    send('download:progress', { gameId, phase: 'start', total: asset.size || 0, received: 0 });
    await downloadFile(asset.url, tmp, gameId, controller);
    const lower = asset.name.toLowerCase();
    let exe = null;
    await fsp.mkdir(dir, { recursive: true });
    if (lower.endsWith('.zip')) {
      send('download:progress', { gameId, phase: 'extract' });
      const extract = require('extract-zip');
      await extract(tmp, { dir: dir });
      await fsp.rm(tmp, { force: true });
    } else {
      const finalPath = path.join(dir, asset.name);
      await fsp.rename(tmp, finalPath).catch(async () => { await fsp.copyFile(tmp, finalPath); await fsp.rm(tmp, { force: true }); });
      if (lower.endsWith('.exe') || lower.endsWith('.appimage')) exe = finalPath;
    }
    if (!exe) {
      const files = await walkFiles(dir);
      exe = preferExe(files, exeHint) || rankExecutables(files, { repo: repo || '', title, platform: process.platform })[0] || null;
    }
    const installed = getInstalled();
    installed[gameId] = { title, repo, tag, dir, exe, exeHint: exeHint || null, asset: asset.name, installedAt: new Date().toISOString() };
    writeJson(INSTALLED_FILE, installed);
    send('download:progress', { gameId, phase: 'done', exe, dir });
    return { ok: true, exe, dir };
  } catch (e) {
    const aborted = controller.signal.aborted;
    await fsp.rm(tmp, { force: true }).catch(() => {});
    send('download:progress', { gameId, phase: aborted ? 'cancelled' : 'error', error: e.message });
    return { ok: false, error: aborted ? 'Cancelado.' : e.message };
  } finally {
    active.delete(gameId);
  }
});

ipcMain.handle('game:cancel', (_e, gameId) => { active.get(gameId)?.controller.abort(); return true; });

ipcMain.handle('game:installed', () => {
  const installed = getInstalled();
  // remove entradas cuja pasta sumiu
  let changed = false;
  for (const [id, v] of Object.entries(installed)) if (!fs.existsSync(v.dir)) { delete installed[id]; changed = true; }
  if (changed) writeJson(INSTALLED_FILE, installed);
  return installed;
});

ipcMain.handle('game:launch', async (_e, gameId) => {
  const info = getInstalled()[gameId];
  if (!info) return { ok: false, error: 'Jogo não instalado.' };
  let exe = info.exe;
  if (!exe || !fs.existsSync(exe)) {
    const files = await walkFiles(info.dir);
    exe = preferExe(files, info.exeHint || []) || rankExecutables(files, { repo: info.repo || '', title: info.title, platform: process.platform })[0];
  }
  if (!exe) { shell.openPath(info.dir); return { ok: false, error: 'Não achei o executável; abri a pasta do jogo.' }; }
  if (process.platform !== 'win32') await fsp.chmod(exe, 0o755).catch(() => {});
  const child = spawn(exe, [], { cwd: path.dirname(exe), detached: true, stdio: 'ignore' });
  child.on('error', (err) => send('toast', { type: 'error', text: `Não abriu: ${err.message}` }));
  child.unref();
  const installed = getInstalled();
  if (installed[gameId]) { installed[gameId].exe = exe; installed[gameId].lastPlayed = new Date().toISOString(); writeJson(INSTALLED_FILE, installed); }
  return { ok: true };
});

ipcMain.handle('game:setExe', async (_e, gameId) => {
  const info = getInstalled()[gameId];
  if (!info) return null;
  const r = await dialog.showOpenDialog(win, { defaultPath: info.dir, properties: ['openFile'], filters: [{ name: 'Executável', extensions: process.platform === 'win32' ? ['exe', 'bat'] : ['*'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const installed = getInstalled();
  installed[gameId].exe = r.filePaths[0];
  writeJson(INSTALLED_FILE, installed);
  return r.filePaths[0];
});

ipcMain.handle('game:openFolder', (_e, gameId) => {
  const info = getInstalled()[gameId];
  if (info) shell.openPath(info.dir);
  return !!info;
});

ipcMain.handle('game:uninstall', async (_e, gameId) => {
  const installed = getInstalled();
  const info = installed[gameId];
  if (!info) return false;
  const r = await dialog.showMessageBox(win, {
    type: 'warning', buttons: ['Desinstalar', 'Cancelar'], defaultId: 1, cancelId: 1,
    title: 'Desinstalar', message: `Remover ${info.title}?`,
    detail: `A pasta ${info.dir} será apagada, incluindo saves e mods que estiverem dentro dela.`,
  });
  if (r.response !== 0) return false;
  await fsp.rm(info.dir, { recursive: true, force: true });
  delete installed[gameId];
  writeJson(INSTALLED_FILE, installed);
  return true;
});

// ---------- configurações e utilidades ----------
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:set', (_e, patch) => { const s = { ...getSettings(), ...patch }; writeJson(SETTINGS_FILE, s); releaseCache.clear(); return s; });
ipcMain.handle('settings:pickDir', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], defaultPath: getSettings().installDir });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:open', (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });
ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, arch: process.arch }));
