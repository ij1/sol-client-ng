export const MS_TO_KNT = 3600 / 1852;

export function UVToWind(uv) {
  let twd = -Math.atan2(uv[1], uv[0]) - Math.PI / 2;
  if (twd < 0) {
    twd += Math.PI * 2;
  }
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
