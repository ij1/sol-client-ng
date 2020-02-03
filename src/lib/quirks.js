import L from 'leaflet';

export function roundToFixed(val, precision) {
  /*
   * Catch very small, scientific notations the e-based formula below
   * cannot handle. Just round those numbers directly to zero.
   */
  if (Math.abs(val) < Math.pow(10, -precision) / 2) {
    val = 0.0;
  }
  return (+(Math.round(+(val + 'e' + precision)) + 'e' + -precision)).toFixed(precision);
}

export const canvasAlignToPixelValue = 0.5;

/* In HTML5 canvas, the origo is at pixel edge rather than in the center
 * of it. Thus half-pixel translate is needed (at least with Firefox) to
 * draw aligned to pixels.
 */
export function canvasAlignToPixelCenter(ctx) {
  ctx.translate(canvasAlignToPixelValue, canvasAlignToPixelValue);
}

export function leafletIconQuirk () {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
  });
}
