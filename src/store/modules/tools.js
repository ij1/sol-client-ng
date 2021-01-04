import L from 'leaflet';
import { hToMsec, secToMsec, degToRad } from '../../lib/utils.js';
import { cogPredictor, twaPredictor } from '../../lib/predictors.js';
import { lowPrioTask } from '../../lib/lowprio.js';

export default {
  namespaced: true,
  state: {
    isochrones: [],
    isochroneId: 0,
    isochroneCalculating: null,
    isochroneAngleStep: 2,
    isochroneTimeStep: 1,
    isochroneTimeLen: 24,
  },

  mutations: {
    clearIsochrones(state, type) {
      state.isochrones = state.isochrones.filter(i => (i.type !== type));
    },
    addIsochrone(state, isochrone) {
      isochrone.id = state.isochroneId;
      state.isochroneId++;

      state.isochrones.push(isochrone);
    },
    isochroneCalculationState(state, type) {
      state.isochroneCalculating = type;
    },
    isochroneLen(state, len) {
      state.isochroneTimeLen = len;
    },
    isochroneStep(state, step) {
      state.isochroneTimeStep = step;
    },
  },
  actions: {
    async calculateIsochrone ({state, rootGetters, rootState, commit}, type) {
      if (state.isochroneCalculating !== null) {
        return;
      }
      commit('isochroneCalculationState', type);
      commit('clearIsochrones', type);

      const timeStep = hToMsec(state.isochroneTimeStep);
      const timeLen = hToMsec(state.isochroneTimeLen);

      let startTime = !rootGetters['race/isTowbackPeriod'] ?
                      rootGetters['boat/time'] :
                      rootState.race.info.startTime;

      let predState = {
        perf: 1,
        firstStep: 1,
        timeDelta: secToMsec(60),
      };

      let prev = null;
      let lastLatLng;

      for (let time = timeStep; time <= timeLen; time += timeStep) {
        let isochrone = {
          type: type,
          color: type === 'cog' ? 'orange' : 'cyan',
          line: [],
        };

        let idx = 0;
        while (true) {
          let angle = idx * state.isochroneAngleStep;
          if (angle >= 360) {
            break;
          }

          if (prev !== null) {
            lastLatLng = prev.line[idx];
          } else {
            lastLatLng = rootGetters['boat/visualPosition'];
          }
          let pred = {
            time: startTime,
            firstLatLng: lastLatLng,
            latLngs: [lastLatLng],
          };
          if (type === 'cog') {
            cogPredictor(pred, degToRad(angle),
                         startTime, startTime + timeStep,
                         predState, rootGetters);
          } else if (type === 'twa') {
            const twa = angle - 180
            twaPredictor(pred, degToRad(twa),
                       startTime, startTime + timeStep,
                       predState, rootGetters);
          }
          let latLng = pred.latLngs[pred.latLngs.length - 1];
          /* Reactivate reactiviness */
          latLng = L.latLng(latLng.lat, latLng.lng);
          isochrone.line.push(latLng);
          idx++;
        }
        commit('addIsochrone', isochrone);

        prev = isochrone;
        startTime += timeStep;

        await lowPrioTask.idle();
      }
      commit('isochroneCalculationState', null);
    },
  },
}
