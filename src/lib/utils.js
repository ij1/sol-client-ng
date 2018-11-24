import L from 'leaflet';

export function UTCToMsec(dateString) {
  const regex = new RegExp(/^(\d{4})\/([01]\d)\/([0-3]\d) ([012]\d):([0-5]\d):([0-5]\d)/);

  const s = regex.exec(dateString);
  const ms = Date.UTC(s[1], parseInt(s[2])-1, s[3], s[4], s[5], s[6]);

  if (isNaN(ms)) {
    return null;
  }
  const d = new Date(ms);
  const check = [d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate(),
                 d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
  for (let i = 0; i < check.length; i++) {
    if (check[i] !== parseInt(s[i+1])) {
      return null;
    }
  }

  return ms;
}

export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

export function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function latLngAddOffset(latLng, offset) {
  return L.latLng(latLng.lat, latLng.lng + offset);
}

export function latLngBoundsAddOffset(latLngBounds, offset) {
  return L.latLngBounds(latLngAddOffset(latLngBounds.getSouthWest(), offset),
                        latLngAddOffset(latLngBounds.getNorthEast(), offset));

}

/* Calculates the factor for interpolating the intermediate point from
 * a range between start and end.
 */
export function interpolateFactor(startPoint, intermediatePoint, endPoint) {
  const factor = (intermediatePoint - startPoint) / (endPoint - startPoint);

  if (factor < 0 || factor > 1.0) {
    console.log("Invalid factor: " + factor);
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
