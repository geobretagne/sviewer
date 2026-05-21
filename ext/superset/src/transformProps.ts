import { ChartProps } from '@superset-ui/core';

interface Feature {
  type: 'Feature';
  geometry: object;
  properties: Record<string, any>;
}

function buildFeatureCollection(
  rows: Record<string, any>[],
  geomMode: string,
  geomCol: string,
  latCol: string,
  lonCol: string,
): { type: 'FeatureCollection'; features: Feature[] } {
  const features: Feature[] = [];

  for (const row of rows) {
    let geometry: object | null = null;

    if (geomMode === 'latlon') {
      const lat = parseFloat(row[latCol]);
      const lon = parseFloat(row[lonCol]);
      if (isFinite(lat) && isFinite(lon)) {
        geometry = { type: 'Point', coordinates: [lon, lat] };
      }
    } else {
      const raw = row[geomCol];
      if (raw) {
        try {
          geometry = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          // skip malformed geometry
        }
      }
    }

    if (!geometry) continue;

    // Omit geometry column(s) from properties to avoid doubling payload
    const properties = { ...row };
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

  const rows: Record<string, any>[] = (queriesData[0] as any)?.data || [];
  const geomMode: string = formData.geomMode || formData.geom_mode || 'geojson';
  const geomCol: string = formData.geomCol || formData.geom_col || 'geojson';
  const latCol: string = formData.latCol || formData.lat_col || 'lat';
  const lonCol: string = formData.lonCol || formData.lon_col || 'lon';
  const labelCol: string = formData.labelCol || formData.label_col || '';
  const idCol: string = formData.idCol || formData.id_col || '';

  const featureCollection = rows.length > 0
    ? buildFeatureCollection(rows, geomMode, geomCol, latCol, lonCol)
    : null;

  return {
    width,
    height,
    sviewerUrl: formData.sviewerUrl || formData.sviewer_url || '',
    wmsLayer: formData.wmsLayer || formData.wms_layer || '',
    wmsUrl: formData.wmsUrl || formData.wms_url || '',
    basemap: formData.basemap || '',
    theme: formData.theme || '',
    idCol,
    labelCol,
    featureCollection,
  };
}
