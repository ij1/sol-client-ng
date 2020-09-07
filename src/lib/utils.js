import L from 'leaflet';
import { store } from '../store/index.js';

export const MONTHS_TXT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function UTCToMsec(dateString) {
  const regex = /^(\d{4})\/([01]\d)\/([0-3]\d) ([012]\d):([0-5]\d):([0-5]\d)(\.(\d{3})\d{3})?/;

  const s = regex.exec(dateString);
  if (s === null) {
    return null;
  }
  if (typeof s[7] === 'undefined') {
    s[8] = 0;
  }
  s[7] = 0;
  const ms = Date.UTC(s[1], parseInt(s[2])-1, s[3], s[4], s[5], s[6], s[8]);

  if (isNaN(ms)) {
    return null;
  }
  const d = new Date(ms);
  const check = [d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate(),
                 d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),
                 s[7],
                 d.getUTCMilliseconds()];
  for (let i = 0; i < check.length; i++) {
    if (check[i] !== parseInt(s[i+1])) {
      return null;
    }
  }

  return ms;
}

export function msecToUTCTimeString (msec) {
  const d = new Date(msec);
  return ('00' + d.getUTCHours()).slice(-2) + ':' +
         ('00' + d.getUTCMinutes()).slice(-2) + ':' +
         ('00' + d.getUTCSeconds()).slice(-2);
}

export function msecToUTCHourMinString (msec) {
  const d = new Date(msec);
  return ('00' + d.getUTCHours()).slice(-2) + ':' +
         ('00' + d.getUTCMinutes()).slice(-2);
}

export function msecToUTCDateString (msec) {
  const d = new Date(msec);
  return d.getUTCFullYear() + '/' +
         ('00' + (d.getUTCMonth() + 1)).slice(-2) + '/' +
         ('00' + d.getUTCDate()).slice(-2);
}

export function msecToUTCDateWithoutYearString (msec) {
  const d = new Date(msec);
  return ('00' + (d.getUTCMonth() + 1)).slice(-2) + '/' +
         ('00' + d.getUTCDate()).slice(-2);
}

export function msecToUTCString (msec) {
  return msecToUTCDateString(msec) + ' ' + msecToUTCTimeString(msec);
}

export function daysToMsec (value) {
  return value * 24 * 3600 * 1000;
}
export function hToMsec (value) {
  return value * 3600 * 1000;
}
export function minToMsec (value) {
  return value * 60 * 1000;
}
export function secToMsec (value) {
  return value * 1000;
}
export function msecToDays (value) {
  return value / (24 * 3600 * 1000);
}
export function msecToH (value) {
  return value / (3600 * 1000);
}
export function msecToMin (value) {
  return value / (60 * 1000);
}
export function msecToSec (value) {
  return value / 1000;
}

export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

export function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function latLngAddOffset(latLng, offset) {
  if (offset === 0) {
    return latLng;
  }
  return L.latLng(latLng.lat, latLng.lng + offset);
}

export function latLngArrayAddOffset(latLngArray, offset) {
  if (offset === 0) {
    return latLngArray;
  }
  let res = [];
  for (let i = 0; i < latLngArray.length; i++) {
    res.push(L.latLng(latLngArray[i].lat, latLngArray[i].lng + offset));
  }
  return res;
}

export function latLngBoundsAddOffset(latLngBounds, offset) {
  if (offset === 0) {
    return latLngBounds;
  }
  return L.latLngBounds(latLngAddOffset(latLngBounds.getSouthWest(), offset),
                        latLngAddOffset(latLngBounds.getNorthEast(), offset));

}

export function tripleBounds (map, size) {
  return L.latLngBounds(
    map.containerPointToLatLng(L.point(-size.x, -size.y)),
    map.containerPointToLatLng(L.point(size.x * 2, size.y * 2))
  );
}

/* Calculates the factor for interpolating the intermediate point from
 * a range between start and end.
 */
export function interpolateFactor(startPoint, intermediatePoint, endPoint) {
  const factor = (intermediatePoint - startPoint) / (endPoint - startPoint);

  if (factor < 0 || factor > 1.0) {
    store.dispatch(
      'diagnostics/add',
      "WARNING: Invalid factor: " + factor
    );
  }

  return factor;
}

export function linearInterpolate(factor, startData, endData) {
  return startData + factor * (endData - startData);
}

/* Binary search 'needle' (or it's "insertion point") from a sorted
 * 'haystack'.
 *
 * Returns: the index of leftmost item matching needle or if 'needle'
 * does not exist in the array, the first index that is has a value
 * larger than the 'needle' (that is, the "insertion point" for 'needle').
 */
export function bsearchLeft(haystack, needle, min, max) {
  if (typeof min === 'undefined') {
    min = 0;
  }
  if (typeof max === 'undefined') {
    max = haystack.length;
  }

  while (min < max) {
    const mid = Math.floor((max + min) / 2);

    if (needle > haystack[mid]) {
      min = mid + 1;
    } else {
      max = mid;
    }
  }
  return max;
}
