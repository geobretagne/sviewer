import React, { useEffect, useRef, useMemo } from 'react';

interface FeatureCollection {
  type: 'FeatureCollection';
  features: any[];
}

interface SviewerChartProps {
  width: number;
  height: number;
  sviewerUrl: string;
  wmsLayer: string;
  wmsUrl: string;
  basemap: string;
  theme: string;
  idCol: string;
  labelCol: string;
  featureCollection: FeatureCollection | null;
  setDataMask?: (mask: any) => void;
}

export default function SviewerChart(props: SviewerChartProps) {
  const {
    width, height, sviewerUrl, wmsLayer, wmsUrl,
    basemap, theme, idCol, featureCollection, setDataMask,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<FeatureCollection | null>(null);

  const iframeSrc = useMemo(() => {
    if (!sviewerUrl) return '';
    const base = sviewerUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('ext', 'superset');
    if (wmsLayer) params.set('layers', wmsUrl ? `${wmsLayer}@${wmsUrl}` : wmsLayer);
    if (basemap) params.set('lb', basemap);
    if (theme) params.set('theme', theme);
    return `${base}/?${params.toString()}`;
  }, [sviewerUrl, wmsLayer, wmsUrl, basemap, theme]);

  // Send GeoJSON to iframe
  function sendGeoJSON(fc: FeatureCollection) {
    if (!iframeRef.current?.contentWindow) return;
    const targetOrigin = new URL(iframeSrc).origin;
    iframeRef.current.contentWindow.postMessage({ type: 'sv:geojson', data: fc }, targetOrigin);
  }

  // Listen for messages from iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!iframeRef.current) return;
      // Accept only messages from our iframe (unforgeable source check)
      if (e.source !== iframeRef.current.contentWindow) return;
      if (!e.data || typeof e.data.type !== 'string') return;
      if (e.data.type === 'sv:ready') {
        readyRef.current = true;
        // Send any GeoJSON that arrived before iframe was ready
        const pending = pendingRef.current;
        if (pending) {
          sendGeoJSON(pending);
          pendingRef.current = null;
        }
      }

      if (e.data.type === 'sv:click' && setDataMask && idCol && e.data.properties) {
        const id = e.data.properties[idCol];
        if (id != null) {
          setDataMask({
            extraFormData: {
              filters: [{ col: idCol, op: 'IN', val: [id] }],
            },
            filterState: { value: [id] },
          });
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [idCol, setDataMask, iframeSrc]);

  // Send GeoJSON when featureCollection changes
  useEffect(() => {
    if (!featureCollection) return;
    if (readyRef.current) {
      sendGeoJSON(featureCollection);
    } else {
      pendingRef.current = featureCollection;
    }
  }, [featureCollection]);

  // Reset ready flag when iframe src changes (reload)
  useEffect(() => {
    readyRef.current = false;
    pendingRef.current = featureCollection;
  }, [iframeSrc]);

  if (!sviewerUrl) {
    return (
      <div style={{
        width, height, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#888', fontSize: 14,
      }}>
        Configure sViewer URL in chart settings
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      width={width}
      height={height}
      style={{ border: 'none', display: 'block' }}
      title="sViewer Map"
      allowFullScreen
    />
  );
}
