/**
 * Qué demo tiene cada proyecto.
 *
 * El vídeo y el GIF son convención: basta con dejar el fichero en
 * public/media/<id>.<ext> y aparece solo. Las dos demos interactivas son
 * componentes, así que sí van por id; están aquí para que la página del
 * proyecto y la tarjeta de la portada no lleven cada una su lista.
 */
const medios = import.meta.glob('/public/media/*', { eager: true });
const rutas = Object.keys(medios);

export const hayVideo = (id) => rutas.some((f) => f.endsWith(`/media/${id}.mp4`));

export const buscarGif = (id) =>
  rutas.find((f) => new RegExp(`/media/${id}\\.(gif|png|jpg|webp)$`).test(f));

export const DEMOS_INTERACTIVAS = ['ciber-asesoria', 'habla-con-tu-dinero', 'rutina-export'];

export const hayDemo = (id) =>
  hayVideo(id) || !!buscarGif(id) || DEMOS_INTERACTIVAS.includes(id);
