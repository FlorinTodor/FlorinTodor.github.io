// Webs de GitHub Pages de otros repos que cuelgan de florintodor.dev/<repo>/.
// Las servía GitHub mientras el dominio apuntaba allí; ahora el dominio es del
// Worker, que las pide a florintodor.github.io/<repo>/ y las devuelve sin cambiar
// la URL (los enlaces que ya circulan siguen valiendo).
//
// Para que github.io las sirva en vez de redirigir aquí, la web de usuario
// (repo FlorinTodor.github.io, rama gh-pages) no tiene dominio propio en Pages:
// si lo tuviera, GitHub mandaría la petición de vuelta al Worker.
//
// Cada repo de la lista va también en `run_worker_first` de wrangler.jsonc.

export const REPOS = ['bugbounty', 'rutina'];
const ORIGEN = 'https://florintodor.github.io';
// Sólo lo que hace falta para la caché y los vídeos; nada de cookies del dominio.
const PASAN = ['accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range'];

export const repoDePagina = (ruta) => REPOS.find((r) => ruta === `/${r}` || ruta.startsWith(`/${r}/`));

export async function desdeGithub(request, pedir = fetch) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Método no permitido.\n', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const url = new URL(request.url);
  const cabeceras = new Headers();
  for (const nombre of PASAN) {
    const valor = request.headers.get(nombre);
    if (valor) cabeceras.set(nombre, valor);
  }
  const r = await pedir(ORIGEN + url.pathname + url.search, { method: request.method, headers: cabeceras, redirect: 'manual' });
  const headers = new Headers(r.headers);
  // GitHub redirige a sí mismo (/rutina -> /rutina/): que la barra se añada aquí.
  const destino = headers.get('Location');
  if (destino) {
    const d = new URL(destino, ORIGEN);
    if (d.hostname === new URL(ORIGEN).hostname) headers.set('Location', url.origin + d.pathname + d.search + d.hash);
  }
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
}
