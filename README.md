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
certificaciones.json        ← datos de las certificaciones
src/
  layouts/Base.astro        ← cabecera flotante + barra lateral fija + pie
  pages/
    index.astro             ← portada de una sola página con secciones numeradas
    proyectos/[id].astro    ← una página por proyecto
    certificaciones/        ← rejilla de certificaciones con filtro por área
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
  favicon.ico               ← se queda en la raíz: Google y los navegadores
                              piden /favicon.ico sin preguntar
  icon/                     ← el resto de iconos y el manifiesto, que sí van
                              declarados con <link> y pueden vivir aquí
  CNAME, robots.txt         ← atados a la raíz por el protocolo
  demo/*.json               ← datos de las demos interactivas
  docs/*.pdf                ← documentos largos (la memoria del TFG)
  certificaciones/<id>.pdf  ← el certificado (y <id>.jpg o .png, su portada)
originales/                 ← material en bruto, fuera de git: vídeos y PDF sin
                              procesar, la memoria del TFG y los certificados
                              que muestran DNI o NIE
src/utilidades/videos.js    ← lee duración y tamaño del propio MP4 al compilar
scripts/generar-og.py       ← redibuja public/img/og.jpg
scripts/generar-video-irrgarten.py  ← rehace la demo de Irrgarten
scripts/generar-miniaturas-certificaciones.py  ← miniatura de cada PDF
scripts/tapar-datos-personales.py   ← tapa el DNI/NIE de los certificados
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
| `memoria` | Opcional. Ruta dentro de `public/` a un documento largo; añade el panel «Memoria» y lo declara como `Thesis`. |

## Añadir una certificación

1. Copia el diploma en **`public/certificaciones/`** con el `id` como nombre:
   `public/certificaciones/pcap-cisco.pdf`. Vale PDF, JPG, PNG o WEBP.
2. Genera la miniatura (sólo si has subido un PDF):

   ```bash
   python3 scripts/generar-miniaturas-certificaciones.py
   ```

   Renderiza la primera página en `<id>.jpg`. No pisa las que ya existan, así que
   se puede lanzar tantas veces como haga falta. Necesita `poppler-utils`.
   Si prefieres hacerlo a mano, deja tú el `<id>.jpg` y listo.
3. Añade la entrada en `certificaciones.json`:

   | Campo | Para qué sirve |
   |---|---|
   | `id` | Enlaza con los ficheros (`public/certificaciones/<id>.pdf` y `.jpg`). |
   | `titulo`, `entidad` | Nombre del curso y quién lo expide. |
   | `fecha` | `2021` o `2021-06`. Ordena la rejilla, de lo más reciente a lo más antiguo. |
   | `categoria` | Agrupa los filtros de arriba. Reutiliza las que ya haya. |
   | `detalle` | Opcional. Una línea de qué cubre. |
   | `credencial` | Opcional. URL de verificación del emisor. |
   | `destacada` | `true` la coloca la primera. |
   | `archivo`, `imagen` | Sólo si los ficheros no se llaman como el `id`. |

La tarjeta funciona sin fichero: mientras no lo subas se muestra como «Documento
pendiente de subir». Si sólo tienes el enlace de verificación y no el PDF, la
tarjeta apunta a ese enlace.

### Cuidado con el DNI

Este repo es público: **todo lo que entre en `public/` acaba en internet**. Varios
diplomas llevan el documento de identidad impreso, y algunos enlaces de
verificación lo enseñan también. Comprueba cada PDF antes de moverlo ahí:

```bash
pdftotext certificado.pdf - | grep -inE '[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]'
```

El original se queda en `originales/certificaciones-con-datos-personales/`, fuera
de git, y lo que se publica es una copia con el dato tapado:

```bash
python3 scripts/tapar-datos-personales.py
```

**Un recuadro negro encima de un PDF no tapa nada**: el texto sigue debajo y sale
con `pdftotext` o seleccionándolo. El script lo hace bien — localiza el dato por
sus coordenadas, rasteriza la página, pinta sobre los píxeles y vuelve a montar
el PDF, que ya no tiene capa de texto. Tapa también los códigos de verificación
y los **QR**, porque llevan al original en la sede electrónica, donde el dato
vuelve a estar a la vista.

Hoy pasan por ahí tres documentos:

| Documento | Qué se tapa |
|---|---|
| `Certificado_ingles_b1.pdf` | DNI, QR y el enlace de verificación con clave (ese enlace enseña el DNI a quien lo abra). |
| `Certificado_machine_learning_MOOC.pdf` | NIE, QR y el código seguro de verificación (CSV) de la sede de la UGR. |
| `Certificado_Software_libre_MOOC.pdf` | Ídem. |

Cuando un documento va tapado, dilo en el campo `nota` de su ficha: sale en
letra pequeña bajo la descripción, para que quien vea la mancha sepa qué es.

La memoria del TFG lleva el DNI en la hoja de autorización de depósito. La copia
publicada (`public/docs/memoria-tfg-ciber-asesoria.pdf`) es la misma sin esa hoja:
145 páginas en vez de 146. El original completo está en `originales/`.

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
