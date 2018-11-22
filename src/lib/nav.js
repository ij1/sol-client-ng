/* Returns the minimum angle (signed) from currentAngle to nextAngle
 * The angles are in radians.
 */
export function minTurnAngle(nextAngle, currentAngle) {
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
  /* The arguments are reversed and negated from (y, x) on purpose */
  return Math.atan2(-x, -y) + Math.PI;
}
