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
