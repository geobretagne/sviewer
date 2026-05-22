import { ChartPlugin, ChartMetadata, Behavior } from '@superset-ui/core';
import SviewerChart from './SviewerChart';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import buildQuery from './buildQuery';

const CHART_TYPE = 'sviewer_map';

// Derive sViewer base URL from the plugin bundle script URL.
// Bundle lives at <sviewer_root>/dist/superset-plugin-chart-sviewer.js
function _detectSviewerBaseUrl(): string {
  const scripts = Array.from(document.scripts);
  const self = scripts.find(s => s.src.includes('superset-plugin-chart-sviewer'));
  if (!self) return '';
  return self.src.replace(/\/dist\/[^/?#]+\.js.*$/, '/');
}
export const SVIEWER_BASE_URL = _detectSviewerBaseUrl();

class SviewerChartPlugin extends ChartPlugin {
  constructor() {
    super({
      metadata: new ChartMetadata({
        name: 'sViewer Map',
        description: 'Visualisation cartographique — WMS, GeoJSON, OGC',
        thumbnail: '',
        useLegacyApi: false,
        behaviors: [Behavior.InteractiveChart, Behavior.DrillToDetail],
        canBeAnnotationTypes: [],
        credits: [],
        exampleGallery: [],
        tags: ['Map', 'WMS', 'OGC'],
        category: 'Map',
      }),
      Chart: SviewerChart,
      transformProps,
      controlPanel,
      buildQuery,
    });
  }
}

// Self-register when loaded as dynamic plugin
new SviewerChartPlugin().configure({ key: CHART_TYPE }).register();

export default SviewerChartPlugin;
