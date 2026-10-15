// Confere a ROM/ISO do jogador contra o hash publicado pelo projeto e, quando o jogo exige,
// coloca o arquivo na pasta certa com o nome certo. ROM de N64 em .v64/.n64 (byte order
// trocada) vira .z64 sozinha, que é o formato que quase todos os recomps pedem.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');

// CRC32 (o crypto do Node não tem)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32Hasher() {
  let crc = 0xffffffff;
  return {
    update(buf) { for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8); return this; },
    digest() { return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0'); },
  };
}
const ALGO = { MD5: 'md5', SHA1: 'sha1', SHA256: 'sha256' };
const hasher = (tipo) => (tipo === 'CRC32' ? crc32Hasher() : crypto.createHash(ALGO[tipo] || 'sha1'));

// cabeçalho da ROM de N64 em cada ordem de bytes
const N64 = { z64: '80371240', v64: '37804012', n64: '40123780' };
function n64Order(head) {
  const h = head.subarray(0, 4).toString('hex');
  return Object.keys(N64).find((k) => N64[k] === h) || null;
}
function toZ64(buf, order) {
  const out = Buffer.from(buf);
  if (order === 'v64') for (let i = 0; i + 1 < out.length; i += 2) { const a = out[i]; out[i] = out[i + 1]; out[i + 1] = a; }
  if (order === 'n64') for (let i = 0; i + 3 < out.length; i += 4) { const [a, b, c, d] = [out[i], out[i + 1], out[i + 2], out[i + 3]]; out[i] = d; out[i + 1] = c; out[i + 2] = b; out[i + 3] = a; }
  return out;
}

async function readHead(file, n = 64) {
  const fh = await fsp.open(file, 'r');
  try { const b = Buffer.alloc(n); await fh.read(b, 0, n, 0); return b; } finally { await fh.close(); }
}

// hash do arquivo; se for ROM de N64 fora do formato .z64, converte antes (em memória: até 128 MB)
async function inspect(file, req) {
  const tipo = req?.hash?.tipo || 'SHA1';
  const { size } = await fsp.stat(file);
  const head = await readHead(file);
  const order = n64Order(head);
  if (order && order !== 'z64' && size <= 128 * 1024 * 1024) {
    const z = toZ64(await fsp.readFile(file), order);
    return { tipo, got: hasher(tipo).update(z).digest('hex'), converted: order, data: z, size };
  }
  const h = hasher(tipo);
  await new Promise((resolve, reject) => {
    fs.createReadStream(file, { highWaterMark: 4 * 1024 * 1024 }).on('data', (c) => h.update(c)).on('end', resolve).on('error', reject);
  });
  return { tipo, got: h.digest('hex'), converted: null, data: null, size };
}

// { ok, got, expected, tipo, converted } — ok = null quando o projeto não publicou hash
async function check(file, req) {
  const r = await inspect(file, req);
  const expected = req?.hash?.valor?.toLowerCase() || null;
  return { ...r, expected, ok: expected ? r.got.toLowerCase() === expected : null };
}

module.exports = { check, inspect };
