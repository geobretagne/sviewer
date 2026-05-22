import { ControlPanelConfig, ControlPanelState } from '@superset-ui/chart-controls';

function columnChoices(state: ControlPanelState) {
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
        [
          {
            name: 'sort_col',
            config: {
              type: 'SelectControl',
              label: 'Trier par',
              description: 'Colonne de tri (appliqué avant la limite de lignes)',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
            },
          },
          {
            name: 'sort_desc',
            config: {
              type: 'CheckboxControl',
              label: 'Décroissant',
              default: true,
              renderTrigger: false,
            },
          },
        ],
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
              label: 'URL de l\'instance sViewer',
              description: 'URL de base de votre instance sViewer, avec slash final (ex. https://mon-serveur/sviewer/)',
              placeholder: 'https://mon-serveur/sviewer/',
              default: '',
              renderTrigger: false,
            },
          },
        ],
        [
          {
            name: 'auto_zoom',
            config: {
              type: 'CheckboxControl',
              label: 'Zoom automatique sur les données',
              description: 'Coché : recadre la carte à chaque mise à jour des données (utile pour les filtres). Non coché : recadre uniquement au premier chargement.',
              default: false,
              renderTrigger: false,
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
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
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
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
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
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
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
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'size_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne taille (symboles proportionnels)',
              description: 'Colonne numérique utilisée pour calculer la taille des symboles',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'size_mode',
            config: {
              type: 'SelectControl',
              label: 'Mode de calcul de la taille',
              description: 'Méthode de normalisation valeur → rayon',
              default: 'sqrt',
              renderTrigger: false,
              choices: [
                ['sqrt', 'Racine carrée (défaut)'],
                ['linear', 'Linéaire'],
                ['log', 'Logarithmique'],
                ['quantile', 'Quantile'],
                ['jenks', 'Jenks (coupures naturelles)'],
                ['rank', 'Rang (continu)'],
              ],
            },
          },
        ],
        [
          {
            name: 'color_ramp_col',
            config: {
              type: 'SelectControl',
              label: 'Colonne rampe de couleurs (optionnel)',
              description: 'Colonne numérique pour la couleur graduée — remplace la couleur fixe',
              default: null,
              renderTrigger: false,
              clearable: true,
              mapStateToProps: (state: ControlPanelState) => ({ choices: columnChoices(state) }),
            },
          },
        ],
        [
          {
            name: 'color_ramp_mode',
            config: {
              type: 'SelectControl',
              label: 'Mode de normalisation (rampe)',
              description: 'Méthode de normalisation valeur → couleur',
              default: 'sqrt',
              renderTrigger: false,
              choices: [
                ['sqrt', 'Racine carrée (défaut)'],
                ['linear', 'Linéaire'],
                ['log', 'Logarithmique'],
                ['quantile', 'Quantile'],
                ['jenks', 'Jenks (coupures naturelles)'],
                ['rank', 'Rang (continu)'],
              ],
            },
          },
        ],
        [
          {
            name: 'color_ramp_low',
            config: {
              type: 'ColorPickerControl',
              label: 'Couleur basse (rampe)',
              description: 'Couleur pour les valeurs les plus faibles',
              default: { r: 255, g: 255, b: 204, a: 1 },
              renderTrigger: false,
            },
          },
          {
            name: 'color_ramp_high',
            config: {
              type: 'ColorPickerControl',
              label: 'Couleur haute (rampe)',
              description: 'Couleur pour les valeurs les plus élevées',
              default: { r: 0, g: 90, b: 50, a: 1 },
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
