---
titulo: "«FROM ubuntu:latest» te va a romper el proyecto (y no será hoy)"
tituloSeo: "«FROM ubuntu:latest» te va a romper el proyecto"
descripcion: "Una granja web que funcionaba en 2025 devolvía 502 en la mitad de las peticiones un año después, sin haber tocado el código. Cómo lo diagnostiqué y cómo se evita."
fecha: 2026-08-18
etiquetas: ["Docker", "Nginx", "PHP", "Reproducibilidad", "DevOps"]
minutos: 6
---

Hace unos días volví a levantar una práctica que hice para la asignatura de Servidores
Web de Altas Prestaciones: una granja de ocho servidores web (cuatro Apache y cuatro
Nginx) detrás de un balanceador. En su día funcionaba, la entregué y ahí se quedó.

Un año después la levanté otra vez, sin tocar una sola línea, y **la mitad de las
peticiones devolvían 502 Bad Gateway**.

## El síntoma

Lo primero fue mirar cómo repartía el balanceador. Cuarenta peticiones:

```console
$ for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code}\n' localhost:80; done | sort | uniq -c
     20 200
     20 502
```

Exactamente la mitad. Un 50 % tan exacto ya dice bastante. Si fuera saturación o un fallo intermitente los
números no saldrían tan redondos, así que lo más probable era que hubiera **un grupo fijo
de backends caídos** y el balanceador siguiera mandándoles peticiones igualmente.

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

El código de estado ya da una pista de dónde mirar.

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

O sea que tenía dos referencias móviles que coincidieron en el momento de escribir la
configuración. En cuanto una de las dos cambió, dejó de funcionar.

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

Seis a cada uno, que es lo que se esperaba de un round-robin.

## Lo que saco de esto

Fijar la versión es el arreglo, pero lo que me interesa es otra cosa: que un proyecto
funcione hoy no significa que vaya a poder reconstruirse mañana. Son dos cosas distintas y
se confunden con facilidad, porque mientras nada cambia se comportan igual.

Mi práctica funcionaba cuando la entregué, pero dependía de que dos referencias móviles
siguieran coincidiendo, y eso no lo garantiza nadie. El fallo estaba ahí desde el principio,
solo que tardó un año en aparecer.

En un portafolio esto molesta especialmente. Si alguien clona tu repositorio para echarle un
vistazo se encuentra un 502, y lo normal es que no se ponga a investigar por qué.

Tres cosas que voy a hacer a partir de ahora:

**Fijar las versiones.** `ubuntu:24.04` en vez de `ubuntu:latest`. Si hace falta más
garantía, el digest (`ubuntu@sha256:...`) ya es inmutable del todo.

**No dejar versiones implícitas.** `apt-get install php-fpm` instala la que haya en ese
momento. Si la configuración menciona `php8.3`, hay que instalar `php8.3-fpm` de forma
explícita para que las dos partes coincidan.

**Reconstruir de vez en cuando.** Un `docker compose build --no-cache` cada pocos meses
avisa de este tipo de cosas mientras todavía te acuerdas de cómo iba el proyecto.

---

*Esto salió al preparar los vídeos de este portafolio. La granja web está en
[Granja web de altas prestaciones](/proyectos/granja-web/), con la comparativa de los
cuatro balanceadores.*
