/* This code is mostly taken Leaflet.Terminator (available under
 * MIT license).

The MIT License (MIT)

Copyright (c) 2013 Joerg Dietrich <astro@joergdietrich.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

 */

/* Calculate the present UTC Julian Date. Function is valid after
 * the beginning of the UNIX epoch 1970-01-01 and ignores leap
 * seconds.
 */
function julian(date) {
  return (date / 86400000) + 2440587.5;
}

/* Calculate Greenwich Mean Sidereal Time according to 
 * http://aa.usno.navy.mil/faq/docs/GAST.php
 */
function GMST(julianDay) {
  let d = julianDay - 2451545.0;
  /* Low precision equation is good enough for our purposes. */
  return (18.697374558 + 24.06570982441908 * d) % 24;
}

const _R2D = 180 / Math.PI;
const _D2R = Math.PI / 180;

/* Compute the position of the Sun in ecliptic coordinates at julianDay.
 * Following http://en.wikipedia.org/wiki/Position_of_the_Sun
 */
function sunEclipticPosition (julianDay) {
  /* Days since start of J2000.0 */
  const n = julianDay - 2451545.0;
  /* mean longitude of the Sun */
  const L = (280.460 + 0.9856474 * n) % 360;
  /* mean anomaly of the Sun */
  const g = (357.528 + 0.9856003 * n) % 360;
  /* ecliptic longitude of Sun */
  const lambda = L + 1.915 * Math.sin(g * _D2R) + 0.02 * Math.sin(2 * g * _D2R);
  /* distance from Sun in AU */
  const R = 1.00014 - 0.01671 * Math.cos(g * _D2R) -
            0.0014 * Math.cos(2 * g * _D2R);

  return {lambda: lambda, R: R};
}

/* Following the short term expression in
 * http://en.wikipedia.org/wiki/Axial_tilt#Obliquity_of_the_ecliptic_.28Earth.27s_axial_tilt.29
 */
function eclipticObliquity (julianDay) {
  const n = julianDay - 2451545.0;
  /* Julian centuries since J2000.0 */
  const T = n / 36525;
  const epsilon = 23.43929111
                  - T * (46.836769 / 3600
                  - T * (0.0001831 / 3600
                  + T * (0.00200340 / 3600
                  - T * (0.576e-6 / 3600
                  - T * 4.34e-8 / 3600))));
  return epsilon;
}

/* Compute the Sun's equatorial position from its ecliptic
 * position. Inputs are expected in degrees. Outputs are in
 * degrees as well.
 */
function sunEquatorialPosition (julianDay) {
  const sunEclLng = sunEclipticPosition(julianDay).lambda;
  const eclObliq = eclipticObliquity(julianDay);

  let alpha = Math.atan(Math.cos(eclObliq * _D2R) *
                        Math.tan(sunEclLng * _D2R)) * _R2D;
  const delta = Math.asin(Math.sin(eclObliq * _D2R) *
                          Math.sin(sunEclLng * _D2R)) * _R2D;

  const lQuadrant = Math.floor(sunEclLng / 90) * 90;
  const raQuadrant = Math.floor(alpha / 90) * 90;
  alpha += lQuadrant - raQuadrant;

  return {alpha: alpha, delta: delta};
}

/* For a given hour angle and sun position, compute the
 * latitude of the terminator in degrees.
 */
function terminatorLatitude (lng, gst, sunPos) {
  /* Compute the hour angle of the sun for a longitude on Earth */
  const lst = gst + lng / 15;
  const ha = lst * 15 - sunPos.alpha;
  
  const lat = Math.atan(-Math.cos(ha * _D2R) /
                        Math.tan(sunPos.delta * _D2R)) * _R2D;
  return lat;
}

export function __latLngInDark (latLng, gst, sunEqPos) {
  const termLat = terminatorLatitude(latLng.lng, gst, sunEqPos);

  if (sunEqPos.delta < 0) {
    return latLng.lat > termLat;
  } else {
    return latLng.lat < termLat;
  }
}

export function latLngInDark (latLng, time) {
  const julianDay = julian(time);
  const gst = GMST(julianDay);

  const sunEqPos = sunEquatorialPosition(julianDay);

  return __latLngInDark(latLng, gst, sunEqPos);
}
