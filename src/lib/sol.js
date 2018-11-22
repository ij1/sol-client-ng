import { atan2Bearing } from './nav.js';

export const MS_TO_KNT = 3600 / 1852;

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

export function windToColor(/* wind */) {
  // FIXME: add colors
  return '#000000';
}
