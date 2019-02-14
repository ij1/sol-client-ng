/* Returns the minimum angle (signed) from currentAngle to nextAngle
 * The angles are in radians.
 */
export function minTurnAngle(currentAngle, nextAngle) {
  /* PI * 3 ensures a positive number for the modulo */
  return (nextAngle - currentAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
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
  return Math.atan2(-x, -y) + Math.PI;
}

export function isCcValid(cc) {
  const regex = new RegExp(/^\d{1,3}(\.\d{1,3})?$/);
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
  const regex = new RegExp(/^[-+]\d{1,3}(\.\d{1,3})?$/);
  if (!regex.test(twa)) {
    const zero = new RegExp(/^0{1,3}(\.0{1,3})?$/);
    return zero.test(twa);
  }
  const num = Number(twa);
  if (num < -180 || num > 180) {
    return false;
  }
  return true;
}

export function cogTwdToTwa(cog, twd) {
  let diff = twd - cog;
  if (diff > Math.PI) {
    diff -= Math.PI * 2;
  } else if (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return diff;
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

export function twaTextPrefix (dc) {
  return ((dc.type === 'twa') && (dc.value > 0)) ? '+' : '';
}
