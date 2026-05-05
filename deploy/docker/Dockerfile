FROM nginx:1.26-alpine

COPY index.html       /usr/share/nginx/html/sviewer/index.html
COPY manifest.json    /usr/share/nginx/html/sviewer/manifest.json
COPY sw.js            /usr/share/nginx/html/sviewer/sw.js
COPY static/          /usr/share/nginx/html/sviewer/static/
COPY connectors/      /usr/share/nginx/html/sviewer/connectors/
COPY js/sviewer.js    /usr/share/nginx/html/sviewer/js/sviewer.js
COPY js/embed.js      /usr/share/nginx/html/sviewer/js/embed.js
COPY css/sviewer.css  /usr/share/nginx/html/sviewer/css/sviewer.css
