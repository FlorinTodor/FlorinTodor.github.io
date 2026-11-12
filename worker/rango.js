// Vídeos por trozos (cabecera Range -> 206 Partial Content).
//
// Los ficheros estáticos de Workers devuelven siempre el fichero entero con 200,
// y Safari (iPhone, iPad, Mac) no reproduce un MP4 si el servidor no sirve
// trozos: pide "bytes=0-1" y espera un 206. El Worker va por delante en /media/*
// (run_worker_first), pide el fichero entero a los estáticos y deja pasar sólo
// el trozo pedido, sin cargarlo en memoria.

export const CACHE_MEDIA = 'public, max-age=86400, stale-while-revalidate=604800';
// Las de public/_headers no llegan a lo que responde el Worker.
export const SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Deja pasar del flujo sólo los bytes [inicio, fin] y corta la lectura al acabar.
export function recortar(inicio, fin) {
  let pos = 0;
  return new TransformStream({
    transform(trozo, control) {
      const desde = Math.max(inicio - pos, 0);
      const hasta = Math.min(fin + 1 - pos, trozo.byteLength);
      if (hasta > desde) control.enqueue(trozo.subarray(desde, hasta));
      pos += trozo.byteLength;
      if (pos > fin) control.terminate();
    },
  });
}

// Con la longitud fija, Workers manda Content-Length en vez de ir a trozos
// (chunked); fuera de Workers (las pruebas) no existe y se deja tal cual.
function conLongitud(flujo, longitud) {
  if (typeof FixedLengthStream !== 'function') return flujo;
  // eslint-disable-next-line no-undef
  const { readable, writable } = new FixedLengthStream(longitud);
  flujo.pipeTo(writable).catch(() => {});
  return readable;
}

// "bytes=100-199", "bytes=100-" o "bytes=-500". Devuelve [inicio, fin], null si
// no se entiende (se sirve entero) o 'fuera' si no cabe en el fichero (416).
export function leerRango(cabecera, total) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((cabecera || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let inicio;
  let fin;
  if (m[1] === '') {
    const ultimos = Number(m[2]);
    if (!ultimos) return 'fuera';
    inicio = Math.max(0, total - ultimos);
    fin = total - 1;
  } else {
    inicio = Number(m[1]);
    fin = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
  }
  return inicio > fin || inicio >= total ? 'fuera' : [inicio, fin];
}

// `tamanos`: bytes de cada fichero de /media/, apuntados al compilar
// (scripts/tamanos-media.mjs), porque la respuesta de los estáticos no trae
// Content-Length dentro del Worker.
export async function conRango(request, env, tamanos = {}) {
  const cabeceras = new Headers(request.headers);
  cabeceras.delete('Range');
  cabeceras.delete('If-Range');
  const r = await env.ASSETS.fetch(new Request(request.url, { method: request.method, headers: cabeceras }));
  const total = Number(r.headers.get('Content-Length')) || tamanos[new URL(request.url).pathname] || 0;
  if (r.status !== 200 || !r.body || r.headers.has('Content-Encoding') || !(total > 0)) return r;

  const headers = new Headers(r.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', CACHE_MEDIA);
  for (const [k, v] of Object.entries(SEGURIDAD)) headers.set(k, v);
  const entero = () => new Response(r.body, { status: 200, headers });
  if (request.method !== 'GET' || !request.headers.has('Range')) return entero();
  // If-Range con otra versión del fichero: se manda entero, como pide la norma.
  const siRango = request.headers.get('If-Range');
  if (siRango && siRango !== r.headers.get('ETag')) return entero();

  const rango = leerRango(request.headers.get('Range'), total);
  if (rango === null) return entero();
  if (rango === 'fuera') {
    await r.body.cancel();
    headers.set('Content-Range', `bytes */${total}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  const [inicio, fin] = rango;
  const longitud = fin - inicio + 1;
  headers.set('Content-Range', `bytes ${inicio}-${fin}/${total}`);
  headers.set('Content-Length', String(longitud));
  return new Response(conLongitud(r.body.pipeThrough(recortar(inicio, fin)), longitud), { status: 206, headers });
}
