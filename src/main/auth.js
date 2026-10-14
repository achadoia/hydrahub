// HydraHub — login OPCIONAL com Google (OAuth de "App para computador":
// navegador do sistema + servidor de loopback + PKCE). O app funciona inteiro
// sem login; a conta só guarda nome, e-mail e foto em account.json.

const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { net, shell } = require('electron');

const CONFIG_FILE = path.join(__dirname, 'google-oauth.json');
const SCOPES = 'openid email profile';
const TIMEOUT_MS = 5 * 60e3;

// clientId/clientSecret de um cliente OAuth tipo "App para computador".
// Em apps instalados o "secret" não é segredo de verdade (o Google documenta isso).
function oauthConfig() {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  const clientId = process.env.HYDRA_GOOGLE_CLIENT_ID || file.clientId || '';
  const clientSecret = process.env.HYDRA_GOOGLE_CLIENT_SECRET || file.clientSecret || '';
  return clientId ? { clientId, clientSecret } : null;
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const page = (title, text) => `<!doctype html><meta charset="utf-8"><title>HydraHub</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#1a1d21;font-family:Montserrat,Segoe UI,sans-serif;color:#fff">
<div style="background:#252a31;border:3px solid #050607;box-shadow:8px 8px 0 #00e5ff;border-radius:12px;padding:32px 40px;text-align:center;max-width:420px">
<h1 style="margin:0 0 8px;font-weight:900">${title}</h1><p style="margin:0;color:#a7b0bd">${text}</p></div></body>`;

let pending = null; // só um login por vez

function login() {
  const cfg = oauthConfig();
  if (!cfg) return Promise.resolve({ ok: false, error: 'unconfigured' });
  if (pending) return pending.promise;

  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const stateToken = b64url(crypto.randomBytes(16));

  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const server = http.createServer();
  const finish = (result) => {
    clearTimeout(timer);
    server.close();
    pending = null;
    resolve(result);
  };
  const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), TIMEOUT_MS);
  pending = { promise, cancel: () => finish({ ok: false, error: 'cancelled' }) };

  server.on('request', async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
    const reply = (ok, title, text) => { res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' }).end(page(title, text)); };
    if (url.searchParams.get('state') !== stateToken) { reply(false, 'Link inválido', 'Tente entrar de novo pelo HydraHub.'); return; }
    const code = url.searchParams.get('code');
    if (!code) {
      reply(false, 'Login cancelado', 'Pode fechar esta aba. O HydraHub continua funcionando sem conta.');
      finish({ ok: false, error: 'cancelled' });
      return;
    }
    try {
      const tokenRes = await net.fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: cfg.clientId, client_secret: cfg.clientSecret,
          code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri,
        }).toString(),
      });
      const tok = await tokenRes.json();
      if (!tokenRes.ok || !tok.id_token) throw new Error(tok.error_description || tok.error || `HTTP ${tokenRes.status}`);
      // id_token veio direto do Google por HTTPS, então dá pra ler o payload sem validar assinatura
      const claims = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64url').toString('utf8'));
      if (claims.aud !== cfg.clientId) throw new Error('token de outro aplicativo');
      const account = { sub: claims.sub, email: claims.email, name: claims.name || claims.email, picture: claims.picture || '', loggedAt: new Date().toISOString() };
      reply(true, 'Pronto! ✅', `Você entrou como ${account.name}. Pode fechar esta aba e voltar pro HydraHub.`);
      finish({ ok: true, account });
    } catch (e) {
      reply(false, 'Não deu certo', 'Feche esta aba e tente de novo pelo HydraHub.');
      finish({ ok: false, error: e.message });
    }
  });

  let redirectUri;
  server.listen(0, '127.0.0.1', () => {
    redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.search = new URLSearchParams({
      client_id: cfg.clientId, redirect_uri: redirectUri, response_type: 'code', scope: SCOPES,
      code_challenge: challenge, code_challenge_method: 'S256', state: stateToken, prompt: 'select_account',
    }).toString();
    shell.openExternal(auth.toString());
  });
  server.on('error', (e) => finish({ ok: false, error: e.message }));
  return promise;
}

const cancel = () => { pending?.cancel(); return true; };

module.exports = { login, cancel, configured: () => !!oauthConfig() };
