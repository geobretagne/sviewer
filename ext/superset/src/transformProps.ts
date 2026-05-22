import { ChartProps } from '@superset-ui/core';

interface RgbaColor { r: number; g: number; b: number; a: number; }

interface SviewerFormData {
  geomMode?: string;           geom_mode?: string;
  geomCol?: string | null;     geom_col?: string | null;
  latCol?: string | null;      lat_col?: string | null;
  lonCol?: string | null;      lon_col?: string | null;
  labelCol?: string | null;    label_col?: string | null;
  sviewerUrl?: string;         sviewer_url?: string;
  featureColor?: RgbaColor;    feature_color?: RgbaColor;
  sizeCol?: string | null;     size_col?: string | null;
  sizeMode?: string;           size_mode?: string;
  colorRampCol?: string | null;  color_ramp_col?: string | null;
  colorRampMode?: string;        color_ramp_mode?: string;
  colorRampLow?: RgbaColor;      color_ramp_low?: RgbaColor;
  colorRampHigh?: RgbaColor;     color_ramp_high?: RgbaColor;
  autoZoom?: boolean;            auto_zoom?: boolean;
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

function lerpColor(low: RgbaColor, high: RgbaColor, t: number): string {
  const r = Math.round(low.r + (high.r - low.r) * t);
  const g = Math.round(low.g + (high.g - low.g) * t);
  const b = Math.round(low.b + (high.b - low.b) * t);
  const a = low.a + (high.a - low.a) * t;
  return `rgba(${r},${g},${b},${a})`;
}

// Fisher-Jenks natural breaks — returns k-1 upper-bound values separating k classes.
// Uses cumulative sums for O(n²·k) complexity.
function jenksBreaks(sorted: number[], k: number): number[] {
  const n = sorted.length;
  // Fewer distinct values than classes — use value boundaries as breaks
  if (n <= k) {
    const seen = new Set<number>();
    return sorted.filter(v => !seen.has(v) && seen.add(v)).slice(1);
  }

  // Precompute prefix sums for O(1) range mean/variance
  const s1 = new Array(n + 1).fill(0);  // sum
  const s2 = new Array(n + 1).fill(0);  // sum of squares
  for (let i = 1; i <= n; i++) {
    s1[i] = s1[i - 1] + sorted[i - 1];
    s2[i] = s2[i - 1] + sorted[i - 1] ** 2;
  }
  // Variance of sorted[a-1..b-1] (1-indexed) via prefix sums
  const variance = (a: number, b: number) => {
    const cnt = b - a + 1;
    const sum = s1[b] - s1[a - 1];
    const sq  = s2[b] - s2[a - 1];
    return sq - sum ** 2 / cnt;
  };

  const mat: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
  const vr: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity));

  for (let j = 1; j <= k; j++) { mat[1][j] = 1; vr[1][j] = 0; }
  for (let i = 2; i <= n; i++) { mat[i][1] = 1; vr[i][1] = variance(1, i); }

  for (let j = 2; j <= k; j++) {
    for (let i = j; i <= n; i++) {
      for (let m = j; m <= i; m++) {
        const v = variance(m, i);
        const total = v + vr[m - 1][j - 1];
        if (total < vr[i][j]) { vr[i][j] = total; mat[i][j] = m; }
      }
    }
  }

  const breaks: number[] = new Array(k - 1);
  let kk = k, ii = n;
  while (kk > 1) {
    // upper bound of class kk-1 = element just before class kk starts
    breaks[kk - 2] = sorted[mat[ii][kk] - 2];
    ii = mat[ii][kk] - 1;
    kk--;
  }
  return breaks;
}

function normalizeValues(values: number[], mode: string): number[] {
  if (mode === 'rank' || mode === 'quantile') {
    // rank: continuous percentile; quantile: same math, alias kept for UI clarity
    const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const result = new Array(values.length).fill(0);
    sorted.forEach(({ i }, rank) => {
      result[i] = values.length > 1 ? rank / (values.length - 1) : 1;
    });
    return result;
  }

  if (mode === 'jenks') {
    const k = 5;
    const sorted = [...values].sort((a, b) => a - b);
    const breaks = jenksBreaks(sorted, k);
    const minVal = sorted[0];
    const maxVal = sorted[sorted.length - 1];
    if (minVal === maxVal) return values.map(() => 0.5);
    // cls = number of breaks strictly less than v; max value always reaches top class
    return values.map(v => {
      let cls = 0;
      for (const b of breaks) { if (v > b) cls++; }
      // clamp: max value may equal the last break upper-bound exactly
      return Math.min(cls, k - 1) / (k - 1);
    });
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (minVal === maxVal) return values.map(() => 0.5);

  return values.map(v => {
    const vPos = Math.max(0, v - minVal);
    const range = maxVal - minVal;
    let t: number;
    if (mode === 'log') {
      t = Math.log1p(vPos) / Math.log1p(range);
    } else if (mode === 'linear') {
      t = vPos / range;
    } else {
      t = Math.sqrt(vPos) / Math.sqrt(range);
    }
    return Math.min(1, Math.max(0, t));
  });
}

function computeColors(
  features: Feature[],
  colorRampCol: string,
  colorRampMode: string,
  low: RgbaColor,
  high: RgbaColor,
): string[] {
  const values = features.map(f => {
    const v = parseFloat(String(f.properties[colorRampCol]));
    return isFinite(v) ? v : 0;
  });
  return normalizeValues(values, colorRampMode).map(t => lerpColor(low, high, t));
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
  return normalizeValues(values, sizeMode).map(t => MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t);
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

  const colorRampCol: string = fd.colorRampCol || fd.color_ramp_col || '';
  const colorRampMode: string = fd.colorRampMode || fd.color_ramp_mode || 'sqrt';
  const colorRampLow: RgbaColor = fd.colorRampLow || fd.color_ramp_low || { r: 255, g: 255, b: 204, a: 1 };
  const colorRampHigh: RgbaColor = fd.colorRampHigh || fd.color_ramp_high || { r: 0, g: 90, b: 50, a: 1 };

  const rawFc = rows.length > 0
    ? buildFeatureCollection(rows, geomMode, geomCol, latCol, lonCol)
    : null;

  // Compute per-feature radii if size column configured
  const radii = rawFc && sizeCol
    ? computeRadii(rawFc.features, sizeCol, sizeMode)
    : null;

  // Compute per-feature colors if color ramp column configured (overrides fixed color)
  const rampColors = rawFc && colorRampCol
    ? computeColors(rawFc.features, colorRampCol, colorRampMode, colorRampLow, colorRampHigh)
    : null;

  // Inject _sv_color, _label, _sv_radius into feature properties
  const needsInject = featureColorCss || colorRampCol || labelCol || radii;
  const featureCollection = rawFc && needsInject
    ? {
        ...rawFc,
        features: rawFc.features.map((f, i) => {
          const props = { ...(f as { properties: Record<string, unknown> }).properties };
          if (rampColors) {
            props._sv_color = rampColors[i];
          } else if (featureColorCss) {
            props._sv_color = featureColorCss;
          }
          if (labelCol && props[labelCol] != null) props._label = props[labelCol];
          if (radii) props._sv_radius = Math.round(radii[i]);
          return { ...f, properties: props };
        }),
      }
    : rawFc;

  // Parse sviewer_url: accept bare base URL or full share URL.
  // All share URL params pass through untouched; plugin enforces only ext= and title=.
  const rawSviewerUrl: string = fd.sviewerUrl || fd.sviewer_url || '';
  let sviewerBase = '';
  let urlParams = new URLSearchParams();
  if (rawSviewerUrl) {
    try {
      const parsed = new URL(rawSviewerUrl);
      sviewerBase = `${parsed.origin}${parsed.pathname}`;
      urlParams = parsed.searchParams;
    } catch {
      sviewerBase = rawSviewerUrl;
    }
  }

  return {
    width,
    height,
    sviewerUrl: sviewerBase,
    urlParams,
    sliceName: rawFormData?.slice_name || '',
    autoZoom: !!(fd.autoZoom ?? fd.auto_zoom),
    queryError,
    featureCollection,
  };
}
