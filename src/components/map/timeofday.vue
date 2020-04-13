<template>
  <l-layer-group v-if = "boatId !== null">
    <l-terminator
      v-if = "showTerminator"
      :stroke = "false"
      :fill-color = "'#000'"
      :fill-opacity = "0.1"
      :time = "boatTime"
      pane = "timeofdayPane"
    />
  </l-layer-group>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { LLayerGroup } from 'vue2-leaflet';
import Vue2LeafletTerminator from './Vue2LeafletTerminator.vue';

export default {
  name: 'TimeOfDay',
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  components: {
    'l-layer-group': LLayerGroup,
    'l-terminator': Vue2LeafletTerminator,
  },
  computed: {
    showTerminator () {
      return this.cfgDayNightMode !== 'white';
    },
    ...mapState({
      boatId: state => state.boat.id,
      cfgDayNightMode: state => state.ui.cfg.dayNightMode.value,
    }),
    ...mapGetters({
      boatTime: 'boat/time',
      currentDayNight: 'ui/currentDayNight',
    }),
  },
  methods: {
    switchClasses (el, classPrefix) {
      let classList = el.classList;
      const newClass = classPrefix + '-' + this.currentDayNight;
      const oldClass = classPrefix + '-' + (this.currentDayNight === 'white' ?
                                            'dark' : 'white');
      classList.add(newClass);
      classList.remove(oldClass);
    },
    updateDayNight () {
      this.switchClasses(this.map.getContainer(), 'time-of-day');
    },
  },
  watch: {
    currentDayNight (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.updateDayNight();
      }
    },
  },
  created () {
    let pane = this.map.createPane('timeofdayPane');
    pane.style.zIndex = 300;
    this.updateDayNight();
  },
}
</script>

<style>
.time-of-day-white {
  background-color: #fff !important;
  transition: background-color 0.5s;
}
.time-of-day-dark {
  background-color: #00002f !important;
  transition: background-color 0.5s;
}

.time-of-day-color-white {
  color: #000000;
  transition: color 0.5s;
}
.time-of-day-color-dark {
  color: #00ff00;
  transition: color 0.5s;
}

.time-of-day-blend-white {
  mix-blend-mode: multiply;
}
.time-of-day-blend-dark {
  mix-blend-mode: screen;
}
</style>
