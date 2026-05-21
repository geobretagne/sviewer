import React, { useCallback, useEffect, useRef, useMemo } from 'react';

interface FeatureCollection {
  type: 'FeatureCollection';
  features: object[];
}

interface DataMask {
  extraFormData?: { filters?: { col: string; op: string; val: unknown[] }[] };
  filterState?: { value?: unknown[] };
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
  setDataMask?: (mask: DataMask) => void;
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
    if (!/^https?:\/\//i.test(sviewerUrl)) return '';
    const base = sviewerUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('ext', 'superset');
    if (wmsLayer) params.set('layers', wmsUrl ? `${wmsLayer}@${wmsUrl}` : wmsLayer);
    if (basemap) params.set('lb', basemap);
    if (theme) params.set('theme', theme);
    return `${base}/?${params.toString()}`;
  }, [sviewerUrl, wmsLayer, wmsUrl, basemap, theme]);

  const sendGeoJSON = useCallback((fc: FeatureCollection) => {
    if (!iframeRef.current?.contentWindow) return;
    const targetOrigin = new URL(iframeSrc).origin;
    iframeRef.current.contentWindow.postMessage({ type: 'sv:geojson', data: fc }, targetOrigin);
  }, [iframeSrc]);

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

      if (e.data.type === 'sv:click' && setDataMask && idCol && e.data.properties) {
        const id = e.data.properties[idCol];
        const idType = typeof id;
        if (id != null && (idType === 'string' || idType === 'number')) {
          setDataMask({
            extraFormData: { filters: [{ col: idCol, op: 'IN', val: [id] }] },
            filterState: { value: [id] },
          });
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [idCol, setDataMask, sendGeoJSON]);

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
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      allowFullScreen
    />
  );
}
