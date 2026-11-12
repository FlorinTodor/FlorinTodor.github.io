// Panel de /visitas/: pide las filas al Worker (/visitas/datos, por lotes) y lo
// calcula todo en el navegador. Es el panel que antes se generaba cada 12 horas
// con la exportación de GoatCounter, ahora en directo.
'use strict';

const ZONA = 'Europe/Madrid';
const DOMINIO = 'florintodor.dev';
const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const ESQUEMAS = { h: 'enlace (cabecera Referer)', g: 'buscador o app (deducido)', c: 'campaña (utm_*)', o: 'otro (app)' };
const EVENTOS = {
  cv: 'descarga del CV', correo: 'clic en el correo', linkedin: 'clic en LinkedIn',
  github: 'clic en GitHub', memoria: 'descarga de la memoria del TFG',
};
const CONTACTO = ['correo', 'linkedin', 'github'];
const BUSCADORES = ['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia'];
const REDES = [['linkedin', 'LinkedIn', 'red'], ['lnkd.in', 'LinkedIn', 'red'], ['github', 'GitHub', 'red'],
  ['google', 'Google', 'buscador'], ['bing', 'Bing', 'buscador'], ['duckduckgo', 'DuckDuckGo', 'buscador'],
  ['t.co', 'X / Twitter', 'red'], ['twitter', 'X / Twitter', 'red'], ['facebook', 'Facebook', 'red'],
  ['instagram', 'Instagram', 'red'], ['whatsapp', 'WhatsApp', 'red'], ['reddit', 'Reddit', 'red']];
// Dos vistas de la misma página con menos de esto entre ellas son una recarga.
const RECARGA = 10;
// Sin actividad durante más de esto, lo siguiente es otra visita.
const CORTE_MIN = 30;
// Dos PDF del mismo navegador con menos de esto entre ellos: un robot que los
// baja todos de golpe (una persona no hace dos clics en tan poco).
const RAFAGA_MS = 2000;
const POR_TANDA = 200;

// --- Utilidades ---

const e = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dos = (n) => String(n).padStart(2, '0');
const nombresPais = new Intl.DisplayNames(['es'], { type: 'region' });
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

// La fecha en hora de Madrid, por partes.
function madrid(ms) {
  const p = Object.fromEntries(formato.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const [anio, mes, dia] = [+p.year, +p.month, +p.day];
  return {
    anio, mes, dia, hora: +p.hour, min: +p.minute, seg: +p.second,
    fecha: `${p.year}-${p.month}-${p.day}`,
    sem: (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() + 6) % 7,
  };
}
const fDia = (m) => `${dos(m.dia)}/${dos(m.mes)}/${m.anio}`;
const fHora = (m) => `${dos(m.hora)}:${dos(m.min)}`;
const fSeg = (m) => `${fHora(m)}:${dos(m.seg)}`;

function duracion(segundos) {
  const s = Math.floor(segundos);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${dos(s % 60)} s`;
  return `${Math.floor(m / 60)} h ${dos(m % 60)} min`;
}

// Contador ordenado como el Counter.most_common de Python: más veces primero
// y, a igualdad, en el orden en que aparecieron.
function contar(lista) {
  const m = new Map();
  for (const k of lista) m.set(k, (m.get(k) || 0) + 1);
  return m;
}
const mayores = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

// --- Lo que se sabe de cada fila ---

function procedencia(v) {
  const ref = (v.referer || '').trim();
  const esquema = v.esquema;
  if (!ref) return ['Directo o desconocido', 'directo'];
  if (esquema === 'c') return [`Campaña: ${ref}`, 'campaña'];
  if (esquema === 'g' || esquema === 'o') return [ref, BUSCADORES.includes(ref.toLowerCase()) ? 'buscador' : 'otro'];
  let host = ref;
  try { host = new URL(ref.includes('//') ? ref : `https://${ref}`).hostname || ref; } catch { /* se queda tal cual */ }
  host = host.replace(/^www\./, '');
  if (host.endsWith(DOMINIO)) return ['Tu propia web', 'interno'];
  for (const [clave, nombre, tipo] of REDES) if (host.includes(clave)) return [nombre, tipo];
  return [host, 'otro'];
}

function bandera(loc) {
  const pais = (loc || '').split('-')[0].toUpperCase();
  if (!/^[A-Z]{2}$/.test(pais)) return '';
  return String.fromCodePoint(...[...pais].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// Cloudflare da el nombre de la región en inglés ("Andalusia"); las de España
// van en español por su código ISO 3166-2.
const COMUNIDADES = {
  AN: 'Andalucía', AR: 'Aragón', AS: 'Asturias', IB: 'Illes Balears', CN: 'Canarias', CB: 'Cantabria',
  CL: 'Castilla y León', CM: 'Castilla-La Mancha', CT: 'Cataluña', EX: 'Extremadura', GA: 'Galicia',
  RI: 'La Rioja', MD: 'Comunidad de Madrid', MC: 'Región de Murcia', NC: 'Navarra', PV: 'País Vasco',
  VC: 'Comunitat Valenciana', CE: 'Ceuta', ML: 'Melilla',
};
let regiones = new Map();
function nombreLugar(loc) {
  if (!loc) return 'desconocido';
  const [p, r] = loc.split('-');
  let nombre = p;
  try { nombre = nombresPais.of(p) || p; } catch { /* código raro */ }
  if (!r) return nombre;
  return `${nombre} (${(p === 'ES' && COMUNIDADES[r]) || regiones.get(loc) || r})`;
}
const pais = (k) => (k ? `${bandera(k)} ${e(nombreLugar(k))}` : 'desconocido');

function evento(v) {
  if (v._ev !== undefined) return v._ev;
  const i = v.ruta.indexOf(': ');
  const tipo = i < 0 ? '' : v.ruta.slice(0, i);
  v._ev = i >= 0 && (tipo in EVENTOS || v.evento) ? [tipo, v.ruta.slice(i + 2)] : null;
  return v._ev;
}

function textoEvento(v) {
  const [tipo, desde] = evento(v);
  let nombre = EVENTOS[tipo] || tipo;
  if (tipo === 'cv') nombre += v.titulo.endsWith('_en.pdf') ? ' en inglés' : ' en español';
  return `${nombre} desde ${desde}`;
}

function pantalla(v) {
  const [a, h, d] = (v.pantalla || '').split(',').map((x) => parseFloat(x) || 0);
  return a ? [Math.trunc(a), Math.trunc(h || 0), d || 0] : null;
}

function textoPantalla(v) {
  const p = pantalla(v);
  if (!p) return 'desconocida';
  const [ancho, alto, densidad] = p;
  if (!alto) return `${ancho} px de ancho`;
  return `${ancho}×${alto} px` + (densidad ? `, densidad ${densidad}` : '');
}

function dispositivo(v) {
  const p = pantalla(v);
  if (!p) return 'desconocido';
  const movil = /Android|iOS/.test(v.sistema);
  const ancho = movil ? Math.min(p[0], p[1] || p[0]) : p[0];
  return ancho < 600 ? 'móvil' : ancho < 1024 ? 'tablet' : 'ordenador';
}

function textoSistema(v) {
  const s = v.sistema || 'desconocido';
  // GoatCounter leía el User-Agent recortado de Chrome, que siempre dice "Android 10".
  if (s === 'Android 10' && (v.navegador || '').startsWith('Chrome') && v.origen === 'goatcounter') {
    return 'Android (Chrome no dice la versión real)';
  }
  return s;
}

const idioma = (ruta) => (ruta === '/en' || ruta.startsWith('/en/') ? 'inglés' : 'español');
const huella = (v) => [v.navegador, v.sistema, v.pantalla, v.ubicacion].join('|');

// --- Visitas ---

// Aparta las descargas en ráfaga (filas ya ordenadas por fecha).
function sinRafagas(filas) {
  const porSesion = new Map();
  for (const v of filas) {
    if (v.origen !== 'servidor') continue;
    if (!porSesion.has(v.sesion)) porSesion.set(v.sesion, []);
    porSesion.get(v.sesion).push(v);
  }
  const fuera = new Set();
  for (const lista of porSesion.values()) {
    for (let i = 1; i < lista.length; i++) {
      if (lista[i].t - lista[i - 1].t < RAFAGA_MS) {
        fuera.add(lista[i]);
        fuera.add(lista[i - 1]);
      }
    }
  }
  return [filas.filter((v) => !fuera.has(v)), fuera.size];
}

function sesiones(filas) {
  const grupos = new Map();
  filas.forEach((v, i) => {
    const k = v.sesion || `sin-sesion-${i}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(v);
  });
  const lista = [];
  for (const g of grupos.values()) {
    g.sort((a, b) => a.t - b.t);
    let actual = [];
    for (const v of g) {
      if (actual.length && v.t - actual[actual.length - 1].t > CORTE_MIN * 60_000) {
        lista.push(actual);
        actual = [];
      }
      actual.push(v);
    }
    lista.push(actual);
  }
  return lista.sort((a, b) => b[0].t - a[0].t);
}

// Las filas con las recargas seguidas juntadas: [[fila, veces]].
function pasosDe(g) {
  const pasos = [];
  for (const v of g) {
    const ultimo = pasos[pasos.length - 1];
    if (ultimo && !evento(v) && !evento(ultimo[0]) && v.ruta === ultimo[0].ruta && (v.t - ultimo[0].t) / 1000 < RECARGA) {
      ultimo[1] += 1;
    } else {
      pasos.push([v, 1]);
    }
  }
  return pasos;
}

function origenSesion(g) {
  const [origen, tipo] = procedencia(g[0]);
  // La primera página registrada ya venía de la web: el principio de la visita
  // no se contó (bloqueador, o antes de activar la recogida).
  if (tipo === 'interno') return ['Sin registrar (ya estaba en la web)', 'interno'];
  return [origen, tipo];
}

// Desde la llegada hasta que dejó de ver la última página. Con GoatCounter no
// se sabía cuánto se quedaba en la última, sólo el tiempo entre páginas.
function duracionVisita(g) {
  const fin = Math.max(...g.map((v) => v.t + (v.segundos || 0) * 1000));
  return (fin - g[0].t) / 1000;
}

// --- HTML ---

function barras(contador, fmt = e, n = 10) {
  const top = mayores(contador, n);
  const total = Math.max(1, ...top.map(([, c]) => c));
  const filas = top.map(([k, c]) => `<li><span class="et">${fmt(k)}</span><span class="num">${c}</span>`
    + `<span class="barra"><i data-ancho="${Math.round((100 * c) / total)}"></i></span></li>`).join('');
  return `<ul>${filas || '<li class="vacio">Nada todavía</li>'}</ul>`;
}

function columnas(pares) {
  const total = Math.max(0, ...pares.map(([, c]) => c)) || 1;
  return '<div class="columnas">' + pares.map(([et, c]) =>
    `<div><b>${c || ''}</b><i data-alto="${Math.round((100 * c) / total)}"></i><small>${e(et)}</small></div>`).join('') + '</div>';
}

const bloque = (titulo, contenido, nota = '') =>
  `<div class="bloque"><h3>${titulo}</h3>${contenido}${nota ? `<p class="nota">${nota}</p>` : ''}</div>`;
const codigo = (k) => `<code>${e(k)}</code>`;

function informe(todas) {
  const [filas, rafagas] = sinRafagas(todas);
  const grupos = sesiones(filas);
  const pasos = new Map(grupos.map((g) => [g, pasosDe(g)]));
  const paginas = grupos.flatMap((g) => pasos.get(g).filter(([v]) => !evento(v)).map(([v]) => v));
  const eventos = filas.filter(evento);
  let recargas = 0;
  for (const g of grupos) for (const [, n] of pasos.get(g)) recargas += n - 1;
  const nPaginas = (g) => pasos.get(g).filter(([v]) => !evento(v)).length;
  const duraciones = grupos.map(duracionVisita);
  const rebotes = grupos.filter((g) => nPaginas(g) <= 1).length;
  const porHuella = new Map();
  for (const g of grupos) {
    const h = huella(g[0]);
    if (!porHuella.has(h)) porHuella.set(h, []);
    porHuella.get(h).push(g);
  }

  // --- Resúmenes ---
  let dias = [];
  if (filas.length) {
    // Las filas llegan ordenadas por fecha.
    const primero = filas[0].m;
    const ultimo = filas[filas.length - 1].m;
    const inicio = Date.UTC(primero.anio, primero.mes - 1, primero.dia);
    const fin = Date.UTC(ultimo.anio, ultimo.mes - 1, ultimo.dia);
    for (let d = inicio; d <= fin; d += 86_400_000) dias.push(new Date(d).toISOString().slice(0, 10));
    dias = dias.slice(-31);
  }
  const conRegion = contar(grupos.filter((g) => g[0].ubicacion.includes('-')).map((g) => g[0].ubicacion));
  const porDia = contar(grupos.map((g) => g[0].m.fecha));
  const porHora = contar(grupos.map((g) => g[0].m.hora));
  const porSemana = contar(grupos.map((g) => g[0].m.sem));
  const n = grupos.length;
  const cuenta = (tipos) => eventos.filter((v) => tipos.includes(evento(v)[0])).length;

  const resumen = `
<section class="cifras">
  <div class="cifra"><b>${n}</b><span>visitas</span></div>
  <div class="cifra"><b>${paginas.length}</b><span>páginas vistas</span></div>
  <div class="cifra"><b>${n ? (paginas.length / n).toFixed(1) : '0.0'}</b><span>páginas por visita</span></div>
  <div class="cifra"><b>${duraciones.length ? duracion(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : '-'}</b><span>duración media</span></div>
  <div class="cifra"><b>${n ? Math.round((100 * rebotes) / n) : 0}%</b><span>se van tras una página</span></div>
  <div class="cifra"><b>${cuenta(['cv'])}</b><span>descargas del CV</span></div>
  <div class="cifra"><b>${cuenta(CONTACTO)}</b><span>clics de contacto</span></div>
  <div class="cifra"><b>${grupos.filter((g) => origenSesion(g)[0] === 'LinkedIn').length}</b><span>llegan desde LinkedIn</span></div>
  <div class="cifra"><b>${[...porHuella.values()].filter((gs) => gs.length > 1).length}</b><span>dispositivos que repiten</span></div>
</section>

<h2>Cuándo</h2>
<div class="rejilla tres">
  ${bloque('Visitas por día', dias.length ? columnas(dias.map((d) => [`${d.slice(8, 10)}/${d.slice(5, 7)}`, porDia.get(d) || 0])) : '<p class="vacio">Nada todavía</p>', 'Últimos 31 días con datos.')}
  ${bloque('A qué hora llegan', columnas([...Array(24).keys()].map((h) => [String(h), porHora.get(h) || 0])), 'Hora de Madrid.')}
  ${bloque('Qué día de la semana', columnas(DIAS_SEMANA.map((d, i) => [d.slice(0, 3), porSemana.get(i) || 0])))}
</div>

<h2>De dónde</h2>
<div class="rejilla">
  ${bloque('Procedencia', barras(contar(grupos.map((g) => origenSesion(g)[0]))), 'La de la primera página de cada visita.')}
  ${bloque('Enlace exacto de procedencia', barras(contar(grupos.filter((g) => g[0].referer && origenSesion(g)[1] !== 'interno').map((g) => g[0].referer)), codigo))}
  ${bloque('Tipo de procedencia', barras(contar(grupos.filter((g) => origenSesion(g)[1] !== 'interno').map((g) => ESQUEMAS[g[0].esquema] || 'sin procedencia'))))}
  ${bloque('País', barras(contar(grupos.map((g) => g[0].ubicacion.split('-')[0])), pais)
    + (conRegion.size ? `<h3>Región</h3>${barras(conRegion, pais)}` : ''))}
</div>

<h2>Qué ven y qué hacen</h2>
<div class="rejilla">
  ${bloque('Páginas más vistas', barras(contar(paginas.map((v) => v.ruta)), codigo))}
  ${bloque('Página de entrada', barras(contar(grupos.map((g) => (pasos.get(g).find(([v]) => !evento(v)) || [{ ruta: '-' }])[0].ruta)), codigo))}
  ${bloque('Última página antes de irse', barras(contar(grupos.map((g) => ([...pasos.get(g)].reverse().find(([v]) => !evento(v)) || [{ ruta: '-' }])[0].ruta)), codigo))}
  ${bloque('Idioma del sitio', barras(contar(paginas.map((v) => idioma(v.ruta)))))}
  ${bloque('Clics y descargas', barras(contar(eventos.map((v) => EVENTOS[evento(v)[0]] || evento(v)[0]))))}
  ${bloque('Desde qué página hacen clic', barras(contar(eventos.map((v) => evento(v)[1])), codigo))}
  ${bloque('CV descargado', barras(contar(eventos.filter((v) => evento(v)[0] === 'cv').map((v) => `${v.titulo.endsWith('_en.pdf') ? 'inglés' : 'español'}, desde ${evento(v)[1]}`))))}
  ${bloque('Páginas por visita', barras(contar(grupos.map((g) => `${nPaginas(g)} página(s)`))))}
</div>

<h2>Con qué</h2>
<div class="rejilla">
  ${bloque('Dispositivo', barras(contar(grupos.map((g) => dispositivo(g[0])))), 'Deducido del tamaño de pantalla.')}
  ${bloque('Navegador', barras(contar(grupos.map((g) => g[0].navegador || 'desconocido'))))}
  ${bloque('Sistema', barras(contar(grupos.map((g) => textoSistema(g[0])))))}
  ${bloque('Pantalla', barras(contar(grupos.map((g) => textoPantalla(g[0])))))}
</div>`;

  // --- Visita por visita ---
  const tarjetas = grupos.map((g) => {
    const primera = g[0];
    const ultima = g[g.length - 1];
    const [origen, tipo] = origenSesion(g);
    const lista = pasos.get(g);
    const ultimaPagina = [...lista].reverse().find(([v]) => !evento(v));
    const filasHtml = lista.map(([v, veces], i) => {
      const siguiente = i + 1 < lista.length ? lista[i + 1][0].t : null;
      let estancia = '';
      if (siguiente) estancia = `<span class="estancia">${duracion((siguiente - v.t) / 1000)} hasta lo siguiente</span>`;
      else if (ultimaPagina && v === ultimaPagina[0] && v.segundos != null) estancia = `<span class="estancia">${duracion(v.segundos)} con la página a la vista</span>`;
      const repetida = veces > 1 ? `<span class="estancia">(recargada, ×${veces})</span>` : '';
      const texto = evento(v)
        ? `<code>⬇ ${e(textoEvento(v))}</code><span class="titulo">${e(v.titulo)}</span>`
        : `<code>${e(v.ruta)}</code><span class="titulo">${e(v.titulo)}</span>`;
      return `<li class="${evento(v) ? 'evento' : ''}"><time>${fSeg(v.m)}</time>${texto}${repetida}${estancia}</li>`;
    }).join('');

    const evs = g.filter(evento);
    const p = pantalla(primera);
    const dur = duracionVisita(g);
    const sinTiempo = g.length === 1 && primera.segundos == null;
    const ficha = [
      ['Llegada', `${fDia(primera.m)} ${fSeg(primera.m)} (${DIAS_SEMANA[primera.m.sem]})`],
      ['Última acción', fSeg(ultima.m)],
      ['Duración', sinTiempo ? 'una sola página' : duracion(dur)],
      ['Páginas', `${nPaginas(g)}` + (lista.some(([, k]) => k > 1) ? ` (+${lista.reduce((a, [, k]) => a + k - 1, 0)} de recargas)` : '')],
      ['Clics y descargas', evs.length ? e(evs.map(textoEvento).join(', ')) : 'ninguno'],
      ['Procedencia', e(origen)],
      ['Enlace de procedencia', primera.referer ? `<code>${e(primera.referer)}</code>` : 'ninguno (directo, app o navegador que no lo envía)'],
      ['Tipo de procedencia', tipo === 'interno' ? 'la primera página no se registró' : ESQUEMAS[primera.esquema] || 'sin procedencia'],
      ['País / región', pais(primera.ubicacion)],
      ['Idioma del sitio', [...new Set(g.filter((v) => !evento(v)).map((v) => idioma(v.ruta)))].sort().join(', ') || '-'],
      ['Navegador', e(primera.navegador || 'desconocido')],
      ['Sistema', e(textoSistema(primera))],
      ['Dispositivo', dispositivo(primera)],
      ['Pantalla', textoPantalla(primera)],
    ];
    if (p && p[1] && p[2]) ficha.push(['Resolución real', `${Math.round(p[0] * p[2])}×${Math.round(p[1] * p[2])} px`]);
    if (primera.red) ficha.push(['Red', e(primera.red) + (primera.servidores ? ' (de servidores: VPN o robot)' : '')]);
    if (primera.ua) ficha.push(['User-Agent', `<code>${e(primera.ua)}</code>`]);
    ficha.push(['Sesión', `<code>${e(primera.sesion || 'sin sesión')}</code>`]);
    if (primera.origen === 'goatcounter') ficha.push(['Recogida', 'GoatCounter']);
    // Los cambios dentro de la misma visita (p. ej. girar el móvil) también se ven.
    for (const [campo, nombre, fmt] of [['pantalla', 'Otras pantallas', (x) => textoPantalla({ pantalla: x })],
      ['ubicacion', 'Otras ubicaciones', nombreLugar], ['navegador', 'Otros navegadores', String]]) {
      const otros = [...new Set(g.filter((v) => v[campo] && v[campo] !== primera[campo]).map((v) => fmt(v[campo])))].sort();
      if (otros.length) ficha.push([nombre, e(otros.join(', '))]);
    }

    const mismas = porHuella.get(huella(primera)).filter((x) => x !== g);
    let relacion = '';
    if (mismas.length) {
      const fechas = mismas.sort((a, b) => a[0].t - b[0].t).map((x) => `${dos(x[0].m.dia)}/${dos(x[0].m.mes)} ${fHora(x[0].m)}`).join(', ');
      relacion = `<p class="relacion">Mismo navegador, sistema, pantalla y país que las visitas del ${fechas}: probablemente la misma persona volviendo.</p>`;
    }
    const chips = [...new Set(evs.map((v) => evento(v)[0]))].map((t) => `<span class="chip cv">${e(EVENTOS[t] || t)}</span>`).join('');
    const html = `
      <article class="sesion">
        <header>
          <time>${fDia(primera.m)} ${fHora(primera.m)}</time>
          <span class="chip origen ${tipo}">${e(origen)}</span>
          <span class="chip">${pais(primera.ubicacion)}</span>
          <span class="chip">${dispositivo(primera)}</span>
          ${chips}
          ${mismas.length ? '<span class="chip">repite</span>' : ''}
          ${primera.servidores ? '<span class="chip origen otro">VPN o servidor</span>' : ''}
        </header>
        <ol>${filasHtml}</ol>
        <dl class="ficha">${ficha.map(([k, x]) => `<div><dt>${k}</dt><dd>${x}</dd></div>`).join('')}</dl>
        ${relacion}
      </article>`;
    const buscar = [origen, primera.referer, primera.ubicacion, nombreLugar(primera.ubicacion), primera.navegador,
      primera.sistema, dispositivo(primera), fDia(primera.m), ...g.map((v) => v.ruta), ...evs.map(textoEvento),
      html.replace(/<[^>]+>/g, ' ')].join(' ').toLowerCase();
    return { html, buscar };
  });

  const goat = filas.filter((v) => v.origen === 'goatcounter');
  const hastaGoat = goat.length ? fDia(goat[goat.length - 1].m) : '';
  const ahora = madrid(Date.now());
  const sub = `En directo: cargado el ${fDia(ahora)} a las ${fHora(ahora)} (hora de Madrid) · ${filas.length} registros`
    + (recargas ? ` · ${recargas} recarga${recargas > 1 ? 's' : ''} juntada${recargas > 1 ? 's' : ''}` : '')
    + ' · bots excluidos' + (rafagas ? ` (y ${rafagas} descargas de PDF en ráfaga)` : '')
    + (hastaGoat ? ` · hasta el ${hastaGoat}, de GoatCounter` : '');
  return { sub, resumen, tarjetas };
}

// --- Pintar ---

function aplicarMedidas(raiz) {
  // Con la CSP del panel no valen los style="" del HTML; sí los fijados desde JS.
  raiz.querySelectorAll('[data-ancho]').forEach((el) => { el.style.width = `${el.dataset.ancho}%`; });
  raiz.querySelectorAll('[data-alto]').forEach((el) => { el.style.height = `${el.dataset.alto}%`; });
}

function pintar({ sub, resumen, tarjetas }) {
  const main = document.getElementById('panel');
  main.innerHTML = `
<h1>Visitas del portafolio</h1>
<p class="sub">${e(sub)}</p>
${resumen}
<h2>Visita por visita</h2>
<input class="filtro" id="filtro" type="search" placeholder="Filtrar: linkedin, España, móvil, /blog, cv, 29/09/2026...">
<section class="sesiones" id="sesiones"></section>
<button class="mas" id="mas" type="button" hidden></button>
<p class="nota">Una visita es la actividad seguida del mismo navegador: misma IP y mismo User-Agent ese día, con menos de
${CORTE_MIN} min entre una acción y la siguiente. No se guardan la IP ni cookies, ni nada en el navegador: la sesión es un
resumen con una sal que cambia cada día, así que no se puede saber con certeza si dos visitas son de la misma persona;
"repite" sólo indica que coinciden navegador, sistema, pantalla y país. Dos vistas de la misma página con menos de
${RECARGA} s entre ellas cuentan como una (recarga). Las descargas de PDF se apuntan en el servidor, también si llegan
con el enlace directo. Lo recogido con GoatCounter no tiene el tiempo en la última página.</p>`;
  aplicarMedidas(main);

  const contenedor = document.getElementById('sesiones');
  const boton = document.getElementById('mas');
  let visibles = [];
  let pintadas = 0;
  const tanda = () => {
    const trozo = visibles.slice(pintadas, pintadas + POR_TANDA);
    contenedor.insertAdjacentHTML('beforeend', trozo.map((t) => t.html).join(''));
    pintadas += trozo.length;
    const quedan = visibles.length - pintadas;
    boton.hidden = quedan <= 0;
    boton.textContent = `Ver ${Math.min(quedan, POR_TANDA)} más (quedan ${quedan})`;
  };
  const filtrar = (q) => {
    visibles = q ? tarjetas.filter((t) => t.buscar.includes(q)) : tarjetas;
    pintadas = 0;
    contenedor.innerHTML = visibles.length ? '' : '<p class="vacio">Ninguna visita coincide.</p>';
    if (visibles.length) tanda();
  };
  boton.addEventListener('click', tanda);
  document.getElementById('filtro').addEventListener('input', (ev) => filtrar(ev.target.value.toLowerCase().trim()));
  filtrar('');
}

async function cargar() {
  const filas = [];
  let despues = 0;
  for (;;) {
    const r = await fetch(`datos?despues=${despues}`, { credentials: 'same-origin', redirect: 'error' });
    if (!r.ok) throw new Error(`el servidor respondió ${r.status}`);
    const { filas: lote, mas } = await r.json();
    filas.push(...lote);
    if (!mas || !lote.length) break;
    despues = lote[lote.length - 1].id;
  }
  return filas;
}

(async () => {
  try {
    const filas = await cargar();
    regiones = new Map(filas.filter((v) => v.region && v.ubicacion.includes('-')).map((v) => [v.ubicacion, v.region]));
    for (const v of filas) {
      v.t = Date.parse(v.momento);
      v.m = madrid(v.t);
      v.ubicacion = v.ubicacion || '';
      v.ruta = v.ruta || '';
      v.titulo = v.titulo || '';
    }
    filas.sort((a, b) => a.t - b.t);
    pintar(informe(filas));
  } catch (err) {
    document.querySelector('.sub').outerHTML = `<p class="aviso">No se pudieron cargar las visitas: ${e(err.message)}.
      Si llevas rato con la página abierta, recárgala: la sesión de Access puede haber caducado.</p>`;
  }
})();
