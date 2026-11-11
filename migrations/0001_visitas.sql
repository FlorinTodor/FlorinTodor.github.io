-- Visitas del portafolio: una fila por página vista o por clic/descarga.
--
-- Las columnas siguen la exportación de GoatCounter (Path, Title, Event,
-- Referrer, Referrer scheme, Screen size, Location...) para que el panel lea
-- igual lo importado de allí y lo que se recoge aquí.
CREATE TABLE visitas (
  id        INTEGER PRIMARY KEY,
  momento   TEXT    NOT NULL,             -- ISO 8601 en UTC
  host      TEXT    NOT NULL,             -- florintodor.dev (las pruebas en workers.dev no salen en el panel)
  sesion    TEXT    NOT NULL,             -- resumen de IP + navegador con la sal del día: la IP no se guarda
  vista     TEXT,                         -- id al azar de la página vista, para apuntarle el tiempo al salir
  ruta      TEXT    NOT NULL,             -- "/proyectos/x", o en un evento "cv: /proyectos/x"
  titulo    TEXT    NOT NULL DEFAULT '',  -- título de la página, o el enlace del evento
  evento    INTEGER NOT NULL DEFAULT 0,
  referer   TEXT    NOT NULL DEFAULT '',  -- sin esquema: "www.linkedin.com", "t.co"; o la campaña
  esquema   TEXT    NOT NULL DEFAULT '',  -- h enlace, g app, c campaña, o otro (como GoatCounter)
  navegador TEXT    NOT NULL DEFAULT '',
  sistema   TEXT    NOT NULL DEFAULT '',
  ua        TEXT    NOT NULL DEFAULT '',
  pantalla  TEXT    NOT NULL DEFAULT '',  -- "ancho,alto,densidad"
  ubicacion TEXT    NOT NULL DEFAULT '',  -- "ES" o "ES-MD"
  region    TEXT    NOT NULL DEFAULT '',  -- nombre de la región, si Cloudflare lo da
  segundos  INTEGER,                      -- tiempo con la página a la vista; NULL si no llegó
  bot       INTEGER NOT NULL DEFAULT 0,
  origen    TEXT    NOT NULL              -- navegador | servidor | goatcounter
);

CREATE INDEX visitas_vista ON visitas (vista);
CREATE INDEX visitas_sesion ON visitas (sesion, momento);

-- Una sal al azar por día (hora de Madrid). La de días anteriores se borra, así
-- que nadie, tampoco el dueño, puede rehacer el resumen de una IP pasada.
CREATE TABLE sales (
  dia   TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
