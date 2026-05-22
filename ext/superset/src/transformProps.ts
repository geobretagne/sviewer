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

  const rawColor = fd.featureColor || fd.feature_color;
  const featureColorCss = rawColor
    ? `rgba(${rawColor.r},${rawColor.g},${rawColor.b},${rawColor.a})`
    : '';

  const rawFc = rows.length > 0
    ? buildFeatureCollection(rows, geomMode, geomCol, latCol, lonCol)
    : null;

  // Inject _sv_color into every feature when a color is configured
  const featureCollection = rawFc && featureColorCss
    ? { ...rawFc, features: rawFc.features.map(f => ({ ...f, properties: { ...(f as { properties: Record<string, unknown> }).properties, _sv_color: featureColorCss } })) }
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
    labelCol,
    queryError,
    featureCollection,
  };
}
