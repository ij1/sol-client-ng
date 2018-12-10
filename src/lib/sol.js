import L from 'leaflet';
import { atan2Bearing } from './nav.js';

export const MS_TO_KNT = 3600 / 1852;
export const PROJECTION = L.CRS.EPSG3395;

export function UVToWind(uv) {
  /* u,v are negated because u,v points "to", whereas TWD is wind "from" */
  let twd = atan2Bearing(-uv[0], -uv[1]);
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
  if (knots > 70) {
    const v = (1 - colorGradient(knots, 70, 90)) * 255;
    r = v;
    b = v;
  }
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
