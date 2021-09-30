import L from 'leaflet';
import { degToRad } from './utils.js';
import { cogTwdToTwa, twaTwdToCog } from './nav.js';
import { PERF_RECOVERY_MULT } from './sol.js';
import { latLngWind } from '../store/modules/weather.js';
import { getSpeed } from '../store/modules/polar.js';

export function cogPredictor (pred, cog, t, endTime, state) {
  /* m/s -> nm -> deg (in deg) */
  const moveDelta = (state.timeDelta / 1000 / 3600) / 60;
  let lastLatLng = pred.latLngs[pred.latLngs.length - 1];

  while (t < endTime) {
    const wind = latLngWind(lastLatLng, t);
    if (wind === null) {
      return null;
    }
    const twa = cogTwdToTwa(cog, wind.twd);
    const speed = getSpeed(wind.ms, twa) * state.perf * state.firstStep;
    state.firstStep = 1;

    const lonScaling = Math.abs(Math.cos(degToRad(lastLatLng.lat)));
    const dlon = moveDelta * speed * Math.sin(cog) / lonScaling;
    const dlat = moveDelta * speed * Math.cos(cog);

    lastLatLng = L.latLng(lastLatLng.lat + dlat,
                          lastLatLng.lng + dlon);
    t += state.timeDelta;
    state.perf = Math.min(state.perf +
                          PERF_RECOVERY_MULT * state.timeDelta / Math.abs(speed),
                          1.0);

    pred.latLngs.push(Object.freeze(lastLatLng));
    pred.times.push(t);
    pred.perf.push(state.perf);
  }

  return t;
}

export function twaPredictor (pred, twa, t, endTime, state) {
  /* m/s -> nm -> deg (in deg) */
  const moveDelta = (state.timeDelta / 1000 / 3600) / 60;
  let lastLatLng = pred.latLngs[pred.latLngs.length - 1];

  while (t < endTime) {
    const wind = latLngWind(lastLatLng, t);
    if (wind === null) {
      return null;
    }
    const speed = getSpeed(wind.ms, twa) * state.perf * state.firstStep;
    state.firstStep = 1;

    const course = twaTwdToCog(twa, wind.twd);
    const lonScaling = Math.abs(Math.cos(degToRad(lastLatLng.lat)));
    const dlon = moveDelta * speed * Math.sin(course) / lonScaling;
    const dlat = moveDelta * speed * Math.cos(course);

    lastLatLng = L.latLng(lastLatLng.lat + dlat,
                          lastLatLng.lng + dlon);
    t += state.timeDelta;
    state.perf = Math.min(state.perf +
                          PERF_RECOVERY_MULT * state.timeDelta / Math.abs(speed),
                          1.0);

    pred.latLngs.push(Object.freeze(lastLatLng));
    pred.times.push(t);
    pred.perf.push(state.perf);
  }

  return t;
}
