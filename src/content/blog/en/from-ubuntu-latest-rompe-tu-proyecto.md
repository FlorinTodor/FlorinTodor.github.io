---
titulo: "\"FROM ubuntu:latest\" is going to break your project (just not today)"
tituloSeo: "\"FROM ubuntu:latest\" is going to break your project"
descripcion: "A web farm that worked in 2025 was returning 502 on half the requests a year later, without a line of code being touched. How I diagnosed it and how to avoid it."
fecha: 2026-08-18
etiquetas: ["Docker", "Nginx", "PHP", "Reproducibility", "DevOps"]
minutos: 6
---

A few days ago I brought back up an assignment I did for the High Performance Web Servers
course: a farm of eight web servers (four Apache, four Nginx) behind a load balancer. It
worked back then, I handed it in, and there it stayed.

A year later I brought it up again, without touching a single line, and **half the requests
came back 502 Bad Gateway**.

## The symptom

The first thing was to look at how the balancer was spreading the load. Forty requests:

```console
$ for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code}\n' localhost:80; done | sort | uniq -c
     20 200
     20 502
```

Exactly half. A 50% that clean already says a lot. If it were saturation or an intermittent
fault the numbers would not come out so round, so the likely explanation was **a fixed group
of dead backends** with the balancer still sending them requests anyway.

I went backend by backend:

```console
$ for p in 8081 8082 8083 8084 8085 8086 8087 8088; do
    printf ":%s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' localhost:$p)"
  done
:8081 200    :8082 502    :8083 200    :8084 502
:8085 200    :8086 502    :8087 200    :8088 502
```

Alternating. And from the `docker-compose.yml` I knew the even ones were the Nginx servers
and the odd ones the Apache ones. **All four Apache servers were serving; none of the four
Nginx ones were.**

## Why 502 and not 500

The status code already tells you where to look.

A **500** means "I tried to run your application and it blew up". A **502** means "I am a
middleman and the one behind me is not answering". Nginx does not execute PHP: it hands it
to a separate process, PHP-FPM, over a Unix socket. If Nginx returns 502 on a request for a
`.php` file, it almost always means **it cannot find that socket**.

I checked the obvious thing first: that PHP-FPM was alive inside the container.

```console
$ docker exec web2 sh -c 'ps aux | grep -c [p]hp-fpm'
1
```

It was running. So the problem was not that PHP-FPM had died, but that **Nginx was looking
for it in the wrong place**.

## The cause

The Nginx configuration had this line:

```nginx
fastcgi_pass unix:/run/php/php8.3-fpm.sock;
```

And inside the container:

```console
$ docker exec web2 php -v
PHP 8.5.4 (cli) (built: Jul 16 2026 18:56:38) (NTS)
```

There it is. The configuration looks for the **PHP 8.3** socket and the container has
**PHP 8.5**, which creates `php8.5-fpm.sock`. Nginx knocks on a door that no longer exists,
gets no answer and returns 502.

So why did the PHP version change if the Dockerfile is the same? Because of its first line:

```dockerfile
FROM ubuntu:latest
RUN apt-get install nginx php php-fpm ...
```

`ubuntu:latest` is not a version: **it is a moving pointer**. When I built the image it
pointed at Ubuntu 24.04, whose repositories shipped PHP 8.3, and everything lined up.
Rebuilding it a year later, `latest` already pointed at a different Ubuntu release with PHP
8.5. And `php-fpm` is not a version either: it installs whichever one happens to be current.

In other words I had two moving references that happened to agree at the moment I wrote the
configuration. As soon as one of them changed, it stopped working.

## The fix

Pin the base image:

```diff
- FROM ubuntu:latest
+ FROM ubuntu:24.04
```

Rebuild and check:

```console
$ for p in 8081 8082 8083 8084 8085 8086 8087 8088; do ... done
:8081 200    :8082 200    :8083 200    :8084 200
:8085 200    :8086 200    :8087 200    :8088 200
```

And the balancer spreading the load as it should, forty-eight requests across eight servers:

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

Six each, which is what you expect from a round robin.

## What I take from this

Pinning the version is the fix, but what interests me is something else: a project working
today does not mean it can be rebuilt tomorrow. They are two different things and they are
easy to confuse, because while nothing changes they look identical.

My assignment worked when I handed it in, but it depended on two moving references
continuing to agree, and nobody guarantees that. The fault was there from the start; it just
took a year to show up.

In a portfolio this stings in particular. If somebody clones your repository to take a look
and gets a 502, the normal reaction is not to sit down and investigate why.

Three things I am going to do from now on:

**Pin the versions.** `ubuntu:24.04` instead of `ubuntu:latest`. If you need a stronger
guarantee, the digest (`ubuntu@sha256:...`) is fully immutable.

**Leave no implicit versions.** `apt-get install php-fpm` installs whatever is current at
that moment. If the configuration mentions `php8.3`, you have to install `php8.3-fpm`
explicitly so that the two halves agree.

**Rebuild every now and then.** A `docker compose build --no-cache` every few months warns
you about this kind of thing while you still remember how the project worked.

---

*This came up while preparing the videos for this portfolio. The web farm is at
[High performance web farm](/en/proyectos/granja-web/), with the comparison of the four
load balancers.*
