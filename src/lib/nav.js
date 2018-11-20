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
