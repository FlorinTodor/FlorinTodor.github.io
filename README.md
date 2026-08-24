# Portafolio — Florin Emanuel Todor Gliga

Sitio estático hecho con [Astro](https://astro.build), publicado en GitHub Pages.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run preview  # sirve dist/ para comprobarlo antes de publicar
```

## Publicar

1. Crea un repo **público** (por ejemplo `portafolio`).
2. Sube este directorio a la rama `main`.
3. **Settings → Pages → Source = GitHub Actions**.
4. Cada `push` a `main` despliega solo (`.github/workflows/deploy.yml`).

El repo del portafolio es público, pero **no contiene el código de los proyectos
privados** — sólo sus resúmenes, capturas y vídeos.

## Dominio propio

Para no usar `florintodor.github.io`:

1. Compra el dominio (Namecheap, Porkbun, IONOS, Dinahosting… ~10–15 €/año para `.es`/`.dev`).
2. Crea el fichero `public/CNAME` con **una sola línea**: tu dominio sin `https://`
   y sin barra final. Ejemplo:
   ```
   florintodor.es
   ```
3. En el panel DNS del registrador, añade:

   | Tipo  | Nombre | Valor |
   |-------|--------|-------|
   | A     | `@`    | `185.199.108.153` |
   | A     | `@`    | `185.199.109.153` |
   | A     | `@`    | `185.199.110.153` |
   | A     | `@`    | `185.199.111.153` |
   | CNAME | `www`  | `florintodor.github.io.` |

4. En **Settings → Pages → Custom domain** escribe el dominio y espera a que
   verifique. Marca **Enforce HTTPS** cuando se active (puede tardar hasta 24 h).
5. Cambia `site:` en `astro.config.mjs` a `https://tudominio.es`.

Si el dominio es de tipo `usuario.github.io` no hace falta `base`; con un repo
llamado de otra forma **y sin dominio propio**, añade `base: '/nombre-del-repo'`
en `astro.config.mjs`. Con dominio propio, `base` sobra.

## Estructura

```
proyectos.json              ← única fuente de datos: perfil y proyectos
src/
  layouts/Base.astro        ← cabecera flotante + barra lateral fija + pie
  pages/
    index.astro             ← portada de una sola página con secciones numeradas
    proyectos/[id].astro    ← una página por proyecto
  components/
    DemoGrafo.astro         ← explorador del grafo normativo (TFG)
    DemoBanca.astro         ← reproductor de sesión del asistente bancario
  styles/global.css         ← paleta y estilos
public/
  media/<id>.mp4            ← vídeo de cada proyecto (se detecta solo)
  img/florin-emanuel-todor-gliga.jpg  ← retrato
  img/cv-preview-1.png      ← primera página del CV
  CV_Florin_Emanuel_Todor_Gliga.pdf   ← CV descargable
  img/og.jpg                ← tarjeta que se ve al compartir (la genera el script)
  demo/*.json               ← datos de las demos interactivas
src/utilidades/videos.js    ← lee duración y tamaño del propio MP4 al compilar
scripts/generar-og.py       ← redibuja public/img/og.jpg
scripts/generar-video-irrgarten.py  ← rehace la demo de Irrgarten
```

Los vídeos no piden mantenimiento: basta con dejar `public/media/<id>.mp4` y su
`poster/<id>.jpg`. La duración y el tamaño del `VideoObject` se leen del fichero
al compilar, y la fecha de publicación sale del commit que lo tocó — por eso el
workflow hace `checkout` con `fetch-depth: 0`, para tener historial.

## El nombre

El nombre oficial es **Florin Emanuel Todor Gliga**, sin tilde: así aparece en el
`<title>`, en el `<h1>` de la portada, en el pie, en el CV y en los datos
estructurados. La grafía castellanizada «Florín» y las formas cortas («Florin
Todor») van declaradas como `alternateName` en el `Person` de `Base.astro` y en
la descripción de la portada, para que los buscadores las traten como la misma
persona en vez de repartir señales entre dos nombres. Si cambias el nombre en
algún sitio, cámbialo en todos.

## Añadir o editar un proyecto

Todo sale de `proyectos.json`:

| Campo | Para qué sirve |
|---|---|
| `id` | URL (`/proyectos/<id>/`) y nombre del vídeo (`public/media/<id>.mp4`). |
| `destacado` | `true` lo sube al bloque de destacados. |
| `privado` | Muestra «Código privado» y oculta el enlace al repo. |
| `titulo`, `resumen` | Cabecera y texto de la tarjeta. |
| `destacados[]` | Lista de «Qué hace». |
| `stack[]`, `categorias[]` | Etiquetas. |
| `autoria` | Opcional. En trabajos compartidos, deja clara tu parte. |
| `pendiente[]` | Notas privadas. **No se publican.** Si una empieza por `NO PUBLICAR`, el proyecto se excluye del sitio automáticamente. |

## Vídeos

Guarda cada uno como `public/media/<id>.mp4`. La tarjeta y la página del proyecto
lo detectan solos y sustituyen el hueco de «Pendiente de grabar».

```bash
# comprimir antes de subir (el repo de Pages tiene un límite de 1 GB)
ffmpeg -i original.mp4 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 30 -an salida.mp4
```

Un `.mp4` sin audio pesa mucho menos que un `.gif` equivalente.

## Las dos demos interactivas

**Grafo normativo** (`ciber-asesoria`). Datos reales exportados del grafo del TFG:
11 artículos de NIS2 y 68 de DORA enlazados con 70 controles del ENS. Los textos
normativos provienen del BOE y el DOUE, de dominio público.

**Asistente bancario** (`habla-con-tu-dinero`). Reproduce una conversación grabada,
porque Pages no puede ejecutar el backend. El esquema SQL, las herramientas y las
cifras son reales (la base ficticia se genera con semilla fija). Para sustituirlo
por transcripciones reales, edita `public/demo/sesion-banca.json`.

## Nunca metas claves aquí

Todo lo que hay en este repo se publica. No pongas `GROQ_API_KEY` ni ninguna otra
credencial en el código del sitio ni en los JSON de demo.
