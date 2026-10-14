// Escolhe o arquivo certo de uma release do GitHub para o sistema do usuário
// e acha o executável do jogo depois de extraído.

const path = require('node:path');

const OS_WORDS = {
  win32: [/win(dows)?(64|32)?\b/, /\bwin\b/, /\.exe$/, /\bmsvc\b/, /\bx64\b/, /\bx86_64\b/, /\bpc\b/],
  linux: [/linux/, /\.appimage$/, /\bflatpak\b/, /\bdeck\b/, /ubuntu/, /\.tar\.(gz|xz)$/],
  darwin: [/mac(os)?/, /\bosx\b/, /darwin/, /apple/, /\.dmg$/, /universal/],
};
const BAD = [/source/, /src\b/, /symbols?/, /\.pdb/, /debug/, /\.sha\d+$/, /\.sig$/, /\.asc$/, /checksum/, /\.txt$/, /\.json$/, /\.md$/];
const OTHER_ARCH = [/arm64/, /aarch64/, /armv7/, /\barm\b/, /\bi686\b/, /\bx86\b(?!_64)/, /32-?bit/];

function pickAsset(assets, platform = process.platform) {
  if (!assets?.length) return null;
  const others = Object.entries(OS_WORDS).filter(([k]) => k !== platform).map(([, v]) => v).flat();
  const scored = assets.map((a) => {
    const n = a.name.toLowerCase();
    let score = 0;
    if (BAD.some((r) => r.test(n))) score -= 100;
    if (OS_WORDS[platform]?.some((r) => r.test(n))) score += 40;
    if (others.some((r) => r.test(n)) && !OS_WORDS[platform]?.some((r) => r.test(n))) score -= 60;
    if (process.arch === 'x64' && OTHER_ARCH.some((r) => r.test(n))) score -= 30;
    if (/\.zip$/.test(n)) score += 10;                     // zip é o mais fácil de extrair aqui
    if (/\.(7z|rar)$/.test(n)) score -= 5;
    if (/setup|installer/.test(n) && platform === 'win32') score += 4;
    if (/portable/.test(n)) score += 6;
    if (/\b(dev|nightly|test)\b/.test(n)) score -= 3;
    return { ...a, score };
  }).sort((a, b) => b.score - a.score || (b.size || 0) - (a.size || 0));
  return scored[0].score > -20 ? scored[0] : null;
}

const SKIP_EXE = /(unins|uninstall|crash|update|updater|vc_?redist|vcredist|dxsetup|dotnet|helper|launcherhelper|elevate|notification|7z|unzip)/i;

function rankExecutables(files, { repo = '', title = '', platform = process.platform } = {}) {
  const want = (repo.split('/').pop() + ' ' + title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length > 2);
  const isExe = (f) => {
    const n = f.toLowerCase();
    if (platform === 'win32') return n.endsWith('.exe');
    if (platform === 'linux') return n.endsWith('.appimage') || n.endsWith('.x86_64') || !path.extname(n);
    return n.endsWith('.app') || !path.extname(n);
  };
  return files.filter(isExe).filter((f) => !SKIP_EXE.test(path.basename(f)))
    .map((f) => {
      const base = path.basename(f).toLowerCase();
      let score = want.filter((w) => base.includes(w)).length * 10;
      score -= f.split(/[\\/]/).length;                    // prefere o que está mais perto da raiz
      if (/recomp|launcher|game|play/.test(base)) score += 3;
      return { f, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}

module.exports = { pickAsset, rankExecutables };
