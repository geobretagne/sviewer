import { ControlPanelConfig, ControlStateMapping } from '@superset-ui/chart-controls';

function columnChoices(state: ControlStateMapping) {
  const cols = (state?.datasource as { columns?: { column_name: string; verbose_name?: string }[] })?.columns;
  return (cols || []).map(c => [c.column_name, c.verbose_name || c.column_name]);
}

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: 'Requête',
      expanded: true,
      controlSetRows: [
        ['adhoc_filters'],
        ['orderby', 'order_desc'],
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
              label: 'URL sViewer',
              description: "URL de base de votre instance sViewer (ex. https://mon-serveur/sviewer/)",
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
              label: 'Donnée WMS (optionnel)',
              description: 'Nom de la donnée, ex. namespace:nomcouche',
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
              label: 'URL du service WMS (optionnel)',
              description: "Laisser vide pour l'instance par défaut",
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
              label: 'Fond de carte (lb=)',
              description: 'Clé de fond de carte configurée dans le customConfig sViewer',
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
              label: 'Thème',
              default: '',
              renderTrigger: true,
              choices: [
                ['', 'Auto'],
                ['light', 'Clair'],
                ['dark', 'Sombre'],
              ],
            },
          },
        ],
        [
          {
            name: 'feature_color',
            config: {
              type: 'ColorPickerControl',
              label: 'Couleur des données',
              description: 'Couleur appliquée à toutes les géométries',
              default: { r: 0, g: 119, b: 187, a: 1 },
              renderTrigger: false,
            },
          },
        ],
      ],
    },
    {
      label: 'Données',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'geom_mode',
            config: {
              type: 'SelectControl',
              label: 'Mode géométrie',
              default: 'geojson',
              renderTrigger: false,
              choices: [
                ['geojson', 'Colonne GeoJSON'],
                ['latlon', 'Colonnes Latitude / Longitude'],
              ],
              description: 'Comment la géométrie est stockée dans le jeu de données',
            },
          },
        ],
        [
          {
            name: 'geom_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne GeoJSON',
              description: 'Colonne contenant la géométrie GeoJSON (sortie ST_AsGeoJSON)',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlStateMapping) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'lat_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne latitude',
              description: 'Colonne contenant la latitude (EPSG:4326)',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlStateMapping) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'lon_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne longitude',
              description: 'Colonne contenant la longitude (EPSG:4326)',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlStateMapping) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'label_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne libellé (optionnel)',
              description: 'Colonne affichée comme libellé sur la carte',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlStateMapping) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'id_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne ID (filtre croisé)',
              description: 'Colonne utilisée pour le filtre croisé au clic. Laisser vide pour désactiver.',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlStateMapping) => ({ choices: columnChoices(state) }),
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
