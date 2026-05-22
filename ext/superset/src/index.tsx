import { ChartPlugin, ChartMetadata, Behavior } from '@superset-ui/core';
import SviewerChart from './SviewerChart';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import buildQuery from './buildQuery';

const CHART_TYPE = 'sviewer_map';

// Base URL baked in at build time via SVIEWER_URL env var + DefinePlugin.
declare const __SVIEWER_URL__: string;
export const SVIEWER_BASE_URL: string = __SVIEWER_URL__;

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
