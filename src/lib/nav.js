import { minAngle } from './utils.js';

/* Calculates the component towards bearing from a speed towards heading.
 * Heading and bearing are in radians.
 */
export function speedTowardsBearing(speed, heading, bearing) {
  return speed * Math.cos(minAngle(heading, bearing));
}
