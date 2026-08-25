# Instrucciones para Claude Code

## El sitio es bilingüe: nada se publica en un solo idioma

El español es el original y vive en la raíz; el inglés cuelga de `/en/`.

**Cualquier cambio que toque texto visible tiene que llevar su versión inglesa en
el mismo commit.** No vale dejarlo "para luego": el sitio se cae al español
cuando falta una traducción, así que compila y se despliega igual y el hueco pasa
inadvertido durante meses.

Vale tanto si el encargo llega en español como si llega en inglés: se hace en los
dos. No hay que preguntar si además hay que traducirlo.

Dónde va cada cosa:

| Si tocas… | Traduce también en… |
|---|---|
| Texto de la interfaz (botones, títulos de sección, avisos, menú) | `src/idiomas/textos.js`, el bloque `en` |
| Un proyecto de `proyectos.json` | `proyectos.en.json`, misma clave `id` |
| Una certificación de `certificaciones.json` | `certificaciones.en.json`, misma clave `id` |
| Un artículo de `src/content/blog/` | `src/content/blog/en/<mismo-nombre>.md`, **mismo slug** |
| El guion de la demo bancaria | `public/demo/sesion-banca.en.json` |
| Formación o competencias | Están enteras en `textos.js`: hay que tocar `es` y `en` |
| Las tarjetas de compartir | `python3 scripts/generar-og.py` (saca las dos tandas) |

Antes de dar por terminado un cambio:

```bash
node scripts/comprobar-traducciones.mjs   # falla si falta algo
npm run build
```

### Lo que no se traduce, a propósito

- **`public/demo/grafo-normativo.json`.** Son artículos del ENS, NIS2 y DORA en su
  redacción oficial. Traducirlos a mano sería inventarse terminología legal.
- **El CV y la memoria del TFG.** Están en español y sólo existe el PDF. El botón
  inglés lo dice: «Download CV (Spanish)».
- **Los vídeos de las demos.** Están grabados en español; la nota de la portada lo
  advierte en la versión inglesa.

Si aparece algo nuevo que entre en esta lista, dilo en la página en vez de
traducirlo a medias.

## Nada de guiones largos

En el texto del sitio no se usa la raya (`—`). Separadores y incisos van con
guion simple (`-`) o entre paréntesis. Los rangos numéricos (`2021 – 2026`,
`1–10`) sí llevan guion medio, que es lo correcto.

Cuidado con las tarjetas de Open Graph: el texto va **dibujado dentro del JPG**,
así que un cambio en `proyectos.json` no llega a la imagen hasta que se ejecuta
`scripts/generar-og.py`.

## El resto

`README.md` documenta la estructura, cómo añadir un proyecto o una certificación,
y el cuidado con los datos personales en los PDF (este repo es público).
