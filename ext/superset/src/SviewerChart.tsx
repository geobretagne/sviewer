import React, { useCallback, useEffect, useRef, useMemo } from 'react';

interface FeatureCollection {
  type: 'FeatureCollection';
  features: object[];
}

interface SviewerChartProps {
  width: number;
  height: number;
  sviewerUrl: string;
  wmsLayer: string;
  wmsUrl: string;
  basemap: string;
  theme: string;
  sliceName: string;
  autoZoom: boolean;
  queryError: string;
  featureCollection: FeatureCollection | null;
}

export default function SviewerChart(props: SviewerChartProps) {
  const {
    width, height, sviewerUrl, wmsLayer, wmsUrl,
    basemap, theme, sliceName, autoZoom, queryError, featureCollection,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<FeatureCollection | null>(null);

  const iframeSrc = useMemo(() => {
    if (!sviewerUrl) return '';
    if (!/^https?:\/\//i.test(sviewerUrl)) return '';
    const base = sviewerUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('ext', 'superset');
    if (wmsLayer) params.set('layers', wmsUrl ? `${wmsLayer}@${wmsUrl}` : wmsLayer);
    if (basemap) params.set('lb', basemap);
    if (theme) params.set('theme', theme);
    if (sliceName) params.set('title', sliceName);
    return `${base}/?${params.toString()}`;
  }, [sviewerUrl, wmsLayer, wmsUrl, basemap, theme, sliceName]);

  const sendGeoJSON = useCallback((fc: FeatureCollection) => {
    if (!iframeRef.current?.contentWindow) return;
    const targetOrigin = new URL(iframeSrc).origin;
    iframeRef.current.contentWindow.postMessage({ type: 'sv:geojson', data: fc, autoZoom }, targetOrigin);
  }, [iframeSrc, autoZoom]);

  // Listen for messages from iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!iframeRef.current) return;
      // Accept only messages from our iframe (unforgeable source check)
      if (e.source !== iframeRef.current.contentWindow) return;
      if (!e.data || typeof e.data.type !== 'string') return;
      if (e.data.type === 'sv:ready') {
        readyRef.current = true;
        const pending = pendingRef.current;
        if (pending) {
          sendGeoJSON(pending);
          pendingRef.current = null;
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendGeoJSON]);

  // Send GeoJSON when featureCollection changes
  useEffect(() => {
    if (!featureCollection) return;
    if (readyRef.current) {
      sendGeoJSON(featureCollection);
    } else {
      pendingRef.current = featureCollection;
    }
  }, [featureCollection, sendGeoJSON]);

  // Reset ready flag when iframe src changes (reload); capture current featureCollection
  useEffect(() => {
    readyRef.current = false;
    pendingRef.current = featureCollection;
  // featureCollection intentionally excluded — we want the value at src-change time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeSrc]);

  const centered: React.CSSProperties = {
    width, height, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 14, textAlign: 'center', padding: 16,
  };

  if (!sviewerUrl) {
    return <div style={{ ...centered, color: '#888' }}>Configurez l'URL sViewer dans les paramètres du graphique</div>;
  }

  if (queryError) {
    return <div style={{ ...centered, color: '#e8413d' }}>{queryError}</div>;
  }

  if (featureCollection !== null && featureCollection.features.length === 0 && !wmsLayer) {
    return <div style={{ ...centered, color: '#888' }}>Aucune donnée</div>;
  }

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      width={width}
      height={height}
      style={{ border: 'none', display: 'block' }}
      title="sViewer Map"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      allowFullScreen
    />
  );
}
