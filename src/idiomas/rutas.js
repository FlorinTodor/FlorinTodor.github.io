/**
 * Rutas por idioma.
 *
 * El español vive en la raíz y el inglés cuelga de /en/. Se eligió así para no
 * mover ninguna URL ya indexada: /proyectos/granja-web/ sigue donde estaba y su
 * gemela inglesa es /en/proyectos/granja-web/.
 */
const base = import.meta.env.BASE_URL;

/** Enlace a una página del sitio en el idioma dado. `camino` no lleva barra inicial. */
export const enlace = (idioma, camino = '') =>
  `${base}${idioma === 'en' ? 'en/' : ''}${camino}`;

/** Enlace a un recurso que no se traduce: PDF, imagen, RSS del idioma... */
export const recurso = (camino = '') => `${base}${camino}`;

/** El idioma contrario, que es a donde apunta el selector. */
export const OTRO = { es: 'en', en: 'es' };

/**
 * La misma página en el otro idioma. Como las dos jerarquías son idénticas
 * salvo el prefijo, basta con quitarlo o ponerlo.
 */
export const equivalente = (idioma, pathname) => {
  const resto = pathname.slice(base.length).replace(/^en\//, '');
  return enlace(OTRO[idioma], resto);
};
