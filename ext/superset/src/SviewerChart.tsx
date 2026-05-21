import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';

interface FeatureCollection {
  type: 'FeatureCollection';
  features: object[];
}

interface DataMask {
  extraFormData?: { filters?: { col: string; op: string; val: unknown[] }[] };
  filterState?: { value?: unknown[] };
}

interface Preset {
  lb: number;
  title: string;
}

interface SviewerChartProps {
  width: number;
  height: number;
  sviewerUrl: string;
  wmsLayer: string;
  wmsUrl: string;
  theme: string;
  idCol: string;
  labelCol: string;
  featureCollection: FeatureCollection | null;
  setDataMask?: (mask: DataMask) => void;
}

// Extract backgroundPresets from customConfig.js text
function parsePresets(text: string): Preset[] {
  const block = text.match(/backgroundPresets\s*:\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  const items = block[1].matchAll(/\{[^}]*lb\s*:\s*(\d+)[^}]*title\s*:\s*['"]([^'"]+)['"]/g);
  return Array.from(items).map(m => ({ lb: parseInt(m[1], 10), title: m[2] }));
}

export default function SviewerChart(props: SviewerChartProps) {
  const {
    width, height, sviewerUrl, wmsLayer, wmsUrl,
    theme, idCol, featureCollection, setDataMask,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<FeatureCollection | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [activeLb, setActiveLb] = useState<number | null>(null);

  // Fetch backgroundPresets from sViewer's customConfig when URL changes
  useEffect(() => {
    if (!sviewerUrl || !/^https?:\/\//i.test(sviewerUrl)) return;
    const base = sviewerUrl.replace(/\/$/, '');
    let cancelled = false;
    fetch(`${base}/local/customConfig.js`)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(text => {
        if (cancelled) return;
        const found = parsePresets(text);
        setPresets(found);
        setActiveLb(found.length > 0 ? found[0].lb : null);
      })
      .catch(() => { if (!cancelled) setPresets([]); });
    return () => { cancelled = true; };
  }, [sviewerUrl]);

  const iframeSrc = useMemo(() => {
    if (!sviewerUrl) return '';
    if (!/^https?:\/\//i.test(sviewerUrl)) return '';
    const base = sviewerUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('ext', 'superset');
    if (wmsLayer) params.set('layers', wmsUrl ? `${wmsLayer}@${wmsUrl}` : wmsLayer);
    if (activeLb !== null) params.set('lb', String(activeLb));
    if (theme) params.set('theme', theme);
    return `${base}/?${params.toString()}`;
  }, [sviewerUrl, wmsLayer, wmsUrl, activeLb, theme]);

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
    <div style={{ position: 'relative', width, height }}>
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
      {presets.length > 1 && (
        <select
          value={activeLb ?? ''}
          onChange={e => setActiveLb(Number(e.target.value))}
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 10,
            padding: '2px 6px',
            fontSize: 12,
            borderRadius: 4,
            border: '1px solid #ccc',
            background: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
          }}
        >
          {presets.map(p => (
            <option key={p.lb} value={p.lb}>{p.title}</option>
          ))}
        </select>
      )}
    </div>
  );
}
