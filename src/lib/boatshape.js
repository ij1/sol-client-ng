import { degToRad } from './utils.js';

function boatPathPos(x, y, scale) {
  return (x * scale) + " " + (y * scale);
}

export function boatPath (scale) {
  return 'M ' + boatPathPos(-3, 11, scale) +
    'C ' + boatPathPos(-5, 7, scale) + ',' + boatPathPos(-6, -1, scale) + ',' + boatPathPos(0, -13, scale) +
    'C ' + boatPathPos(6, -1, scale) + ',' + boatPathPos(5, 7, scale) + ',' + boatPathPos(3, 11, scale) +
    'Z';
}

export function sailPath (sailAngle, scale) {
  const curvePar = Math.sign(sailAngle) * -3 * scale;
  return 'M 0 0 ' +
    'C ' + curvePar + ' ' + (5 * scale) +
    ', ' + curvePar + ' ' + (12 * scale) +
    ', 0 ' + (17 * scale);
}

/* FIXME:
 * perhaps some AWA based calculation could result in a better angle
 * maxvmg angle should be consider especially for headwind
 */
export function sailAngle (twa) {
  return twa / degToRad(180 / 75);
}
