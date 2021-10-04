<template>
  <l-layer-group v-if="inDefaultUiMode">
     <l-circle-marker
       v-for = "command in commands"
       :key = "command.id"
       :lat-lng = "command.latLng"
       :radius = "cfgDcMarkerSize"
       :color = "command.id === selected ? '#ff3f3f' : '#3f3fff'"
       :weight = "1.5"
       :fill-color = "command.id === selected ? '#ff3f3f' : '#cfcfff'"
       :fill-opacity = "0.2"
       :fill = "true"
       :bubbling-mouse-events = "false"
       @click = "selectDC(command.id)"
     />
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LCircleMarker } from 'vue2-leaflet';
import { predictorData } from '../../store/modules/steering.js';

export default {
  name: 'DcMarkers',
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle-marker': LCircleMarker,
  },
  computed: {
    commands () {
      if (!this.cfgPredictorDcs || !this.dcMarkerVisibility ||
          (this.cfgDcMarkerSize <= this.cfgDcMarkerOffSize)) {
        return [];
      }
      this.predictorStamp;
      const dcList = this.$store.state.boat.steering.dcs.list;
      const pred = predictorData['dcPred'];

      let res = [];
      for (let dcIdx = 0; dcIdx < dcList.length; dcIdx++) {
        const dc = dcList[dcIdx];
        const idx = pred.dcAt[dc.id];

        if (typeof idx !== 'undefined') {
          res.push({
            id: dc.id,
            latLng: pred.latLngs[idx],
            commandData: dc,
          });
        }
      }
      return res;
    },
    ...mapState({
      cfgPredictorDcs: state => state.boat.steering.cfg.predictorDcs.value,
      cfgDcMarkerSize: state => state.boat.steering.cfg.dcMarkerSize.value,
      cfgDcMarkerOffSize: state => state.boat.steering.cfg.dcMarkerSize.low,
      dcMarkerVisibility: state => state.boat.steering.dcs.markerVisibility,
      predictorStamp: state => state.boat.steering.predictorStamp,
      selected: state => state.boat.steering.dcs.selected,
    }),
    ...mapGetters({
      inDefaultUiMode: 'ui/inDefaultUiMode',
    }),
  },
  methods: {
    selectDC(dcId) {
      if (!this.inDefaultUiMode) {
        return;
      }
      /* Make sure DC still exists */
      const dcList = this.$store.state.boat.steering.dcs.list;
      for (let dc of dcList) {
        if (dc.id === dcId) {
          this.$store.commit('boat/steering/selectDC', dcId);
          this.$store.commit('ui/setActiveTab', 1);
          break;
        }
      }
    },
  },
}
</script>
