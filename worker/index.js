// Worker del portafolio: sirve la web (los ficheros de dist/) y, por delante de
// ellos, sólo las rutas de `run_worker_first` en wrangler.jsonc:
//
//   /_v          visitas que manda la web (registro.js)
//   /CV_*, /docs/*.pdf   se apunta la descarga y se sirve el PDF
//   /visitas/    el panel, tras Cloudflare Access (acceso.js)
//   /media/*     vídeos por trozos, para Safari (rango.js)

import { accesoValido, pruebaLocal } from './acceso.js';
import { conRango } from './rango.js';
import { registrar, registrarDescarga, tipoDescarga } from './registro.js';
import panelHtml from './panel/index.html';
import panelCss from './panel/panel.css';
import panelJs from './panel/panel.js';
// Generado por scripts/tamanos-media.mjs en `npm run build`.
import tamanosMedia from './media.json';

const LOTE = 2000;
const DOMINIO = 'florintodor.dev';

const CABECERAS_PANEL = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; "
    + "img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const respuesta = (cuerpo, tipo, status = 200) =>
  new Response(cuerpo, { status, headers: { ...CABECERAS_PANEL, 'Content-Type': tipo } });

async function visitas(request, env, url) {
  if (!(pruebaLocal(request, env) || (await accesoValido(request, env)))) {
    return respuesta('Acceso restringido.\n', 'text/plain; charset=utf-8', 403);
  }
  switch (url.pathname) {
    case '/visitas':
      return Response.redirect(`${url.origin}/visitas/`, 308);
    case '/visitas/':
      return respuesta(panelHtml, 'text/html; charset=utf-8');
    case '/visitas/panel.css':
      return respuesta(panelCss, 'text/css; charset=utf-8');
    case '/visitas/panel.js':
      return respuesta(panelJs, 'text/javascript; charset=utf-8');
    case '/visitas/datos': {
      // Por lotes, para no pasar del límite de CPU del plan gratuito de Workers.
      const despues = Math.max(0, parseInt(url.searchParams.get('despues'), 10) || 0);
      const { results } = await env.DB.prepare(
        `SELECT id, momento, sesion, ruta, titulo, evento, referer, esquema, navegador, sistema, ua, pantalla,
                ubicacion, region, red, segundos, origen
           FROM visitas WHERE id > ?1 AND bot = 0 AND host = ?2 ORDER BY id LIMIT ?3`,
      ).bind(despues, env.DOMINIO || DOMINIO, LOTE + 1).all();
      const mas = results.length > LOTE;
      return respuesta(JSON.stringify({ filas: results.slice(0, LOTE), mas }), 'application/json; charset=utf-8');
    }
    default:
      return respuesta('No existe.\n', 'text/plain; charset=utf-8', 404);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/_v') return registrar(request, env, ctx);
    if (url.pathname === '/visitas' || url.pathname.startsWith('/visitas/')) return visitas(request, env, url);
    if (url.pathname.startsWith('/media/')) return conRango(request, env, tamanosMedia);
    if (tipoDescarga(url.pathname)) {
      ctx.waitUntil(registrarDescarga(request, env).catch((e) => console.error('visitas: descarga sin apuntar', e)));
    }
    return env.ASSETS.fetch(request);
  },
};
