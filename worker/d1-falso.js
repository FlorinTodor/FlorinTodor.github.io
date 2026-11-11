// D1 de mentira sobre node:sqlite, para las pruebas: la misma API que usa el
// Worker (prepare().bind().run()/first()/all()) y el mismo esquema (migrations/).
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function d1Falso() {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'));
  // node:sqlite no sabe de "?1, ?2" con valores por posición, como D1: se
  // pasan a "?" con los valores en el orden en que aparecen.
  const traducir = (sql, valores) => {
    const orden = [];
    const plano = sql.replace(/\?(\d+)/g, (_, n) => { orden.push(valores[n - 1]); return '?'; });
    return [db.prepare(plano), orden];
  };
  const sentencia = (sql, valores = []) => ({
    bind: (...v) => sentencia(sql, v),
    run: async () => { const [s, v] = traducir(sql, valores); return s.run(...v); },
    first: async () => { const [s, v] = traducir(sql, valores); return s.get(...v) ?? null; },
    all: async () => { const [s, v] = traducir(sql, valores); return { results: s.all(...v) }; },
  });
  return { prepare: (sql) => sentencia(sql), sqlite: db };
}
