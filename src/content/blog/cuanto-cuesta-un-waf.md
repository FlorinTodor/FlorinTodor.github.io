---
titulo: "Cuánto cuesta poner ModSecurity delante de una aplicación"
tituloSeo: "Cuánto cuesta un WAF con ModSecurity, medido"
descripcion: "Medí el rendimiento de una aplicación con y sin WAF (ModSecurity y OWASP CRS) en cuatro escenarios. Qué parte del coste es el WAF, qué parte es la configuración y qué pasa con un falso positivo en paranoia 4."
fecha: 2026-09-23
etiquetas: ["ModSecurity", "OWASP CRS", "Nginx", "Rendimiento", "Ciberseguridad"]
minutos: 7
---

En la asignatura de Servidores Web de Altas Prestaciones monté un WAF: Nginx con
ModSecurity y el OWASP Core Rule Set, delante de OWASP Juice Shop, que es una tienda
hecha vulnerable a propósito. En la ficha del proyecto puse que el WAF bajaba el
rendimiento de 2.586 a 1.663 peticiones por segundo, un 36 % menos.

Esa cifra tiene un problema. Mezcla tres cosas: el coste de meter un proxy en medio, el
coste de ModSecurity y el coste de cómo lo dejé configurado. Así que lo he vuelto a
medir separando cada parte.

## El montaje

Todo corre en local con Docker, en un portátil con un Ryzen 9 5900HX:

```text
ab  →  Nginx 1.25.5 + ModSecurity 3.0.12 + CRS 3.3.5  →  Juice Shop 20.2.0
```

Mirando el historial del repositorio encontré algo que no recordaba. El primer commit
tenía el CRS en paranoia 1 y el log de auditoría en `RelevantOnly`, que sólo guarda las
peticiones sospechosas. Tres horas después, mientras hacía pruebas, lo cambié a esto:

```apache
setvar:tx.paranoia_level=4
SecAuditEngine On # <--- CAMBIO: Forzar logging de TODO
SecDebugLogLevel 3
```

Paranoia 4 es el nivel más estricto del CRS. `SecAuditEngine On` guarda en disco cada
petición y cada respuesta. Lo puse para ver qué pasaba y así se quedó en el repositorio.
Lo más probable es que la medición de la ficha se hiciera con esta configuración.

Para esta prueba he medido cuatro escenarios:

| | Escenario |
|---|---|
| a | Juice Shop directo, sin nada delante |
| b | Nginx haciendo de proxy, con `modsecurity off` |
| c | El WAF tal como está en el repositorio (paranoia 4, auditoría de todo) |
| d | El WAF en paranoia 1 y auditoría `RelevantOnly` |

Cada escenario son 5.000 peticiones con 10 de concurrencia, tres rondas alternando los
escenarios y un calentamiento de 500 peticiones antes de cada medida.

## Primero, que bloquee

Antes de medir cuánto cuesta hay que comprobar que hace algo. Estos son los códigos que
devuelve el WAF a varios ataques, con las reglas del CRS que saltan en cada nivel:

| Petición | Directo | WAF | Reglas en paranoia 1 |
|---|---|---|---|
| `q=apple'))--` (SQLi) | 200 | 403 | 942100 |
| `q=' OR 1=1--` (SQLi) | 500 | 403 | 942100 |
| `q=<script>alert(1)</script>` | 200 | 403 | 941100, 941110, 941160 |
| `q=<iframe src="javascript:...">` | 200 | 403 | 941100, 941140, 941160, 941170, 941210 |
| `q=../../../etc/passwd` | 200 | 403 | 930100, 930110, 930120, 932160 |
| `q=a;cat /etc/passwd` | 200 | 403 | 930120, 932100, 932160 |

El 500 de la segunda fila lo devuelve Juice Shop, que se rompe con la comilla. En
paranoia 4 saltan bastantes reglas más en cada ataque, pero el resultado es el mismo:
todos acaban en 403. Con esta aplicación, paranoia 1 ya para todo lo que he probado.

## La primera medición no enseñaba nada

Empecé midiendo contra el buscador de productos, `/rest/products/search?q=apple`:

```console
$ ab -n 5000 -c 10 'http://127.0.0.1:3001/rest/products/search?q=apple'
Complete requests:      5000
Failed requests:        0
Requests per second:    113.82 [#/sec] (mean)
Time per request:       87.855 [ms] (mean)
```

Unas 100 peticiones por segundo sin nada delante. Con el WAF, lo mismo:

| Escenario | Rondas (req/s) | Mediana |
|---|---|---|
| a. Directo | 91,7 · 113,8 · 105,7 | 106 |
| b. Proxy | 101,8 · 113,2 · 113,2 | 113 |
| c. Repo (PL4) | 101,4 · 100,6 · 82,9 | 101 |
| d. PL1 | 99,0 · 102,4 · 93,0 | 99 |

El proxy sale por encima del directo, así que las diferencias son ruido. Juice Shop tarda
unos 90 ms en resolver esa búsqueda y el WAF añade uno o dos, que se pierden ahí. Para ver
lo que cuesta el WAF hacía falta un backend que contestara rápido.

## Contra un fichero estático

Repetí las tres rondas contra `/assets/public/favicon_js.ico`, un icono de 15 KB que Juice
Shop sirve sin tocar la base de datos:

```console
$ ab -n 5000 -c 10 -H 'Host: localhost' 'http://127.0.0.1:8080/assets/public/favicon_js.ico'
```

| Escenario | Rondas (req/s) | Mediana | ms por petición |
|---|---|---|---|
| a. Directo | 3.145 · 3.366 · 3.899 | 3.366 | 2,97 |
| b. Proxy | 2.485 · 3.388 · 3.660 | 3.388 | 2,95 |
| c. Repo (PL4) | 1.875 · 2.480 · 2.482 | 2.480 | 4,03 |
| d. PL1 | 2.794 · 2.775 · 2.791 | 2.791 | 3,58 |

La primera ronda sale más baja en casi todos. Lo tomo como calentamiento del sistema y me
quedo con la mediana.

Nginx como proxy no cuesta nada que se pueda medir aquí. El WAF tal como lo dejé baja de
3.388 a 2.480 peticiones por segundo, un 27 % menos, y añade 1,1 ms a cada petición. En
paranoia 1 y auditando sólo lo sospechoso, la bajada se queda en un 18 % y 0,6 ms.

El escenario d cambia dos cosas a la vez, el nivel de paranoia y la auditoría, así que con
estos datos no puedo repartir la diferencia entre las dos. Lo que sí sé es que el log de
debug no ha influido: `debug.log` se ha quedado vacío en todas las pruebas, a pesar del
nivel 3.

## El log de auditoría

Con `SecAuditEngine On` cada petición se escribe entera en `audit.log`. Después de cada
tanda de 5.000 peticiones:

| Ruta | Tamaño del log | Por petición |
|---|---|---|
| Búsqueda | 7,6 MB | 1,5 KB |
| Icono | 4,4 MB | 884 B |

En ninguno de los dos casos se guarda el cuerpo de la respuesta, porque la configuración
sólo lo hace con HTML, XML y texto plano. La búsqueda ocupa más porque cada entrada lleva
además un aviso de una regla, que explico abajo.

Al ritmo que aguanta el WAF con el icono son unos 2 MB por segundo, cerca de 900 MB por
cada millón de peticiones. En producción habría que rotar ese fichero o dejar la auditoría
en `RelevantOnly`.

Aquí me llevé una sorpresa. En la primera tanda, el escenario d también escribió 7,6 MB,
como si auditara todo. El motivo:

```text
[id "920350"] [msg "Host header is a numeric IP address"] [data "127.0.0.1:8080"]
```

Le estaba pegando a `127.0.0.1`, y el CRS marca como sospechosa cualquier petición cuyo
`Host` sea una IP. No la bloquea, porque sólo suma 3 puntos de los 5 que hacen falta,
pero `RelevantOnly` la guarda. Por eso en la tanda del icono mandé `Host: localhost` en
los cuatro escenarios. Con eso el log de d se quedó a cero. Un navegador manda el nombre
del dominio, así que en uso normal esto no pasaría.

## Un falso positivo en paranoia 4

Probando peticiones normales apareció esto:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:8080/rest/products/search?q=apple%20juice'
403
```

Buscar «apple juice» en una tienda de zumos devuelve 403. La regla es la 920273:

```text
[id "920273"] [msg "Invalid character in request (outside of very strict set)"]
Inbound Anomaly Score Exceeded (Total Score: 5)
```

En paranoia 4 el CRS sólo acepta un juego de caracteres muy reducido, y el espacio no
entra. En paranoia 1 la misma búsqueda devuelve 200. Es el tipo de regla que en paranoia
4 obliga a escribir exclusiones para cada campo de texto libre de la aplicación.

## Lo que saco de esto

La cifra de la ficha mezclaba el WAF con una configuración de pruebas. Con la
configuración por defecto el coste baja bastante, y ya bloquea los ataques que he probado.

Para medir el coste de un WAF conviene un backend rápido, porque con uno lento se pierde
en el ruido. Eso también quiere decir que, con un backend de 90 ms por petición, el usuario
no va a notar 1 ms más.

Y paranoia 4 tiene un precio que no sale en `ab`. Bloquea búsquedas legítimas y hay que
mantener una lista de exclusiones. Para una aplicación como esta me quedaría en paranoia
1 y subiría de nivel sólo en las rutas que lo justifiquen.

---

*El proyecto está en [WAF con ModSecurity y OWASP CRS sobre
Docker](/proyectos/waf-modsecurity/). La medición original de la ficha (2.586 → 1.663
req/s) no guardé contra qué ruta ni con qué parámetros se hizo, así que sus números no se
pueden comparar directamente con los de aquí.*
