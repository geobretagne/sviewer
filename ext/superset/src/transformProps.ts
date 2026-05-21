import { ChartProps } from '@superset-ui/core';

interface SviewerFormData {
  geomMode?: string;    geom_mode?: string;
  geomCol?: string;     geom_col?: string;
  latCol?: string;      lat_col?: string;
  lonCol?: string;      lon_col?: string;
  labelCol?: string;    label_col?: string;
  idCol?: string;       id_col?: string;
  sviewerUrl?: string;  sviewer_url?: string;
  wmsLayer?: string;    wms_layer?: string;
  wmsUrl?: string;      wms_url?: string;
  theme?: string;
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
  const fd = formData as unknown as SviewerFormData;

  const rows: Record<string, unknown>[] = (queriesData[0] as { data?: Record<string, unknown>[] })?.data || [];
  const geomMode: string = fd.geomMode || fd.geom_mode || 'geojson';
  const geomCol: string = fd.geomCol || fd.geom_col || 'geojson';
  const latCol: string = fd.latCol || fd.lat_col || 'lat';
  const lonCol: string = fd.lonCol || fd.lon_col || 'lon';
  const labelCol: string = fd.labelCol || fd.label_col || '';
  const idCol: string = fd.idCol || fd.id_col || '';

  const featureCollection = rows.length > 0
    ? buildFeatureCollection(rows, geomMode, geomCol, latCol, lonCol)
    : null;

  return {
    width,
    height,
    sviewerUrl: fd.sviewerUrl || fd.sviewer_url || '',
    wmsLayer: fd.wmsLayer || fd.wms_layer || '',
    wmsUrl: fd.wmsUrl || fd.wms_url || '',
    theme: fd.theme || '',
    idCol,
    labelCol,
    featureCollection,
  };
}
