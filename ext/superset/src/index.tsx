import { ChartPlugin, ChartMetadata, Behavior, addLocaleData } from '@superset-ui/core';
import SviewerChart from './SviewerChart';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import buildQuery from './buildQuery';
import translations from './i18n';

addLocaleData(translations);

const CHART_TYPE = 'sviewer_map';

class SviewerChartPlugin extends ChartPlugin {
  constructor() {
    super({
      metadata: new ChartMetadata({
        name: 'sViewer Map',
        description: 'Interactive map viewer — WMS, GeoJSON, OGC',
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
