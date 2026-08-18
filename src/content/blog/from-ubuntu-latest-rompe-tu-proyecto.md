---
titulo: "«FROM ubuntu:latest» te va a romper el proyecto (y no será hoy)"
descripcion: "Una granja web que funcionaba perfectamente en 2025 devolvía 502 en la mitad de las peticiones en 2026. El código no había cambiado ni una línea. Así se diagnostica y así se evita."
fecha: 2026-08-18
etiquetas: ["Docker", "Nginx", "PHP", "Reproducibilidad", "DevOps"]
minutos: 6
---

Hace unos días volví a levantar una práctica que hice para la asignatura de Servidores
Web de Altas Prestaciones: una granja de ocho servidores web —cuatro Apache y cuatro
Nginx— detrás de un balanceador. En su día funcionaba. La entregué, funcionaba, y ahí
se quedó.

Un año después la levanté otra vez, sin tocar una sola línea, y **la mitad de las
peticiones devolvían 502 Bad Gateway**.

## El síntoma

Lo primero fue mirar cómo repartía el balanceador. Cuarenta peticiones:

```console
$ for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code}\n' localhost:80; done | sort | uniq -c
     20 200
     20 502
```

Exactamente la mitad. Un 50 % clavado no es casualidad: si fuera saturación o un fallo
intermitente, los números bailarían. Un reparto tan limpio apunta a que **un subconjunto
concreto y estable de backends está caído**, y el balanceador sigue mandándoles tráfico
con toda la educación del mundo.

Fui backend por backend:

```console
$ for p in 8081 8082 8083 8084 8085 8086 8087 8088; do
    printf ":%s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' localhost:$p)"
  done
:8081 200    :8082 502    :8083 200    :8084 502
:8085 200    :8086 502    :8087 200    :8088 502
```

Alternos. Y por el `docker-compose.yml` sabía que los pares eran los Nginx y los impares
los Apache. **Los cuatro Apache servían; los cuatro Nginx, no.**

## Por qué 502 y no 500

Merece la pena pararse aquí, porque el código de estado ya te está diciendo dónde mirar.

Un **500** significa «he intentado ejecutar tu aplicación y ha petado». Un **502** significa
«soy un intermediario y el de detrás no me contesta». Nginx no ejecuta PHP: se lo pasa a
un proceso aparte, PHP-FPM, por un socket Unix. Si Nginx devuelve 502 en una petición a un
`.php`, casi siempre es que **no encuentra ese socket**.

Comprobé lo obvio primero: que PHP-FPM estuviera vivo dentro del contenedor.

```console
$ docker exec web2 sh -c 'ps aux | grep -c [p]hp-fpm'
1
```

Estaba corriendo. Así que el problema no era que PHP-FPM se hubiera caído, sino que
**Nginx lo buscaba donde no estaba**.

## La causa

En la configuración de Nginx tenía esta línea:

```nginx
fastcgi_pass unix:/run/php/php8.3-fpm.sock;
```

Y dentro del contenedor:

```console
$ docker exec web2 php -v
PHP 8.5.4 (cli) (built: Jul 16 2026 18:56:38) (NTS)
```

Ahí está. La configuración busca el socket de **PHP 8.3** y el contenedor tiene
**PHP 8.5**, que crea `php8.5-fpm.sock`. Nginx llama a una puerta que ya no existe,
no obtiene respuesta y devuelve 502.

¿Y por qué cambió la versión de PHP si el Dockerfile es el mismo? Por su primera línea:

```dockerfile
FROM ubuntu:latest
RUN apt-get install nginx php php-fpm ...
```

`ubuntu:latest` no es una versión: **es un puntero móvil**. Cuando construí la imagen
apuntaba a Ubuntu 24.04, cuyos repositorios traían PHP 8.3, y todo encajaba. Al reconstruirla
un año después, `latest` ya apuntaba a otra versión de Ubuntu con PHP 8.5. Y `php-fpm`
tampoco es una versión: instala la que toque.

Dos referencias móviles alineadas por casualidad en el momento de escribir la configuración.
En cuanto una se mueve, se rompe.

## El arreglo

Fijar la imagen base:

```diff
- FROM ubuntu:latest
+ FROM ubuntu:24.04
```

Reconstruir y comprobar:

```console
$ for p in 8081 8082 8083 8084 8085 8086 8087 8088; do ... done
:8081 200    :8082 200    :8083 200    :8084 200
:8085 200    :8086 200    :8087 200    :8088 200
```

Y el balanceador repartiendo como debe, cuarenta y ocho peticiones entre ocho servidores:

```console
      6 192.168.10.2   (web1 · Apache)
      6 192.168.10.3   (web2 · Nginx)
      6 192.168.10.4   (web3 · Apache)
      6 192.168.10.5   (web4 · Nginx)
      6 192.168.10.6   (web5 · Apache)
      6 192.168.10.7   (web6 · Nginx)
      6 192.168.10.8   (web7 · Apache)
      6 192.168.10.9   (web8 · Nginx)
```

Seis exactas a cada uno. Round-robin de manual.

## La lección, que no es «fija la versión»

Fijar la versión es el parche. Lo interesante es otra cosa: **un proyecto que funciona hoy
no es un proyecto reproducible**. Son cosas distintas y es fácil confundirlas, porque
mientras nada cambia parecen la misma.

Mi práctica funcionaba. La entregué funcionando. Pero dependía de que dos referencias
móviles siguieran alineadas, y eso no lo garantiza nadie. La bomba estaba puesta desde el
primer día; solo hacía falta esperar.

Es especialmente traicionero en un portafolio. Si un reclutador clona tu repositorio para
echarle un ojo, no ve tu proyecto: ve un 502. Y no va a investigar por qué.

Tres hábitos que me llevo:

**Fija todo lo que puedas fijar.** `ubuntu:24.04` en vez de `ubuntu:latest`. Y si quieres
ir en serio, el digest: `ubuntu@sha256:...`, que es inmutable de verdad.

**Desconfía de las versiones implícitas.** `apt-get install php-fpm` te da la que haya.
Si tu configuración menciona `php8.3`, instala `php8.3-fpm` explícitamente. Que las dos
mitades hablen de lo mismo.

**Reconstruye de vez en cuando.** Un `docker compose build --no-cache` cada pocos meses
te avisa de esto mientras aún te acuerdas de cómo funciona el proyecto. Es mucho más barato
que descubrirlo el día que alguien te lo pide.

---

*Este fallo salió al preparar los vídeos de demostración de este portafolio. La granja web
está en el proyecto [Granja web de altas prestaciones](/proyectos/granja-web/), con la
comparativa de los cuatro balanceadores.*
