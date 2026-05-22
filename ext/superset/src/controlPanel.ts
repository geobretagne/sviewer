import { ControlPanelConfig } from '@superset-ui/chart-controls';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: 'Query',
      expanded: true,
      controlSetRows: [
        ['adhoc_filters'],
        ['row_limit', null],
      ],
    },
    {
      label: 'sViewer',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'sviewer_url',
            config: {
              type: 'TextControl',
              label: 'sViewer URL',
              description: 'Base URL of your sViewer instance (e.g. https://my-server/sviewer/)',
              default: '',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'wms_layer',
            config: {
              type: 'TextControl',
              label: 'WMS layer (optional)',
              description: 'Layer name, e.g. namespace:layername',
              default: '',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'wms_url',
            config: {
              type: 'TextControl',
              label: 'WMS service URL (optional)',
              description: 'Leave empty for default instance',
              default: '',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'basemap',
            config: {
              type: 'TextControl',
              label: 'Basemap (lb=)',
              description: 'Basemap key configured in sViewer customConfig',
              default: '',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'theme',
            config: {
              type: 'SelectControl',
              label: 'Theme',
              default: '',
              renderTrigger: true,
              choices: [
                ['', 'Auto'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ],
            },
          },
        ],
      ],
    },
    {
      label: 'Data',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'geom_mode',
            config: {
              type: 'SelectControl',
              label: 'Geometry mode',
              default: 'geojson',
              renderTrigger: false,
              choices: [
                ['geojson', 'GeoJSON column'],
                ['latlon', 'Latitude / Longitude columns'],
              ],
              description: 'How geometry is stored in the dataset',
            },
          },
        ],
        [
          {
            name: 'geom_col',
            config: {
              type: 'TextControl',
              label: 'GeoJSON column',
              description: 'Column containing GeoJSON geometry string (ST_AsGeoJSON output)',
              default: 'geojson',
              renderTrigger: false,
            },
          },
        ],
        [
          {
            name: 'lat_col',
            config: {
              type: 'TextControl',
              label: 'Latitude column',
              description: 'Column containing latitude (EPSG:4326)',
              default: 'lat',
              renderTrigger: false,
            },
          },
        ],
        [
          {
            name: 'lon_col',
            config: {
              type: 'TextControl',
              label: 'Longitude column',
              description: 'Column containing longitude (EPSG:4326)',
              default: 'lon',
              renderTrigger: false,
            },
          },
        ],
        [
          {
            name: 'label_col',
            config: {
              type: 'TextControl',
              label: 'Label column (optional)',
              description: 'Column shown as feature label on map',
              default: '',
              renderTrigger: false,
            },
          },
        ],
        [
          {
            name: 'id_col',
            config: {
              type: 'TextControl',
              label: 'ID column (cross-filter)',
              description: 'Column used for cross-filtering on feature click. Leave empty to disable.',
              default: '',
              renderTrigger: false,
            },
          },
        ],
      ],
    },
  ],
  controlOverrides: {
    row_limit: {
      default: 2000,
    },
  },
};

export default config;
