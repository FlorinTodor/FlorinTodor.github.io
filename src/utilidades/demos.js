/**
 * Qué demo tiene cada proyecto.
 *
 * El vídeo y el GIF son convención: basta con dejar el fichero en
 * public/media/<id>.<ext> y aparece solo. Las dos demos interactivas son
 * componentes, así que sí van por id; están aquí para que la página del
 * proyecto y la tarjeta de la portada no lleven cada una su lista.
 */
import { ficherosPublicos } from './publicos.js';

const rutas = ficherosPublicos('media');

export const hayVideo = (id) => rutas.some((f) => f.endsWith(`/media/${id}.mp4`));

export const buscarGif = (id) =>
  rutas.find((f) => new RegExp(`/media/${id}\\.(gif|png|jpg|webp)$`).test(f));

export const DEMOS_INTERACTIVAS = ['ciber-asesoria', 'habla-con-tu-dinero', 'rutina-export'];

/**
 * Cartel para la tarjeta de una demo que no es un vídeo.
 *
 * Los vídeos ya traen el suyo (media/poster/<id>.jpg, que es un fotograma) y
 * los interactivos se quedaban sin miniatura: la tarjeta salía vacía al lado
 * del texto. El cartel de estos es una foto de la propia demo, y como en ella
 * hay texto en pantalla, tiene gemela inglesa igual que las tarjetas de
 * compartir: <id>.jpg y <id>-en.jpg.
 */
const rutasCartel = ficherosPublicos('media/poster');

export const buscarCartel = (id, idioma = 'es') => {
  const nombre = idioma === 'en' && rutasCartel.includes(`/public/media/poster/${id}-en.jpg`)
    ? `${id}-en`
    : id;
  const ruta = `/public/media/poster/${nombre}.jpg`;
  return rutasCartel.includes(ruta) ? ruta.replace('/public/', '') : null;
};

export const hayDemo = (id) =>
  hayVideo(id) || !!buscarGif(id) || DEMOS_INTERACTIVAS.includes(id);
