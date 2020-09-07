import L from 'leaflet';
import { atan2Bearing } from './nav.js';

export const publicPath = process.env.BASE_URL;

export const MS_TO_KNT = 3600 / 1852;
export const EARTH_R = 6378137;
export const EARTH_CIRCUMFENCE = 40075017;
export const PROJECTION = L.CRS.EPSG3857;
export const OLD_CLIENT_MAXZOOM = 16.8;
export const OLD_CLIENT_MAXZOOM_ACCURATE = 16.8342;

export const PERF_RECOVERY_MULT = 3.0 / (20 * 1000 * 100.0);

export const PR_MARK_BOAT = 'Practice_Mark_';

export const darkSeaColor = '#00004f';
export const DARK_SEA_BLUE = 79;

export const SERVER_TICK_SAFETY_SECS = 15;

/* Returns true if the boat is ok to draw / control */
export function solBoatPolicy(boatname, rootGetters) {
  if (boatname === 'guest') {
    return false;
  }
  if ((boatname === 'sol') || boatname.startsWith(PR_MARK_BOAT)) {
    return rootGetters['race/isPracticePeriod'];
  }
  return true;

}

export function ownBoatVisibleFilter(store, commandBoat) {
  const ownBoatId = store.state.boat.id;

  if (commandBoat) {
    return true;
  }

  const cfgFleetBoatMode = store.state.map.cfg.fleetBoatMode.value;
  if (cfgFleetBoatMode === 'off') {
    return false;
  }
  if (cfgFleetBoatMode === 'select' &&
      !store.getters['race/fleet/selectedFiltered'].hasOwnProperty('' + ownBoatId)) {
    return false;
  }
  return true;
}

export function UVToWind(uv) {
  /* u,v are negated because u,v points "to", whereas TWD is wind "from" */
  let twd = atan2Bearing(-uv[0], uv[1]);
  const tws = Math.hypot(uv[0], uv[1]);
  
  return {
    twd: twd,
    knots: tws * MS_TO_KNT,
    ms: tws,
  };
}

function colorGradient (knots, min, max) {
  return Math.min(Math.max((knots - min) / (max - min), 0), 1);
}

export function windToColor(knots) {
  const r1 = colorGradient(knots, 10, 15) * 102 +
             colorGradient(knots, 15, 20) * (255 - 102);
  const g1 = colorGradient(knots, 0, 9) * 183 +
             colorGradient(knots, 9, 12) * (255 - 183);
  const b1 = (1 - colorGradient(knots, 7.5, 20)) * 255;
  const r2 = (1 - colorGradient(knots, 30, 70)) * 255;
  const g2 = (1 - colorGradient(knots, 17.5, 30)) * 255;
  const b2 = colorGradient(knots, 30, 50) * 255;
  let r = Math.max(r1 + r2 - 255, 0);
  let g = Math.max(g1 + g2 - 255, 0);
  let b = b1 + b2;
  if (knots > 60) {
    const v = (1 - colorGradient(knots, 60, 90)) * 255;
    b = v;
  }
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
