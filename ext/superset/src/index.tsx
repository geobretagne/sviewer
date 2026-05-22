import { ChartPlugin, ChartMetadata, Behavior } from '@superset-ui/core';
import SviewerChart from './SviewerChart';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import buildQuery from './buildQuery';

const CHART_TYPE = 'sviewer_map';

class SviewerChartPlugin extends ChartPlugin {
  constructor() {
    super({
      metadata: new ChartMetadata({
        name: 'sViewer Map',
        description: 'Visualisation cartographique — WMS, GeoJSON, OGC',
        thumbnail: '',
        useLegacyApi: false,
        behaviors: [Behavior.InteractiveChart],
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
