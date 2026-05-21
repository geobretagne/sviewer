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

    features.push({
      type: 'Feature',
      geometry,
      properties: row,
    });
  }

  return { type: 'FeatureCollection', features };
}

export default function transformProps(chartProps: any) {
  const { width, height, formData, queriesData } = chartProps;


  const rows: Record<string, any>[] = queriesData[0]?.data || [];
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
