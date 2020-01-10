import { radToDeg } from './utils.js';
import { roundToFixed } from './quirks.js';

export function windToText (wind) {
  if (wind === null) {
    return '';
  }
  return roundToFixed(wind.knots, 2) + 'kn @' +
         roundToFixed(radToDeg(wind.twd), 2) + '\xb0';
}
