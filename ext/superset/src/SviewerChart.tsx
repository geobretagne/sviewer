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

interface SviewerFrameProps {
  iframeSrc: string;
  width: number;
  height: number;
  idCol: string;
  featureCollection: FeatureCollection | null;
  setDataMask?: (mask: DataMask) => void;
}

// Separate component so key-based remount resets all state cleanly on src change
function SviewerFrame({ iframeSrc, width, height, idCol, featureCollection, setDataMask }: SviewerFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<FeatureCollection | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [activeLb, setActiveLb] = useState<number>(0);

  const targetOrigin = useMemo(() => new URL(iframeSrc).origin, [iframeSrc]);

  const sendGeoJSON = useCallback((fc: FeatureCollection) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sv:geojson', data: fc }, targetOrigin);
  }, [targetOrigin]);

  const sendSetLb = useCallback((lb: number) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sv:setlb', lb }, targetOrigin);
  }, [targetOrigin]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!iframeRef.current) return;
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

      if (e.data.type === 'sv:presets' && Array.isArray(e.data.presets)) {
        const list: Preset[] = e.data.presets.filter(
          (p: unknown) => p && typeof (p as Preset).lb === 'number' && typeof (p as Preset).title === 'string'
        );
        setPresets(list);
        if (list.length > 0) setActiveLb(list[0].lb);
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

  useEffect(() => {
    if (!featureCollection) return;
    if (readyRef.current) {
      sendGeoJSON(featureCollection);
    } else {
      pendingRef.current = featureCollection;
    }
  }, [featureCollection, sendGeoJSON]);

  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lb = Number(e.target.value);
    setActiveLb(lb);
    sendSetLb(lb);
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
          value={activeLb}
          onChange={handlePresetChange}
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

export default function SviewerChart(props: SviewerChartProps) {
  const { width, height, sviewerUrl, wmsLayer, wmsUrl, theme, idCol, featureCollection, setDataMask } = props;

  const iframeSrc = useMemo(() => {
    if (!sviewerUrl) return '';
    if (!/^https?:\/\//i.test(sviewerUrl)) return '';
    const base = sviewerUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('ext', 'superset');
    if (wmsLayer) params.set('layers', wmsUrl ? `${wmsLayer}@${wmsUrl}` : wmsLayer);
    if (theme) params.set('theme', theme);
    return `${base}/?${params.toString()}`;
  }, [sviewerUrl, wmsLayer, wmsUrl, theme]);

  if (!iframeSrc) {
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
    <SviewerFrame
      key={iframeSrc}
      iframeSrc={iframeSrc}
      width={width}
      height={height}
      idCol={idCol}
      featureCollection={featureCollection}
      setDataMask={setDataMask}
    />
  );
}

