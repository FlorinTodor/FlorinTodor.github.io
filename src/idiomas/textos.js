/**
 * Toda la copia del sitio, en los dos idiomas.
 *
 * Está en un solo fichero a propósito: así se ve de un vistazo qué falta por
 * traducir y no hay que perseguir cadenas sueltas por las plantillas. Lo que
 * viene de los ficheros de datos (proyectos, certificaciones, artículos) no
 * está aquí, sino en sus propias traducciones; ver src/idiomas/contenido.js.
 *
 * `formacion` y `competencias` viven aquí y no en la portada porque son casi
 * todo texto: al añadir una entrada hay que tocar los dos idiomas.
 */

const NOMBRE = 'Florin Emanuel Todor Gliga';

export const IDIOMAS = ['es', 'en'];

export const LOCALE = { es: 'es-ES', en: 'en-GB' };
export const OG_LOCALE = { es: 'es_ES', en: 'en_GB' };
export const HREFLANG = { es: 'es', en: 'en' };

export const TEXTOS = {
  es: {
    selector: { titulo: 'Idioma', es: 'Español', en: 'English' },
    saltar: 'Saltar al contenido',
    profesion: 'Ingeniero Informático',
    descripcionPersona:
      'Ingeniero informático especializado en administración de sistemas Linux, ciberseguridad e inteligencia artificial aplicada.',
    universidad: 'Universidad de Granada',
    conocimientos: [
      'Linux', 'Docker', 'Ciberseguridad', 'ModSecurity', 'OWASP', 'Nginx', 'HAProxy',
      'Inteligencia artificial generativa', 'Neo4j', 'Grafos de conocimiento',
      'ENS', 'NIS2', 'DORA', 'Python', 'C++',
    ],
    altOg: `${NOMBRE} - sistemas Linux, ciberseguridad e IA aplicada`,
    tituloRss: 'Blog de Florin Todor',

    nav: {
      sobreMi: 'Sobre mí',
      proyectos: 'Proyectos',
      blog: 'Blog',
      competencias: 'Competencias',
      formacion: 'Formación',
      certificaciones: 'Certificaciones',
      cv: 'CV',
      contacto: 'Contacto',
      abrirMenu: 'Abrir menú',
    },

    lateral: {
      retrato: (nombre) => `Retrato de ${nombre}`,
      github: 'GitHub',
      linkedin: 'LinkedIn',
      correo: 'Correo',
      residencia: 'Residencia',
      pais: 'España',
      ciudad: 'Ciudad',
      titulacion: 'Titulación',
      titulacionValor: ['Doble Grado', 'Informática + ADE'],
      idiomas: 'Idiomas',
      idiomasValor: 'Español · Inglés',
      contactar: 'Contactar',
    },

    cabecera: { descargarCv: 'Descargar CV' },

    pie: {
      hecho: 'Hecho con Astro y publicado en GitHub Pages.',
    },

    portada: {
      titulo: `${NOMBRE} - Linux, ciberseguridad e IA`,
      descripcion:
        'Portafolio de Florin Emanuel Todor Gliga (Florín Todor): sistemas Linux y Docker, ciberseguridad e IA aplicada. Doble Grado en Informática y ADE, UGR.',
      titular: ['Construyo sistemas.', 'Y me aseguro de que ', 'aguanten', '.'],
      entradilla:
        'Soy Florin, de Motril. Acabo de terminar el <strong>Doble Grado en Ingeniería Informática y ADE</strong> en la Universidad de Granada. Trabajo sobre todo con <strong>sistemas Linux</strong>, <strong>ciberseguridad</strong> e <strong>IA aplicada</strong>.',
      verProyectos: 'Ver proyectos',
      escribeme: 'Escríbeme',
    },

    sobreMi: {
      titulo: 'Sobre mí',
      parrafos: [
        'Estudié el <strong>Doble Grado en Ingeniería Informática y ADE</strong>, cinco años entre asignaturas de programación y de empresa. Al principio no lo tenía claro, pero con el tiempo le he visto la utilidad: además de la parte técnica entiendo cómo funciona una empresa por dentro, y eso ayuda a la hora de justificar decisiones.',
        'Donde mejor me manejo es en <strong>Linux y Docker</strong>. He montado una granja web con ocho servidores comparando cuatro balanceadores distintos, he puesto un WAF con ModSecurity delante de una aplicación vulnerable para ver qué bloqueaba de verdad, y he configurado HTTPS y cortafuegos con iptables sobre contenedores. Aparte de eso he tocado cosas bastante distintas: un e-commerce con Node y MongoDB, una app en Flutter con backend en Rails, realidad aumentada con OpenCV y varios proyectos en C++.',
        'Ahora busco un primer trabajo en algo relacionado con <strong>sistemas, seguridad o inteligencia artificial</strong>. También estoy subiendo el nivel de inglés, que es lo que peor llevo. Si te encaja algo de lo que hay aquí, escríbeme.',
      ],
    },

    proyectos: {
      titulo: 'Proyectos',
      nota: 'Cada proyecto tiene su propia página con la demo, el enlace al repositorio (salvo los marcados como privados) y la memoria cuando la hay. Las demos son grabaciones de ejecuciones reales, no capturas ni maquetas: el sitio es estático y no hay ningún servidor detrás.',
      destacados: 'Destacados',
      otros: 'Otros trabajos',
    },

    competencias: {
      titulo: 'Competencias',
      areas: [
        { area: 'Sistemas e infraestructura', items: ['Linux', 'Bash', 'Docker', 'Docker Compose', 'Nginx', 'HAProxy', 'Traefik', 'Envoy', 'Balanceo de carga', 'Alta disponibilidad'] },
        { area: 'Ciberseguridad', items: ['ModSecurity', 'OWASP CRS', 'IPTABLES', 'HTTPS/SSL (OpenSSL)', 'ENS', 'NIS2', 'DORA', 'PCAP (Cisco)'] },
        { area: 'IA y datos', items: ['IA generativa', 'RAG', 'Grafos de conocimiento', 'Neo4j', 'Ollama', 'LangChain', 'Sentence-BERT', 'Pandas', 'Statsmodels'] },
        { area: 'Lenguajes', items: ['Python', 'C++', 'Java', 'JavaScript', 'Dart', 'Ruby', 'SQL', 'Cypher'] },
        { area: 'Desarrollo web', items: ['Node.js', 'Express', 'FastAPI', 'React', 'Next.js', 'Flutter', 'MongoDB', 'Tailwind'] },
        { area: 'Rendimiento y pruebas', items: ['Apache Benchmark', 'Locust', 'pytest', 'Jest', 'RAGAS'] },
      ],
    },

    formacion: {
      titulo: 'Formación',
      verCertificaciones: 'Ver las certificaciones con su documento →',
      entradas: [
        {
          fecha: '2021 – 2026',
          centro: 'Universidad de Granada',
          titulo: 'Doble Grado en Ingeniería Informática y Administración y Dirección de Empresas',
          enlace: 'https://grados.ugr.es/informatica-ade/docencia/plan-estudios',
          enlaceTexto: 'Ver el plan de estudios',
        },
        {
          fecha: '2020 – 2021',
          centro: 'Cisco Networking Academy',
          titulo: 'PCAP: Programming Essentials in Python',
          detalle: 'Curso completo de Python de la Networking Academy. Hice también Introduction to Cybersecurity y, más tarde, Python Essentials 1.',
          certificados: ['cisco-pcap-programming-essentials-python', 'cisco-introduction-to-cybersecurity', 'cisco-python-essentials-1'],
        },
        {
          fecha: '2021 – 2022',
          centro: 'Universidad de Granada',
          titulo: 'MOOC de Conocimiento Abierto y Software Libre · MOOC de Machine Learning y Big Data para Bioinformática',
          detalle: 'Dos cursos abiertos de la UGR: uno de software libre y otro de aprendizaje automático aplicado a datos biomédicos.',
          certificados: ['mooc-ugr-software-libre', 'mooc-ugr-ml-bioinformatica'],
        },
        {
          fecha: '2026',
          centro: 'British Council',
          titulo: 'Aptis ESOL International Certificate - nivel B1',
          detalle: 'Nivel B1 del Marco Común Europeo en las cuatro destrezas: comprensión oral y escrita, y expresión oral y escrita.',
          certificados: ['british-council-aptis-b1'],
        },
      ],
      pdf: 'PDF ↗',
      ver: 'Ver ↗',
      certificadoAlt: (titulo) => `Certificado: ${titulo}`,
    },

    cv: {
      titulo: 'Currículum',
      abrirAria: 'Abrir el currículum en PDF',
      portadaAlt: `Primera página del currículum de ${NOMBRE}`,
      descargar: 'Descargar PDF',
      abrir: 'Abrir en el navegador',
    },

    contacto: {
      titulo: 'Contacto',
      correo: 'Correo',
      telefono: 'Teléfono',
      github: 'GitHub',
      linkedin: 'LinkedIn',
    },

    tarjeta: {
      insignia: '▶ demo',
      privado: 'Código privado',
      codigo: 'Código ↗',
      memoria: 'Memoria ↗',
      demo: 'Demo →',
    },

    ficha: {
      volver: '← Todos los proyectos',
      verCodigo: 'Ver el código en GitHub ↗',
      verMemoria: 'Memoria en PDF ↗',
      verDemo: '▶ Ver la demo',
      privadoEscribeme: 'Código privado: escríbeme',
      privado: 'Código privado',
      demostracion: 'Demostración',
      demostracionAlt: (titulo) => `Demostración de ${titulo}`,
      queHace: 'Qué hace',
      autoria: 'Autoría',
      stack: 'Stack',
      contexto: 'Contexto',
      memoria: 'Memoria',
      memoriaTexto: (paginas) =>
        `El documento completo${paginas ? `, ${paginas} páginas` : ''}: planteamiento, diseño del grafo, evaluación y resultados.`,
      descargarMemoria: 'Descargar el PDF',
      mas: 'Más',
      otrosProyectos: '← Otros proyectos',
      tituloGrafo: 'Explora el grafo normativo',
      introGrafo:
        'El núcleo del módulo es un grafo que enlaza los artículos de NIS2 y DORA con los controles del ENS que los satisfacen. Elige un artículo y verás qué controles exige. Son los datos reales del grafo del TFG.',
      tituloRutina: 'Míralo funcionando',
      introRutina:
        'Lo que produce la canalización, con datos inventados: ninguna cifra sale de un dispositivo ni de una persona real.',
      rutina: {
        aviso: 'Es el dashboard real del proyecto, generado con datos inventados: ninguna cifra procede de un dispositivo ni de una persona real.',
        titulo: 'Dashboard de rutina-export con datos de ejemplo',
        abrir: 'Abrirlo en una pestaña aparte',
      },
      tituloBanca: 'Pruébalo',
      introBanca:
        'Pulsa las preguntas sugeridas para reproducir una conversación: verás las llamadas a herramientas del modelo, el SQL que genera y los gráficos que decide dibujar.',
      altOg: (titulo) => `${titulo} - proyecto de ${NOMBRE}`,
      tfg: 'Trabajo de Fin de Grado',
    },

    certificaciones: {
      titulo: 'Certificaciones - ' + NOMBRE,
      descripcion:
        'Certificaciones y cursos de Florin Emanuel Todor Gliga: PCAP de Cisco, ciberseguridad y cursos de la Universidad de Granada, con el documento original de cada uno.',
      antetitulo: 'Certificaciones',
      encabezado: 'Lo que he ido certificando',
      resumen: 'Cursos y certificaciones oficiales, con el documento original de cada uno para que se pueda comprobar.',
      conPdf: 'Pincha en cualquiera para abrir el documento.',
      conCredly: 'Pincha en cualquiera para verificarla en la web de quien la expide.',
      sinNada: 'Los documentos se irán subiendo aquí.',
      filtrar: 'Filtrar por área',
      todas: 'Todas',
      verDocumento: 'Ver documento',
      pendiente: 'Documento pendiente de subir',
      verificar: 'Verificar ↗',
      vacio: 'No hay nada en esa área.',
      cierre: ['La titulación completa está en ', 'Formación', ' y el recorrido entero en el ', 'CV en PDF', '.'],
      listaNombre: `Certificaciones de ${NOMBRE}`,
      certificadoAlt: (titulo) => `Certificado: ${titulo}`,
      meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      fecha: (mes, anio) => `${mes} de ${anio}`,
    },

    blog: {
      titulo: `Blog - ${NOMBRE}`,
      descripcion:
        'Notas sobre fallos de infraestructura, seguridad e IA aplicada: qué pasó, cómo lo diagnostiqué y cómo se evita.',
      antetitulo: 'Blog',
      encabezado: 'Cosas que se rompen y por qué',
      resumen:
        'Apunto aquí los fallos con los que me voy encontrando en infraestructura, seguridad e IA, sobre todo cuando me cuesta dar con la causa. Escribirlos me sirve para no repetirlos.',
      rss: 'Suscribirse por RSS →',
      vacio: 'Todavía no hay artículos publicados.',
      lectura: (min) => `${min} min de lectura`,
      minutos: (min) => `${min} min`,
      volver: '← Todos los artículos',
      firma: ['Escrito por ', '. Si te ha servido o quieres comentar algo, ', 'escríbeme', '.'],
      rssTitulo: `${NOMBRE} - Blog`,
      rssDescripcion: 'Infraestructura, ciberseguridad e IA aplicada: fallos reales y cómo se diagnostican.',
    },

    error404: {
      titulo: `Página no encontrada - ${NOMBRE}`,
      descripcion: 'Esta dirección no existe en florintodor.dev.',
      encabezado: 'Esta dirección no existe',
      resumen:
        'O el enlace que has seguido está roto, o la página se movió. Nada grave: aquí abajo tienes todo lo que hay en el sitio.',
      volver: '← Volver a la portada',
      destinos: [
        { camino: '#proyectos', titulo: 'Proyectos', texto: 'Ocho trabajos, casi todos con su demo en vídeo y la explicación de qué resuelven.' },
        { camino: 'certificaciones/', titulo: 'Certificaciones', texto: 'Los títulos, con el documento original de cada uno.' },
        { camino: 'blog/', titulo: 'Blog', texto: 'Fallos de infraestructura y seguridad: qué pasó y cómo se evita.' },
        { camino: '#cv', titulo: 'Currículum', texto: 'El CV en PDF, para leerlo o descargarlo.' },
        { camino: '#contacto', titulo: 'Contacto', texto: 'Correo, teléfono, GitHub y LinkedIn.' },
      ],
    },

    grafo: {
      marco: 'Marco de origen',
      nis2: 'NIS2 - Directiva de seguridad de redes',
      dora: 'DORA - Resiliencia operativa digital',
      articulo: 'Artículo',
      exige: 'exige',
      controles: 'Controles ENS',
      // Con marcas {n}: las usa el script del navegador, que no puede llamar
      // a una función de este módulo.
      conteoUno: '{n} control ENS',
      conteoVarios: '{n} controles ENS',
      stats: '{nis2} artículos NIS2 y {dora} de DORA enlazados con {ens} controles ENS ({rel} relaciones)',
      pie: ['Datos reales del grafo del TFG: ', '. El motor resuelve además el ', 'Principio de Máximos', ', que aquí no se representa: para cada control elige la exigencia más restrictiva entre los tres marcos.'],
      error: 'No se pudo cargar el grafo.',
    },

    banca: {
      aviso:
        'Sesión grabada, no un modelo en vivo: GitHub Pages es estático y no puede ejecutar el backend. Las cifras, el SQL y las herramientas son los reales del proyecto; los gráficos se renderizan aquí mismo con Chart.js a partir de la misma especificación que emite el modelo.',
      reiniciar: 'Reiniciar',
      saludo: 'Hola 👋 Soy tu asistente. Puedes preguntarme por tu saldo, tus gastos o pedirme que envíe un Bizum.',
      fin: 'Fin de la sesión grabada.',
      error: 'No se pudo cargar la sesión.',
    },
  },

  en: {
    selector: { titulo: 'Language', es: 'Español', en: 'English' },
    saltar: 'Skip to content',
    profesion: 'Computer Engineer',
    descripcionPersona:
      'Computer engineer specialised in Linux systems administration, cybersecurity and applied artificial intelligence.',
    universidad: 'University of Granada',
    conocimientos: [
      'Linux', 'Docker', 'Cybersecurity', 'ModSecurity', 'OWASP', 'Nginx', 'HAProxy',
      'Generative artificial intelligence', 'Neo4j', 'Knowledge graphs',
      'ENS', 'NIS2', 'DORA', 'Python', 'C++',
    ],
    altOg: `${NOMBRE} - Linux systems, cybersecurity and applied AI`,
    tituloRss: "Florin Todor's blog",

    nav: {
      sobreMi: 'About',
      proyectos: 'Projects',
      blog: 'Blog',
      competencias: 'Skills',
      formacion: 'Education',
      certificaciones: 'Certifications',
      cv: 'CV',
      contacto: 'Contact',
      abrirMenu: 'Open menu',
    },

    lateral: {
      retrato: (nombre) => `Portrait of ${nombre}`,
      github: 'GitHub',
      linkedin: 'LinkedIn',
      correo: 'Email',
      residencia: 'Based in',
      pais: 'Spain',
      ciudad: 'City',
      titulacion: 'Degree',
      titulacionValor: ['Double Degree', 'Computer Eng. + Business'],
      idiomas: 'Languages',
      idiomasValor: 'Spanish · English',
      contactar: 'Get in touch',
    },

    cabecera: { descargarCv: 'Download CV (Spanish)' },

    pie: {
      hecho: 'Built with Astro and published on GitHub Pages.',
    },

    portada: {
      titulo: `${NOMBRE} - Linux, cybersecurity and AI`,
      descripcion:
        'Portfolio of Florin Emanuel Todor Gliga: Linux and Docker systems, cybersecurity and applied AI. Double Degree in Computer Engineering and Business, University of Granada.',
      titular: ['I build systems.', 'And I make sure they ', 'hold up', '.'],
      entradilla:
        "I'm Florin, from Motril, in the south of Spain. I've just finished a <strong>Double Degree in Computer Engineering and Business Administration</strong> at the University of Granada. I work mostly with <strong>Linux systems</strong>, <strong>cybersecurity</strong> and <strong>applied AI</strong>.",
      verProyectos: 'See the projects',
      escribeme: 'Email me',
    },

    sobreMi: {
      titulo: 'About me',
      parrafos: [
        "I studied a <strong>Double Degree in Computer Engineering and Business Administration</strong>: five years split between programming subjects and business ones. I wasn't sure about it at first, but over time I've come to see the point. On top of the technical side I understand how a company works from the inside, and that helps when the time comes to justify a decision.",
        'Where I work best is <strong>Linux and Docker</strong>. I have built an eight-server web farm comparing four different load balancers, put a ModSecurity WAF in front of a deliberately vulnerable application to see what it really blocked, and set up HTTPS and iptables firewalls on containers. Beyond that I have worked on fairly different things: an e-commerce site with Node and MongoDB, a Flutter app with a Rails backend, augmented reality with OpenCV and several C++ projects.',
        "I'm now looking for a first job in something to do with <strong>systems, security or artificial intelligence</strong>. I'm also working on my English, which is the part I find hardest. If something here fits what you need, drop me a line.",
      ],
    },

    proyectos: {
      titulo: 'Projects',
      nota: 'Every project has its own page with the demo, the link to the repository (except the ones marked private) and the written report where there is one. The demos are recordings of real runs, not screenshots or mock-ups: this site is static and there is no server behind it. The recordings themselves are in Spanish.',
      destacados: 'Featured',
      otros: 'Other work',
    },

    competencias: {
      titulo: 'Skills',
      areas: [
        { area: 'Systems and infrastructure', items: ['Linux', 'Bash', 'Docker', 'Docker Compose', 'Nginx', 'HAProxy', 'Traefik', 'Envoy', 'Load balancing', 'High availability'] },
        { area: 'Cybersecurity', items: ['ModSecurity', 'OWASP CRS', 'IPTABLES', 'HTTPS/SSL (OpenSSL)', 'ENS', 'NIS2', 'DORA', 'PCAP (Cisco)'] },
        { area: 'AI and data', items: ['Generative AI', 'RAG', 'Knowledge graphs', 'Neo4j', 'Ollama', 'LangChain', 'Sentence-BERT', 'Pandas', 'Statsmodels'] },
        { area: 'Programming languages', items: ['Python', 'C++', 'Java', 'JavaScript', 'Dart', 'Ruby', 'SQL', 'Cypher'] },
        { area: 'Web development', items: ['Node.js', 'Express', 'FastAPI', 'React', 'Next.js', 'Flutter', 'MongoDB', 'Tailwind'] },
        { area: 'Performance and testing', items: ['Apache Benchmark', 'Locust', 'pytest', 'Jest', 'RAGAS'] },
      ],
    },

    formacion: {
      titulo: 'Education',
      verCertificaciones: 'See the certifications with their documents →',
      entradas: [
        {
          fecha: '2021 – 2026',
          centro: 'University of Granada',
          titulo: 'Double Degree in Computer Engineering and Business Administration',
          enlace: 'https://grados.ugr.es/informatica-ade/docencia/plan-estudios',
          enlaceTexto: 'See the syllabus (in Spanish)',
        },
        {
          fecha: '2020 – 2021',
          centro: 'Cisco Networking Academy',
          titulo: 'PCAP: Programming Essentials in Python',
          detalle: 'The full Python course from the Networking Academy. I also took Introduction to Cybersecurity and, later, Python Essentials 1.',
          certificados: ['cisco-pcap-programming-essentials-python', 'cisco-introduction-to-cybersecurity', 'cisco-python-essentials-1'],
        },
        {
          fecha: '2021 – 2022',
          centro: 'University of Granada',
          titulo: 'MOOC on Open Knowledge and Free Software · MOOC on Machine Learning and Big Data for Bioinformatics',
          detalle: 'Two open courses from the University of Granada: one on free software, the other on machine learning applied to biomedical data.',
          certificados: ['mooc-ugr-software-libre', 'mooc-ugr-ml-bioinformatica'],
        },
        {
          fecha: '2026',
          centro: 'British Council',
          titulo: 'Aptis ESOL International Certificate - level B1',
          detalle: 'CEFR level B1 in the four skills: listening, reading, speaking and writing.',
          certificados: ['british-council-aptis-b1'],
        },
      ],
      pdf: 'PDF ↗',
      ver: 'Open ↗',
      certificadoAlt: (titulo) => `Certificate: ${titulo}`,
    },

    cv: {
      titulo: 'CV',
      abrirAria: 'Open the CV as a PDF',
      portadaAlt: `First page of the CV of ${NOMBRE}`,
      descargar: 'Download PDF (Spanish)',
      abrir: 'Open in the browser',
    },

    contacto: {
      titulo: 'Contact',
      correo: 'Email',
      telefono: 'Phone',
      github: 'GitHub',
      linkedin: 'LinkedIn',
    },

    tarjeta: {
      insignia: '▶ demo',
      privado: 'Private code',
      codigo: 'Code ↗',
      memoria: 'Report ↗',
      demo: 'Demo →',
    },

    ficha: {
      volver: '← All projects',
      verCodigo: 'View the code on GitHub ↗',
      verMemoria: 'Full report (PDF) ↗',
      verDemo: '▶ Watch the demo',
      privadoEscribeme: 'Private code: email me',
      privado: 'Private code',
      demostracion: 'Demo',
      demostracionAlt: (titulo) => `Demo of ${titulo}`,
      queHace: 'What it does',
      autoria: 'Authorship',
      stack: 'Stack',
      contexto: 'Context',
      memoria: 'Report',
      memoriaTexto: (paginas) =>
        `The full document${paginas ? `, ${paginas} pages` : ''}: approach, graph design, evaluation and results. Written in Spanish.`,
      descargarMemoria: 'Download the PDF',
      mas: 'More',
      otrosProyectos: '← Other projects',
      tituloGrafo: 'Explore the compliance graph',
      introGrafo:
        'At the core of the module is a graph linking the articles of NIS2 and DORA to the Spanish ENS controls that satisfy them. Pick an article and you will see which controls it demands. This is the real data from the thesis graph, kept in the original Spanish and EU wording.',
      tituloRutina: 'See it running',
      introRutina:
        'What the pipeline produces, with made-up data: no figure comes from a real device or a real person.',
      rutina: {
        aviso: 'This is the project\'s real dashboard, generated from made-up data: no figure comes from a real device or a real person.',
        titulo: 'rutina-export dashboard with sample data',
        abrir: 'Open it in its own tab',
      },
      tituloBanca: 'Try it',
      introBanca:
        'Click the suggested questions to replay a conversation: you will see the model’s tool calls, the SQL it writes and the charts it decides to draw.',
      altOg: (titulo) => `${titulo} - a project by ${NOMBRE}`,
      tfg: "Bachelor's thesis",
    },

    certificaciones: {
      titulo: `Certifications - ${NOMBRE}`,
      descripcion:
        'Certifications and courses of Florin Emanuel Todor Gliga: Cisco PCAP, cybersecurity and University of Granada courses, each with its original document.',
      antetitulo: 'Certifications',
      encabezado: 'What I have certified so far',
      resumen: 'Official courses and certifications, each with its original document so it can be checked.',
      conPdf: 'Click any of them to open the document.',
      conCredly: 'Click any of them to verify it on the issuer’s site.',
      sinNada: 'The documents will be uploaded here.',
      filtrar: 'Filter by area',
      todas: 'All',
      verDocumento: 'View document',
      pendiente: 'Document not uploaded yet',
      verificar: 'Verify ↗',
      vacio: 'Nothing in that area.',
      cierre: ['The full degree is under ', 'Education', ', and the whole path in the ', 'CV as a PDF', '.'],
      listaNombre: `Certifications of ${NOMBRE}`,
      certificadoAlt: (titulo) => `Certificate: ${titulo}`,
      meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      fecha: (mes, anio) => `${mes} ${anio}`,
    },

    blog: {
      titulo: `Blog - ${NOMBRE}`,
      descripcion:
        'Notes on infrastructure, security and applied AI failures: what happened, how I diagnosed it and how to avoid it.',
      antetitulo: 'Blog',
      encabezado: 'Things that break, and why',
      resumen:
        'I write down the failures I run into in infrastructure, security and AI, especially the ones where the cause took me a while to find. Writing them up keeps me from repeating them.',
      rss: 'Subscribe by RSS →',
      vacio: 'No posts published yet.',
      lectura: (min) => `${min} min read`,
      minutos: (min) => `${min} min`,
      volver: '← All posts',
      firma: ['Written by ', '. If it helped, or you want to add something, ', 'email me', '.'],
      rssTitulo: `${NOMBRE} - Blog`,
      rssDescripcion: 'Infrastructure, cybersecurity and applied AI: real failures and how they are diagnosed.',
    },

    error404: {
      titulo: `Page not found - ${NOMBRE}`,
      descripcion: 'This address does not exist on florintodor.dev.',
      encabezado: 'This address does not exist',
      resumen:
        'Either the link you followed is broken or the page moved. Nothing serious: below is everything the site has.',
      volver: '← Back to the home page',
      destinos: [
        { camino: '#proyectos', titulo: 'Projects', texto: 'Eight pieces of work, nearly all with a video demo and an explanation of what they solve.' },
        { camino: 'certificaciones/', titulo: 'Certifications', texto: 'The qualifications, each with its original document.' },
        { camino: 'blog/', titulo: 'Blog', texto: 'Infrastructure and security failures: what happened and how to avoid them.' },
        { camino: '#cv', titulo: 'CV', texto: 'The CV as a PDF, to read or download.' },
        { camino: '#contacto', titulo: 'Contact', texto: 'Email, phone, GitHub and LinkedIn.' },
      ],
    },

    grafo: {
      marco: 'Source framework',
      nis2: 'NIS2 - Network and information security directive',
      dora: 'DORA - Digital operational resilience',
      articulo: 'Article',
      exige: 'requires',
      controles: 'ENS controls',
      conteoUno: '{n} ENS control',
      conteoVarios: '{n} ENS controls',
      stats: '{nis2} NIS2 articles and {dora} DORA ones linked to {ens} ENS controls ({rel} relations)',
      pie: ['Real data from the thesis graph: ', '. The engine also resolves the ', 'Principle of Maxima', ', not shown here: for each control it picks the strictest requirement across the three frameworks. Article and control texts are kept in their original Spanish and EU wording.'],
      error: 'The graph could not be loaded.',
    },

    banca: {
      aviso:
        'A recorded session, not a live model: GitHub Pages is static and cannot run the backend. The figures, the SQL and the tools are the real ones from the project; the charts are rendered right here with Chart.js from the same specification the model emits.',
      reiniciar: 'Restart',
      saludo: 'Hi 👋 I’m your assistant. You can ask me about your balance, your spending, or ask me to send a Bizum transfer.',
      fin: 'End of the recorded session.',
      error: 'The session could not be loaded.',
    },
  },
};

export const t = (idioma) => TEXTOS[idioma] || TEXTOS.es;
