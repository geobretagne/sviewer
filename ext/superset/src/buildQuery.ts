import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const rowLimit = Number((formData as any).rowLimit ?? (formData as any).row_limit ?? 2000) || 2000;
  const mode = (formData as any).geomMode || (formData as any).geom_mode || 'geojson';
  const cols: string[] = [];

  if (mode === 'geojson') {
    cols.push((formData as any).geomCol || (formData as any).geom_col || 'geojson');
  } else {
    const latCol = (formData as any).latCol || (formData as any).lat_col;
    const lonCol = (formData as any).lonCol || (formData as any).lon_col;
    if (latCol) cols.push(latCol);
    if (lonCol) cols.push(lonCol);
  }

  const labelCol = (formData as any).labelCol || (formData as any).label_col;
  const idCol = (formData as any).idCol || (formData as any).id_col;
  if (labelCol) cols.push(labelCol);
  if (idCol) cols.push(idCol);

  return buildQueryContext(formData, baseQueryObject => [{
    ...baseQueryObject,
    metrics: [],
    columns: cols,
    row_limit: rowLimit,
    orderby: [],
  }]);
}
