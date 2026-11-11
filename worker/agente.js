// Navegador, sistema y bots a partir del User-Agent y de las pistas del
// navegador (User-Agent Client Hints), que en Chrome dicen la versión real de
// Windows y Android: el User-Agent la congela en "Windows 10" y "Android 10".

// "Cubot" es una marca de móviles, no un bot.
const BOT = /(?<!cu)bot\b|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|gtmetrix|uptime|curl\/|wget|python|httpx|go-http|java\/|okhttp|axios|node-fetch|undici/i;
// Los que sacan la vista previa de un enlace no ejecutan JavaScript, así que
// sólo llegan al servidor (las descargas de PDF). En el navegador no se miran:
// el navegador de una app puede llevar su nombre en el User-Agent.
const PREVISUALIZADOR = /facebookexternalhit|embedly|whatsapp|telegram|discord|skype|vkshare|pinterest|preview|monitor/i;

export function esBot(ua, { servidor = false } = {}) {
  return !ua || BOT.test(ua) || (servidor && PREVISUALIZADOR.test(ua));
}

// En orden: las apps y los navegadores basados en Chrome antes que Chrome, y
// Chrome antes que Safari (todos dicen "Safari").
const NAVEGADORES = [
  [/LinkedInApp/, 'LinkedIn (app)'],
  [/Instagram/, 'Instagram (app)'],
  [/FBAN|FBAV|FB_IAB/, 'Facebook (app)'],
  [/\bGSA\/\d/, 'Google (app)'],
  [/EdgA?\/(\d+)|EdgiOS\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)|OPiOS\/(\d+)/, 'Opera'],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
  [/YaBrowser\/(\d+)/, 'Yandex'],
  [/Firefox\/(\d+)|FxiOS\/(\d+)/, 'Firefox'],
  [/CriOS\/(\d+)/, 'Chrome'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Version\/(\d+(?:\.\d+)?).*Safari/, 'Safari'],
];

export function navegador(ua, { brave = false } = {}) {
  for (const [re, nombre] of NAVEGADORES) {
    const m = ua.match(re);
    if (!m) continue;
    const version = m.slice(1).find(Boolean);
    // Brave dice ser Chrome; sólo se delata con navigator.brave.
    const final = brave && nombre === 'Chrome' ? 'Brave' : nombre;
    return version ? `${final} ${version}` : final;
  }
  return '';
}

const WINDOWS = { '10.0': 'Windows 10', '6.3': 'Windows 8.1', '6.2': 'Windows 8', '6.1': 'Windows 7' };

export function sistema(ua, pistas) {
  const mayor = parseInt(pistas?.version, 10);
  if (pistas?.plataforma && !Number.isNaN(mayor)) {
    switch (pistas.plataforma) {
      // https://learn.microsoft.com/microsoft-edge/web-platform/how-to-detect-win11
      case 'Windows': return mayor >= 13 ? 'Windows 11' : mayor > 0 ? 'Windows 10' : 'Windows 7/8';
      case 'Android': return `Android ${mayor}`;
      case 'macOS': return `macOS ${pistas.version.split('.').slice(0, 2).join('.')}`;
      case 'Chrome OS': return 'ChromeOS';
      case 'Linux': return 'Linux';
    }
  }
  let m;
  if ((m = ua.match(/Windows NT (\d+\.\d+)/))) return WINDOWS[m[1]] || 'Windows';
  if ((m = ua.match(/(?:iPhone|iPad|iPod|CPU) OS (\d+)_(\d+)/))) return `iOS ${m[1]}.${m[2]}`;
  if ((m = ua.match(/Android (\d+)/))) {
    // Chrome recortado: siempre "Android 10; K". Sin pistas no se sabe la real.
    if (m[1] === '10' && /Android 10; K\)/.test(ua)) return 'Android (Chrome no dice la versión real)';
    return `Android ${m[1]}`;
  }
  if ((m = ua.match(/Mac OS X (\d+)[_.](\d+)/))) return `macOS ${m[1]}.${m[2]}`;
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return '';
}
