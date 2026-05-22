import { ChartProps } from '@superset-ui/core';

interface RgbaColor { r: number; g: number; b: number; a: number; }

interface SviewerFormData {
  geomMode?: string;           geom_mode?: string;
  geomCol?: string | null;     geom_col?: string | null;
  latCol?: string | null;      lat_col?: string | null;
  lonCol?: string | null;      lon_col?: string | null;
  labelCol?: string | null;    label_col?: string | null;
  sviewerUrl?: string;         sviewer_url?: string;
  wmsLayer?: string;           wms_layer?: string;
  wmsUrl?: string;             wms_url?: string;
  basemap?: string;
  theme?: string;
  featureColor?: RgbaColor;    feature_color?: RgbaColor;
  sizeCol?: string | null;     size_col?: string | null;
  sizeMode?: string;           size_mode?: string;
}

interface Feature {
  type: 'Feature';
  geometry: object;
  properties: Record<string, unknown>;
}

function buildFeatureCollection(
  rows: Record<string, unknown>[],
  geomMode: string,
  geomCol: string,
  latCol: string,
  lonCol: string,
): { type: 'FeatureCollection'; features: Feature[] } {
  const features: Feature[] = [];

  for (const row of rows) {
    let geometry: object | null = null;

    if (geomMode === 'latlon') {
      const lat = parseFloat(String(row[latCol]));
      const lon = parseFloat(String(row[lonCol]));
      if (isFinite(lat) && isFinite(lon)) {
        geometry = { type: 'Point', coordinates: [lon, lat] };
      }
    } else {
      const raw = row[geomCol];
      if (raw) {
        try {
          geometry = typeof raw === 'string' ? JSON.parse(raw) : (raw as object);
        } catch {
          // skip malformed geometry
        }
      }
    }

    if (!geometry) continue;

    // Omit geometry column(s) from properties to avoid doubling payload
    const properties: Record<string, unknown> = { ...row };
    if (geomMode === 'latlon') {
      delete properties[latCol];
      delete properties[lonCol];
    } else {
      delete properties[geomCol];
    }

    features.push({ type: 'Feature', geometry, properties });
  }

  return { type: 'FeatureCollection', features };
}

const MIN_RADIUS = 4;
const MAX_RADIUS = 20;

function computeRadii(
  features: Feature[],
  sizeCol: string,
  sizeMode: string,
): number[] {
  const values = features.map(f => {
    const v = parseFloat(String(f.properties[sizeCol]));
    return isFinite(v) ? v : 0;
  });

  if (sizeMode === 'rank') {
    // Rank-based: sort indices by value, assign radius by rank percentile
    const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const radii = new Array(values.length).fill(MIN_RADIUS);
    sorted.forEach(({ i }, rank) => {
      const t = values.length > 1 ? rank / (values.length - 1) : 1;
      radii[i] = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t;
    });
    return radii;
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (minVal === maxVal) return values.map(() => (MIN_RADIUS + MAX_RADIUS) / 2);

  return values.map(v => {
    const vPos = Math.max(0, v - minVal);
    const range = maxVal - minVal;
    let t: number;
    if (sizeMode === 'log') {
      t = Math.log1p(vPos) / Math.log1p(range);
    } else if (sizeMode === 'linear') {
      t = vPos / range;
    } else {
      // sqrt (default)
      t = Math.sqrt(vPos) / Math.sqrt(range);
    }
    return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.min(1, Math.max(0, t));
  });
}

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData } = chartProps;
  const rawFormData = (chartProps as ChartProps & { rawFormData?: { slice_name?: string } }).rawFormData;
  const fd = formData as unknown as SviewerFormData;

  const query = queriesData[0] as { data?: Record<string, unknown>[]; error?: string } | undefined;
  const rows: Record<string, unknown>[] = query?.data || [];
  const queryError: string = query?.error || '';
  const geomMode: string = fd.geomMode || fd.geom_mode || 'geojson';
  const geomCol: string = fd.geomCol || fd.geom_col || '';
  const latCol: string = fd.latCol || fd.lat_col || '';
  const lonCol: string = fd.lonCol || fd.lon_col || '';
  const labelCol: string = fd.labelCol || fd.label_col || '';
  const sizeCol: string = fd.sizeCol || fd.size_col || '';
  const sizeMode: string = fd.sizeMode || fd.size_mode || 'sqrt';

  const rawColor = fd.featureColor || fd.feature_color;
  const featureColorCss = rawColor
    ? `rgba(${rawColor.r},${rawColor.g},${rawColor.b},${rawColor.a})`
    : '';

  const rawFc = rows.length > 0
    ? buildFeatureCollection(rows, geomMode, geomCol, latCol, lonCol)
    : null;

  // Compute per-feature radii if size column configured
  const radii = rawFc && sizeCol
    ? computeRadii(rawFc.features, sizeCol, sizeMode)
    : null;

  // Inject _sv_color, _label, _sv_radius into feature properties
  const needsInject = featureColorCss || labelCol || radii;
  const featureCollection = rawFc && needsInject
    ? {
        ...rawFc,
        features: rawFc.features.map((f, i) => {
          const props = { ...(f as { properties: Record<string, unknown> }).properties };
          if (featureColorCss) props._sv_color = featureColorCss;
          if (labelCol && props[labelCol] != null) props._label = props[labelCol];
          if (radii) props._sv_radius = Math.round(radii[i]);
          return { ...f, properties: props };
        }),
      }
    : rawFc;

  return {
    width,
    height,
    sviewerUrl: fd.sviewerUrl || fd.sviewer_url || '',
    wmsLayer: fd.wmsLayer || fd.wms_layer || '',
    wmsUrl: fd.wmsUrl || fd.wms_url || '',
    basemap: fd.basemap || '',
    theme: fd.theme || '',
    sliceName: rawFormData?.slice_name || '',
    queryError,
    featureCollection,
  };
}
