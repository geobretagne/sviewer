import { buildQueryContext, QueryFormData } from '@superset-ui/core';

interface SviewerFormData extends QueryFormData {
  geomMode?: string;  geom_mode?: string;
  geomCol?: string;   geom_col?: string;
  latCol?: string;    lat_col?: string;
  lonCol?: string;    lon_col?: string;
  labelCol?: string;  label_col?: string;
  sizeCol?: string;   size_col?: string;
  sortCol?: string;   sort_col?: string;
  sortDesc?: boolean; sort_desc?: boolean;
}

export default function buildQuery(formData: QueryFormData) {
  const fd = formData as SviewerFormData;
  const mode = fd.geomMode || fd.geom_mode || 'geojson';
  const cols: string[] = [];

  if (mode === 'geojson') {
    cols.push(fd.geomCol || fd.geom_col || 'geojson');
  } else {
    const latCol = fd.latCol || fd.lat_col;
    const lonCol = fd.lonCol || fd.lon_col;
    if (latCol) cols.push(latCol);
    if (lonCol) cols.push(lonCol);
  }

  const labelCol = fd.labelCol || fd.label_col;
  if (labelCol) cols.push(labelCol);
  const sizeCol = fd.sizeCol || fd.size_col;
  if (sizeCol) cols.push(sizeCol);

  const sortCol = fd.sortCol || fd.sort_col;
  const sortDesc = fd.sortDesc ?? fd.sort_desc ?? true;
  const orderby: [string, boolean][] = sortCol ? [[sortCol, !sortDesc]] : [];

  // row_limit comes from baseQueryObject (built-in control) — do not override
  return buildQueryContext(formData, baseQueryObject => [{
    ...baseQueryObject,
    metrics: [],
    columns: cols,
    orderby,
  }]);
}
