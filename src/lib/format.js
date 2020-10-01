import { roundToFixed } from './quirks.js';

export function formatCoordinate (value, hemispheres,
                                  precision, coordinateFormat) {
  const noDegSymbol = coordinateFormat === 'signdegnosym';
  const signToHemisphere = !coordinateFormat.startsWith('sign');
  const absValue = Math.abs(value);
  let text;

  if (coordinateFormat === 'degmin') {
    let degs = Math.floor(absValue);
    /* CHECKME: Precision approximation by subtracting -2 ok? */
    let minutes = roundToFixed((absValue - degs) * 60, precision - 2);
    if (minutes.startsWith('60')) {
      degs += 1;
      minutes = roundToFixed(0, precision - 2);
    }
    text = degs + '\xb0' + minutes + "'";
  } else {
    text = roundToFixed(absValue, precision) + (noDegSymbol ? '' : '\xb0');
  }

  if (signToHemisphere) {
    text = text + hemispheres[value < 0 ? 0 : 1];
  } else if (value < 0) {
    text = '-' + text;
  }

  return text;
}
