// El panel de /visitas/ sólo se sirve con la firma de Cloudflare Access.
//
// Access corta antes a quien no ha entrado, pero el Worker lo comprueba igual:
// si Access se desactiva, se configura mal o se entra por la dirección de
// workers.dev (que Access no cubre), el panel responde 403 en vez de quedar a la
// vista. Sin ACCESS_EQUIPO o ACCESS_AUD tampoco se abre.
// https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

const UNA_HORA = 3600_000;
let cache = { equipo: '', claves: new Map(), caducan: 0 };

const base64url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
};
const json = (s) => JSON.parse(new TextDecoder().decode(base64url(s)));

async function clave(equipo, kid, ahora, pedir) {
  if (cache.equipo !== equipo || ahora > cache.caducan || !cache.claves.has(kid)) {
    const r = await pedir(`https://${equipo}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!r.ok) throw new Error(`certs de Access: ${r.status}`);
    const { keys = [] } = await r.json();
    const claves = new Map();
    for (const jwk of keys) {
      if (jwk.kty !== 'RSA' || !jwk.kid) continue;
      claves.set(jwk.kid, await crypto.subtle.importKey(
        'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    }
    cache = { equipo, claves, caducan: ahora + UNA_HORA };
  }
  return cache.claves.get(kid);
}

export async function accesoValido(request, env, { pedir = fetch, ahora = Date.now() } = {}) {
  const equipo = env.ACCESS_EQUIPO;
  const aud = env.ACCESS_AUD;
  if (!equipo || !aud || !/^[a-z0-9-]+$/.test(equipo)) return false;
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  const partes = jwt ? jwt.split('.') : [];
  if (partes.length !== 3) return false;
  const [cab64, datos64, firma64] = partes;
  try {
    const cab = json(cab64);
    if (cab.alg !== 'RS256') return false;
    const llave = await clave(equipo, cab.kid, ahora, pedir);
    if (!llave) return false;
    const firmada = new TextEncoder().encode(`${cab64}.${datos64}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', llave, base64url(firma64), firmada))) return false;
    const datos = json(datos64);
    const segundos = ahora / 1000;
    const auds = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
    return auds.includes(aud)
      && datos.iss === `https://${equipo}.cloudflareaccess.com`
      && typeof datos.exp === 'number' && datos.exp > segundos
      && (typeof datos.nbf !== 'number' || datos.nbf <= segundos + 60);
  } catch {
    return false;
  }
}

// Para probar el panel con `wrangler dev`: sólo en localhost y con
// PANEL_SIN_ACCESS=1 en .dev.vars, que no sale del ordenador.
export function pruebaLocal(request, env) {
  const { hostname } = new URL(request.url);
  return env.PANEL_SIN_ACCESS === '1' && (hostname === 'localhost' || hostname === '127.0.0.1');
}
