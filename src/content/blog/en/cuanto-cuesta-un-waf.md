---
titulo: "What it costs to put ModSecurity in front of an application"
tituloSeo: "What a ModSecurity WAF costs, measured"
descripcion: "I measured an application with and without a WAF (ModSecurity and the OWASP CRS) in four scenarios. How much of the cost is the WAF, how much is the configuration, and a false positive at paranoia level 4."
fecha: 2026-09-23
etiquetas: ["ModSecurity", "OWASP CRS", "Nginx", "Performance", "Cybersecurity"]
minutos: 7
---

For the High Performance Web Servers course I set up a WAF: Nginx with ModSecurity and
the OWASP Core Rule Set, in front of OWASP Juice Shop, a shop that is vulnerable on
purpose. On the project page I wrote that the WAF brought throughput down from 2,586 to
1,663 requests per second, 36 % less.

That figure has a problem. It mixes three things: the cost of putting a proxy in the
middle, the cost of ModSecurity and the cost of how I left it configured. So I measured it
again, separating each part.

## The setup

Everything runs locally with Docker, on a laptop with a Ryzen 9 5900HX:

```text
ab  →  Nginx 1.25.5 + ModSecurity 3.0.12 + CRS 3.3.5  →  Juice Shop 20.2.0
```

Going through the repository history I found something I had forgotten. The first commit
had the CRS at paranoia level 1 and the audit log set to `RelevantOnly`, which only keeps
suspicious requests. Three hours later, while testing, I changed it to this:

```apache
setvar:tx.paranoia_level=4
SecAuditEngine On # <--- CAMBIO: Forzar logging de TODO
SecDebugLogLevel 3
```

Paranoia level 4 is the strictest one in the CRS. `SecAuditEngine On` writes every request
and every response to disk. I set it to see what was going on and it stayed like that in
the repository. The measurement on the project page was most likely taken with this
configuration.

For this test I measured four scenarios:

| | Scenario |
|---|---|
| a | Juice Shop directly, nothing in front |
| b | Nginx as a proxy, with `modsecurity off` |
| c | The WAF as it is in the repository (paranoia 4, audit everything) |
| d | The WAF at paranoia 1 with `RelevantOnly` auditing |

Each scenario is 5,000 requests at a concurrency of 10, three rounds alternating the
scenarios, and a 500-request warm-up before each measurement.

## First, check that it blocks

Before measuring what it costs you have to check that it does something. These are the
status codes the WAF returns for several attacks, with the CRS rules that fire:

| Request | Direct | WAF | Rules at paranoia 1 |
|---|---|---|---|
| `q=apple'))--` (SQLi) | 200 | 403 | 942100 |
| `q=' OR 1=1--` (SQLi) | 500 | 403 | 942100 |
| `q=<script>alert(1)</script>` | 200 | 403 | 941100, 941110, 941160 |
| `q=<iframe src="javascript:...">` | 200 | 403 | 941100, 941140, 941160, 941170, 941210 |
| `q=../../../etc/passwd` | 200 | 403 | 930100, 930110, 930120, 932160 |
| `q=a;cat /etc/passwd` | 200 | 403 | 930120, 932100, 932160 |

The 500 in the second row comes from Juice Shop, which breaks on the quote. At paranoia 4
quite a few more rules fire on each attack, but the outcome is the same: they all end in
403. With this application, paranoia 1 already stops everything I tried.

## The first measurement showed nothing

I started with the product search, `/rest/products/search?q=apple`:

```console
$ ab -n 5000 -c 10 'http://127.0.0.1:3001/rest/products/search?q=apple'
Complete requests:      5000
Failed requests:        0
Requests per second:    113.82 [#/sec] (mean)
Time per request:       87.855 [ms] (mean)
```

About 100 requests per second with nothing in front. With the WAF, the same:

| Scenario | Rounds (req/s) | Median |
|---|---|---|
| a. Direct | 91.7 · 113.8 · 105.7 | 106 |
| b. Proxy | 101.8 · 113.2 · 113.2 | 113 |
| c. Repo (PL4) | 101.4 · 100.6 · 82.9 | 101 |
| d. PL1 | 99.0 · 102.4 · 93.0 | 99 |

The proxy comes out ahead of the direct run, so the differences are noise. Juice Shop
takes about 90 ms to answer that search and the WAF adds one or two, which get lost in
there. To see what the WAF costs I needed a backend that answers fast.

## Against a static file

I repeated the three rounds against `/assets/public/favicon_js.ico`, a 15 KB icon that
Juice Shop serves without touching the database:

```console
$ ab -n 5000 -c 10 -H 'Host: localhost' 'http://127.0.0.1:8080/assets/public/favicon_js.ico'
```

| Scenario | Rounds (req/s) | Median | ms per request |
|---|---|---|---|
| a. Direct | 3,145 · 3,366 · 3,899 | 3,366 | 2.97 |
| b. Proxy | 2,485 · 3,388 · 3,660 | 3,388 | 2.95 |
| c. Repo (PL4) | 1,875 · 2,480 · 2,482 | 2,480 | 4.03 |
| d. PL1 | 2,794 · 2,775 · 2,791 | 2,791 | 3.58 |

The first round is lower in almost every scenario. I take it as the system warming up and
go with the median.

Nginx as a proxy costs nothing measurable here. The WAF as I left it goes from 3,388 to
2,480 requests per second, 27 % less, and adds 1.1 ms to each request. At paranoia 1,
auditing only suspicious requests, the drop is 18 % and 0.6 ms.

Scenario d changes two things at once, the paranoia level and the auditing, so with this
data I can't split the difference between them. What I do know is that the debug log
played no part: `debug.log` stayed empty through every test, despite level 3.

## The audit log

With `SecAuditEngine On` every request is written in full to `audit.log`. After each batch
of 5,000 requests:

| Path | Log size | Per request |
|---|---|---|
| Search | 7.6 MB | 1.5 KB |
| Icon | 4.4 MB | 884 B |

In neither case is the response body stored, because the configuration only does that
for HTML, XML and plain text. The search takes more space because each entry also carries
a warning from a rule, which I explain below.

At the rate the WAF sustains with the icon that is about 2 MB per second, close to
900 MB per million requests. In production that file would need rotating, or the auditing
left at `RelevantOnly`.

This is where I got a surprise. In the first batch, scenario d also wrote 7.6 MB, as if it
were auditing everything. The reason:

```text
[id "920350"] [msg "Host header is a numeric IP address"] [data "127.0.0.1:8080"]
```

I was hitting `127.0.0.1`, and the CRS flags any request whose `Host` is an IP address.
It doesn't block it, because that only adds 3 of the 5 points needed, but `RelevantOnly`
keeps it. That's why in the icon batch I sent `Host: localhost` in all four scenarios. With
that, the log for d stayed at zero. A browser sends the domain name, so in normal use this
wouldn't happen.

## A false positive at paranoia 4

Trying normal requests, this turned up:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:8080/rest/products/search?q=apple%20juice'
403
```

Searching for "apple juice" in a juice shop returns 403. The rule is 920273:

```text
[id "920273"] [msg "Invalid character in request (outside of very strict set)"]
Inbound Anomaly Score Exceeded (Total Score: 5)
```

At paranoia 4 the CRS only accepts a very small character set, and the space isn't in it.
At paranoia 1 the same search returns 200. This is the kind of rule that, at paranoia 4,
forces you to write exclusions for every free-text field in the application.

## What I take from this

The figure on the project page mixed the WAF with a testing configuration. With the
default configuration the cost drops quite a bit, and it still blocks the attacks I tried.

To measure what a WAF costs you want a fast backend, because with a slow one the cost gets
lost in the noise. It also means that with a backend taking 90 ms per request, users won't
notice 1 ms more.

And paranoia 4 has a cost that `ab` doesn't show. It blocks legitimate searches and you
have to maintain a list of exclusions. For an application like this one I would stay at
paranoia 1 and raise the level only on the routes that justify it.

---

*The project is at [WAF with ModSecurity and the OWASP CRS on
Docker](/en/proyectos/waf-modsecurity/). The original measurement on the project page
(2,586 → 1,663 req/s): I didn't record which path or parameters it used, so its numbers
can't be compared directly with the ones here.*
