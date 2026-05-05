FROM nginxinc/nginx-unprivileged:1.26-alpine

COPY deploy/docker/nginx-default.conf /etc/nginx/conf.d/default.conf

COPY index.html       /usr/share/nginx/html/sviewer/index.html
COPY manifest.json    /usr/share/nginx/html/sviewer/manifest.json
COPY sw.js            /usr/share/nginx/html/sviewer/sw.js
COPY static/          /usr/share/nginx/html/sviewer/static/
COPY connectors/      /usr/share/nginx/html/sviewer/connectors/
COPY js/sviewer.js    /usr/share/nginx/html/sviewer/js/sviewer.js
COPY js/embed.js      /usr/share/nginx/html/sviewer/js/embed.js
COPY css/sviewer.css  /usr/share/nginx/html/sviewer/css/sviewer.css

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:8080/sviewer/ || exit 1
