/**
 * Los datos del sitio, ya resueltos al idioma que toque.
 *
 * El español es el original: proyectos.json y certificaciones.json siguen
 * siendo la fuente única. El inglés vive en los ficheros `.en.json`, que sólo
 * llevan los campos de texto y van indexados por `id`; lo que no esté traducido
 * se queda en español en vez de desaparecer.
 */
import datos from '../../proyectos.json';
import proyectosEn from '../../proyectos.en.json';
import certificacionesEs from '../../certificaciones.json';
import certificacionesEn from '../../certificaciones.en.json';

const fusionar = (original, traduccion) => (traduccion ? { ...original, ...traduccion } : original);

export const perfil = (idioma) =>
  fusionar(datos.perfil, idioma === 'en' ? proyectosEn.perfil : null);

export const proyectos = (idioma) =>
  datos.proyectos.map((p) => fusionar(p, idioma === 'en' ? proyectosEn.proyectos[p.id] : null));

/** Fuera los ocultos y los marcados "NO PUBLICAR" en `pendiente`. */
export const publicables = (idioma) =>
  proyectos(idioma).filter(
    (p) => !p.oculto && !(p.pendiente || []).some((x) => x.startsWith('NO PUBLICAR')),
  );

export const certificaciones = (idioma) =>
  certificacionesEs.certificaciones.map((c) =>
    fusionar(c, idioma === 'en' ? certificacionesEn.certificaciones[c.id] : null),
  );
