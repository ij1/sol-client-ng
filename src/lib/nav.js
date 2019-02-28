import { degToRad } from './utils.js';

/* Returns the minimum angle (signed) from currentAngle to nextAngle
 * The angles are in radians.
 */
export function minTurnAngle(currentAngle, nextAngle) {
  const pi2 = Math.PI * 2;
  return ((((nextAngle - currentAngle + Math.PI) % pi2) + pi2) % pi2) - Math.PI;
}

/* Calculates the component towards bearing from a speed towards heading.
 * Heading and bearing are in radians.
 */
export function speedTowardsBearing(speed, heading, bearing) {
  return speed * Math.cos(minTurnAngle(heading, bearing));
}

/* By default, atan2 takes illogically y, x (in reversed order compared with
 * the usual non-programmer notation) and returns mathematical angle that
 * goes from E CCW.
 *
 * This function provides easier interface for translating x, y into bearing
 * CW from 0 (North) up to 2 * PI.
 *
 * The input y direction is from up to down as with screen coordinates.
 */
export function atan2Bearing(x, y) {
  /* Trap undefined to 0 bearing to avoid need to check for it everywhere */
  if (x === 0 && y === 0) {
    return 0;
  }
  /* The arguments are reversed and negated from (y, x) on purpose */
  return Math.atan2(-x, y) + Math.PI;
}

export function isCcValid(cc) {
  const regex = /^\d{1,3}(\.\d{1,3})?$/;
  if (!regex.test(cc)) {
    return false;
  }
  const num = Number(cc);
  if (num < 0 || num > 360) {
    return false;
  }
  return true;
}

export function isTwaValid(twa) {
  const regex = /^[-+]\d{1,3}(\.\d{1,3})?$/;
  if (!regex.test(twa)) {
    const zero = /^0{1,3}(\.0{1,3})?$/;
    return zero.test(twa);
  }
  const num = Number(twa);
  if (num < -180 || num > 180) {
    return false;
  }
  return true;
}

export function cogTwdToTwa(cog, twd) {
  return minTurnAngle(cog, twd);
}

export function twaTwdToCog(twa, twd) {
  let diff = twd - twa;
  if (diff < 0) {
    diff += Math.PI * 2;
  } else if (diff >= Math.PI * 2) {
    diff -= Math.PI * 2;
  }
  return diff;
}

export function twaTextPrefix (value) {
  return (value > 0 ? '+' : '');
}

export function dcTwaTextPrefix (dc) {
  return (dc.type === 'twa') ? twaTextPrefix(dc.value) : '';
}

/*
 * Distance formula from:
 *  https://en.wikipedia.org/wiki/Great-circle_distance
 */
export function gcCalc(from, to) {
  const lat1 = degToRad(from.lat);
  const lat2 = degToRad(to.lat);
  const lng1 = degToRad(from.lng);
  const lng2 = degToRad(to.lng);
  const dlng = lng2 - lng1;

  const slat1 = Math.sin(lat1);
  const slat2 = Math.sin(lat2);
  const clat1 = Math.cos(lat1);
  const clat2 = Math.cos(lat2);
  const cdlng = Math.cos(dlng);

  /* These can be reused for distance calculations using Vincenty formula */
  const bearingDividend = clat2 * Math.sin(dlng);
  const bearingDivisor = clat1 * slat2 - slat1 * clat2 * cdlng;

  const distDividend = bearingDividend * bearingDividend +
                       bearingDivisor * bearingDivisor;
  const distDivisor = slat1 * slat2 + clat1 * clat2 * cdlng;

  return {
    startBearing: (Math.atan2(bearingDividend, bearingDivisor) +
                   Math.PI * 2) % (Math.PI * 2),
    distance: Math.atan2(Math.sqrt(distDividend), distDivisor),
  };
}
