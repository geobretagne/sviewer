# Performance Optimization Guide

This document describes optimizations implemented in sviewer to improve Lighthouse performance scores.

## Implemented Optimizations

### 1. Resource Hints (DNS & Connection Prefetching)
- Added `preconnect` to unpkg.com (OpenLayers CDN)
- Added `dns-prefetch` to data.geopf.fr (geocoding service)
- **Impact**: Reduces DNS lookup time and connection latency for external resources

### 2. Lazy Loading - QRCode Library
- QRCode library (`lib/qrcode.js/qrcode.min.js`) is now loaded on-demand
- Only loaded when the share panel is opened and QR code is needed
- Removed from initial page load
- **Impact**: Reduces initial page load time by ~5-10KB

### 3. HTTP Compression & Caching
Configured in `.htaccess` for Apache or `nginx.conf` for Nginx:

**Gzip Compression** - Compresses:
- HTML, CSS, JavaScript (80-90% reduction)
- SVG images

**Cache Control Headers**:
- Static assets (CSS, JS, images, fonts): 1-year expiration
- HTML: 1-day expiration (allows updates)
- **Impact**: Significantly faster repeat visits and reduced bandwidth

### 4. Resource Cleanup for Production
The following files should be **excluded from production deployment**:
- `build/ol-debug.js` (3.3 MB - debug only)
- `lib/ol3/` directory (obsolete OpenLayers 3 build)
- `sample/` directory (test/example data)

**Size savings**: ~9 MB

## Deployment Instructions

### Apache (.htaccess)
The `.htaccess` file is already configured. Ensure your Apache configuration allows:
```
AllowOverride FileInfo Expires Headers
```

### Nginx Configuration
Add to your server block in `nginx.conf`:

```nginx
# Gzip compression
gzip on;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/json image/svg+xml;
gzip_min_length 1000;
gzip_vary on;

# Cache control headers
location ~* \.(js|css|jpg|jpeg|png|gif|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.html$ {
    expires 1d;
    add_header Cache-Control "public, must-revalidate";
}
```

### Docker / Container Deployment
Update your Dockerfile or deployment process to exclude unnecessary files:

```dockerfile
# In your COPY or build step, exclude:
COPY --chown=www-data:www-data . /var/www/html/sviewer
# Then remove:
RUN rm -rf /var/www/html/sviewer/lib/ol3 \
           /var/www/html/sviewer/build/ol-debug.js \
           /var/www/html/sviewer/sample
```

## Performance Metrics

**Expected improvements**:
- Initial page load: ~10-15% faster
- Repeat visits: ~70-80% faster (due to caching)
- Bundle size for new visitors: ~9 MB reduction
- Lighthouse score: +5-10 points (toward 80+)

## Future Optimization Opportunities

1. **Minification** (2-5% reduction):
   - Minify `js/sviewer.js` (50 KB)
   - Minify `css/sviewer.css` (96 KB)
   - Build tools: webpack, terser, cssnano

2. **Image Optimization** (30-50% reduction):
   - Convert PNG images to WebP format
   - Optimize JPEG compression
   - Convert texture background to CSS gradient

3. **Code Splitting**:
   - Separate modal/panel functionality from core map
   - Lazy load query/locate features

4. **Service Worker**:
   - Cache static assets for offline support
   - Faster loading for repeat visits on mobile

5. **CSS-in-JS for Background**:
   - Replace `bgpaper.jpg` (20 KB) with CSS texture pattern
   - Reduce HTTP requests

## Testing Performance

Use Google PageSpeed Insights:
```
https://pagespeed.web.dev/
```

Or test locally with Lighthouse in Chrome DevTools:
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Click "Analyze page load"

Monitor your server's response time and gzip effectiveness:
```bash
# Check gzip compression
curl -I -H "Accept-Encoding: gzip" https://yourserver/sviewer/

# Check cache headers
curl -I https://yourserver/sviewer/index.html
```
