<template>
  <l-layer-group>
    <sail-boat
      :lat-lng = "visualPosition"
      :scale = "-3"
      :color = "color"
      :course = "cog"
      :twa = "twa"
      :stroke-width = "1"
      :map = "map"
    />
    <l-polyline
      :lat-lngs = "steerLine"
      :color = "color"
      :weight = "1"
      :fill = "false"
    />
    <l-circle
      v-if = "hoverLatLng !== null"
      :lat-lng = "target"
      :color = "color"
      :radius = "0"
      :weight = "1"
      :fill = "false"
    >
      <l-tooltip :options = "tooltipOptions">
        <div id = "visual-steering-info">
          <div>COG: {{formatAngle(cog)}}</div>
          <div>TWA: {{formatAngle(twa)}}</div>
          <div>SOG: {{formatValue(sog)}}</div>
          <div>VMG: {{formatValue(vmg)}}</div>
          <div
            v-if = "cfgVmc"
          >
            VMC: {{formatValue(vmc)}}
          </div>
        </div>
      </l-tooltip>
    </l-circle>
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup, LCircle, LPolyline, LTooltip } from 'vue2-leaflet';
import { radToDeg, degToRad } from '../../../lib/utils.js';
import { roundToFixed } from '../../../lib/quirks.js';
import { speedTowardsBearing, cogTwdToTwa, loxoCalc, gcCalc, pixelDistanceCalc, twaTextPrefix } from '../../../lib/nav.js';
import { getSpeed } from '../../../store/modules/polar.js';
import SailBoat from '../sailboat.vue';
import { uiModeMixin } from '../../mixins/uimode.js';

export default {
  name: 'VisualSteering', 
  components: {
    'l-layer-group': LLayerGroup,
    'l-circle': LCircle,
    'l-polyline': LPolyline,
    'l-tooltip': LTooltip,
    'sail-boat': SailBoat,
  },
  mixins: [uiModeMixin],
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      minSteeringDistance: 3,
    }
  },
  computed: {
    target () {
      if ((this.hoverLatLng === null) ||
          (this.maxPixelDistance(this.hoverLatLng) < this.minSteeringDistance)) {
        return this.visualPosition;
      }
      return this.hoverLatLng;
    },
    steerLine () {
      return [this.visualPosition, this.target];
    },
    targetPath () {
      return loxoCalc(this.visualPosition, this.target);
    },
    cog () {
      return this.targetPath.startBearing;
    },
    twa () {
      return cogTwdToTwa(this.cog, this.twd);
    },
    sog () {
      return getSpeed(this.tws, this.twa);
    },
    vmg () {
      return speedTowardsBearing(this.sog, this.twa, 0);
    },
    vmc () {
      const gcPath = gcCalc(this.visualPosition,
                            this.$store.getters['ui/currentTarget'].latLng);
      return speedTowardsBearing(this.sog, this.cog, gcPath.startBearing);
    },
    color () {
      return this.twa >= 0 ? '#00ff00' : '#ff0000';
    },
    tooltipOptions () {
      return {
        permanent: true,
        direction: (this.cog >= degToRad(180)) ? 'left' : 'right',
        className: 'steering-tooltip',
      }
    },
    ...mapState({
      twd: state => state.boat.instruments.twd.value,
      tws: state => state.boat.instruments.tws.value,
      showPolar: state => state.boat.steering.visualSteering.showPolar,
      hoverLatLng: state => state.map.hoverLatLng,
      zoom: state => state.map.zoom,
      plottedSteering: state => state.boat.steering.plottedSteering,
      cfgPreserveSteeringType: state => state.boat.steering.cfg.preserveSteeringType,
      cfgVmc: state => state.boat.instruments.vmc.enabled.value,
    }),
    ...mapGetters({
      visualPosition: 'boat/visualPosition',
    }),
  },
  methods: {
    formatAngle (value) {
      return roundToFixed(radToDeg(value), 3);
    },
    formatValue (value) {
      return roundToFixed(value, 3);
    },
    getCommand(path) {
      let type = 'cc';
      if (this.cfgPreserveSteeringType.value) {
        type = this.plottedSteering.type;
      }
      let val;
      if (type === 'cc') {
        val = roundToFixed(radToDeg(path.startBearing), 3);
      } else {
        val = roundToFixed(radToDeg(cogTwdToTwa(path.startBearing, this.twd)), 3);
        val = twaTextPrefix(val) + val;
      }
      return {
        type: type,
        value: degToRad(val),
        valueText: val,
      };
    },
    onClick (e) {
      const path = loxoCalc(this.visualPosition, e.latlng);
      if (this.maxPixelDistance(e.latlng) < this.minSteeringDistance) {
        return;
      }
      this.$store.commit('boat/steering/setSteering', this.getCommand(path));
      this.map.off('click', this.onClick, this);
      this.$store.dispatch('ui/cancelUiMode');
    },
    maxPixelDistance (mapLatLng) {
      const pxDst = pixelDistanceCalc(this.visualPosition, mapLatLng, this.zoom);
      return Math.max(Math.abs(pxDst.dx), Math.abs(pxDst.dy));
    },
  },
  mounted () {
    this.$store.commit('map/setHover', null);
    this.$on('singleclick-committed', this.onClick);
    this.$on('touchend-committed', this.onClick);
  },
  beforeDestroy () {
    this.$off('singleclick-committed', this.onClick);
    this.$off('touchend-committed', this.onClick);
  },
  watch: {
    twa (val) {
      if (this.hoverLatLng === null) {
        val = null;
      }
      this.$store.commit('boat/steering/visualSteeringSetTwa', val);
    }
  },
}
</script>

<style scoped>
#visual-steering-info {
  font-size: 12px;
}
</style>
