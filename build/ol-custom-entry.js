/**
 * Custom OpenLayers entry point
 * Exports only the modules used by sViewer to enable tree-shaking
 * Preserves the ol.* namespace hierarchy required by customConfig.js and sviewer.js
 */

// Import core components
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';

// Import layers
import Tile from 'ol/layer/Tile.js';
import Image from 'ol/layer/Image.js';
import Vector from 'ol/layer/Vector.js';

// Import sources
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import WMTS from 'ol/source/WMTS.js';
import XYZ from 'ol/source/XYZ.js';
import VectorSource from 'ol/source/Vector.js';

// Import geometry
import Feature from 'ol/Feature.js';
import CircleGeom from 'ol/geom/Circle.js';
import Point from 'ol/geom/Point.js';

// Import styles
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import CircleStyle from 'ol/style/Circle.js';

// Import projections (full module + proj4 submodule)
import * as proj from 'ol/proj.js';
import * as proj4 from 'ol/proj/proj4.js';

// Import formats
import GeoJSON from 'ol/format/GeoJSON.js';
import WMSCapabilities from 'ol/format/WMSCapabilities.js';

// Import utilities
import * as extent from 'ol/extent.js';
import * as events from 'ol/events.js';
import * as eventsCondition from 'ol/events/condition.js';
import * as tilegrid from 'ol/tilegrid.js';

// Import controls
import ScaleLine from 'ol/control/ScaleLine.js';
import Attribution from 'ol/control/Attribution.js';

// Import interactions
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom.js';
import DragPan from 'ol/interaction/DragPan.js';
import PinchZoom from 'ol/interaction/PinchZoom.js';
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom.js';
import KeyboardZoom from 'ol/interaction/KeyboardZoom.js';
import KeyboardPan from 'ol/interaction/KeyboardPan.js';
import * as interactionDefaults from 'ol/interaction/defaults.js';

// Build the ol namespace hierarchy to match OpenLayers' expected structure
window.ol = {
  Map,
  View,
  Overlay,
  layer: {
    Tile,
    Image,
    Vector,
  },
  source: {
    OSM,
    TileWMS,
    ImageWMS,
    WMTS,
    XYZ,
    Vector: VectorSource,
  },
  Feature,
  geom: {
    Circle: CircleGeom,
    Point,
  },
  style: {
    Style,
    Fill,
    Stroke,
    Circle: CircleStyle,
  },
  proj: {
    ...proj,
    proj4,
  },
  format: {
    GeoJSON,
    WMSCapabilities,
  },
  extent,
  events: {
    ...events,
    condition: eventsCondition,
  },
  tilegrid,
  control: {
    ScaleLine,
    Attribution,
  },
  interaction: {
    DoubleClickZoom,
    DragPan,
    PinchZoom,
    MouseWheelZoom,
    KeyboardZoom,
    KeyboardPan,
    defaults: interactionDefaults,
  },
};
