// Escolhe o arquivo certo de uma release do GitHub para o sistema do usuário
// e acha o executável do jogo depois de extraído.

const path = require('node:path');

// "palavra inteira" em nome de arquivo: _ - . também separam (o \b do JS trata _ como letra,
// e aí "Game_Windows_x64.zip" não casava com windows)
const w = (src) => new RegExp(`(?<![a-z0-9])(?:${src})(?![a-z0-9])`);

// palavras que indicam o sistema (arquitetura como x64/x86_64 NÃO conta: AppImage de Linux também tem)
const OS_WORDS = {
  win32: [w('win(dows)?(64|32)?'), /\.(exe|msi)$/, w('msvc'), w('pc')],
  linux: [/linux/, /\.appimage$/, /flatpak/, /\.snap$/, w('deck'), /ubuntu/, /\.run$/, /\.deb$/, /\.rpm$/],
  darwin: [w('mac(os)?'), w('osx'), /darwin/, w('apple'), /\.dmg$/, /\.pkg$/, w('universal')],
  other: [/android/, /\.apk$/, w('ios'), /\.ipa$/, /\.vpk$/, w('vita'), w('switch'), /\.nro$/, /\.nsp$/, w('3ds'), /\.cia$/, w('psp'), /wasm/, /emscripten/, w('web')],
};
const BAD = [/source/, w('src'), /symbols?/, /\.pdb/, w('pdb'), /debug/, /\.sha\d+$/, /\.sig$/, /\.asc$/, /checksum/, /sha\d*sums/, /toolchain/,
  /\.(txt|json|md|html?|xml|svg|toml|ini|ya?ml|tsv|pb|whl|vsix|dll|bin|blockmap|mp4|webm|mkv|mov|gif|png|jpe?g|webp)$/];
// pacotes que acompanham o jogo mas não são o jogo
const EXTRA = w('mods?|modding|kit|studio|patch|updater|payload|annotations|old|noavx2?|lobby|server|dedicated');
// formatos que o HydraHub sabe instalar no Windows (zip/7z/rar/tar extraídos; exe/msi rodados)
const WIN_KINDS = /\.(zip|7z|rar|exe|msi|tar\.(gz|xz|bz2|zst)|tgz)$/;
const ARM = [/arm64/, /aarch64/, /armv7/, w('arm')];
const X86_32 = [w('i686'), w('x86'), /32-?bit/, w('i386'), w('win32')];
const isSetupName = (n) => /setup|installer|install(?![a-z])|\.msi$/i.test(n);

function pickAsset(assets, platform = process.platform) {
  if (!assets?.length) return null;
  const mine = OS_WORDS[platform] || [];
  const others = Object.entries(OS_WORDS).filter(([k]) => k !== platform).map(([, v]) => v).flat();
  const scored = assets.map((a) => {
    const n = a.name.toLowerCase();
    let score = 0;
    const isMine = mine.some((r) => r.test(n)) || (platform === 'win32' && /portable/.test(n) && !others.some((r) => r.test(n)));
    if (BAD.some((r) => r.test(n))) score -= 100;
    if (platform === 'win32' && !WIN_KINDS.test(n)) score -= 100;  // .AppImage, arquivo sem extensão, .gz solto...
    if (isMine) score += 40;
    if (others.some((r) => r.test(n)) && !isMine) score -= 60;
    if (EXTRA.test(n)) score -= 40;
    if (/\.(tar\.\w+|tgz)$/.test(n) && !isMine) score -= 100;  // tar sem "windows" no nome é código ou ferramenta
    if (/x64|x86_64|amd64|win64/.test(n)) score += 3;
    if (process.arch === 'x64' && ARM.some((r) => r.test(n))) score -= 60;      // não roda
    if (process.arch === 'x64' && X86_32.some((r) => r.test(n))) score -= 8;    // roda, mas prefere 64 bits
    if (/\.zip$/.test(n)) score += 10;                     // zip é o mais fácil de extrair aqui
    if (/\.(7z|rar|tar\.\w+|tgz)$/.test(n)) score += 5;
    if (/portable/.test(n)) score += 6;                   // versão portátil dispensa instalador
    if (platform === 'win32' && isSetupName(n)) score -= 30; // instalador só se não houver outra opção
    if (w('dev|nightly|test').test(n)) score -= 3;
    return { ...a, score };
  }).sort((a, b) => b.score - a.score || (b.size || 0) - (a.size || 0));
  const best = scored[0].score > -20 ? { ...scored[0] } : null;
  // .exe solto que depende de DLLs publicadas separadas na mesma release
  if (best && /\.exe$/i.test(best.name)) {
    const dlls = assets.filter((a) => /\.dll$/i.test(a.name));
    if (dlls.length) best.companions = dlls;
  }
  return best;
}

const SKIP_EXE = /(unins|uninstall|crash|update|updater|vc_?redist|vcredist|dxsetup|dotnet|helper|launcherhelper|elevate|notification|7z|unzip)/i;

function rankExecutables(files, { repo = '', title = '', platform = process.platform } = {}) {
  const want = (repo.split('/').pop() + ' ' + title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((x) => x.length > 2);
  const isExe = (f) => {
    const n = f.toLowerCase();
    if (platform === 'win32') return n.endsWith('.exe');
    if (platform === 'linux') return n.endsWith('.appimage') || n.endsWith('.x86_64') || !path.extname(n);
    return n.endsWith('.app') || !path.extname(n);
  };
  return files.filter(isExe).filter((f) => !SKIP_EXE.test(path.basename(f)))
    .map((f) => {
      const base = path.basename(f).toLowerCase();
      let score = want.filter((x) => base.includes(x)).length * 10;
      score -= f.split(/[\\/]/).length;                    // prefere o que está mais perto da raiz
      if (/recomp|launcher|game|play/.test(base)) score += 3;
      return { f, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}

module.exports = { pickAsset, rankExecutables, isSetupName };
