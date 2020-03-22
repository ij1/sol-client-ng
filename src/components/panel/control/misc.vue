<template>
  <div id="misc">
    <div>
      <div class="misc-header">Helpful Links</div>
      <div
        v-for = "link in links"
        :key = "link.name"
      >
        <a :href = "link.url" target = "_blank">
          {{link.name}}
        </a>
      </div>
      <div>
        <race-gpx v-if = "raceLoaded"/>
      </div>
    </div>
    <div>
      <button
        @click="$store.commit('ui/showConfigEditor')"
      >
        Settings
      </button>
      <button
        @click = "$store.commit('ui/showQuickHelp')"
      >
        Quick Help
      </button>
    </div>
    <div id = "banner-container">
      <syc-banner/>
    </div>
    <div>
      <div class="misc-header">Main Frameworks and Libraries Used</div>
      <ul class="misc-small">
        <li
          v-for = "library in libraries"
          :key = "library.name"
        >
          {{library.name}} (license: {{library.license}})
        </li>
      </ul>
    </div>
    <div>
      <div class="misc-header">About</div>
      <div class="misc-small">
        Version identifier {{version}} (GPL v2) ij 2018-2020.
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import RaceGpx from './racegpx.vue';
import SycBanner from '../../sycbanner.vue';

export default {
  name: 'ControlMisc',
  components: {
    'race-gpx': RaceGpx,
    'syc-banner': SycBanner,
  },
  data () {
    return {
      libraries: [
        {
          name: 'Leaflet',
          license: 'BSD-2-Clause',
        },
        {
          name: 'Leaflet.Terminator',
          license: 'MIT',
        },
        {
          name: 'pako',
          license: 'MIT',
        },
        {
          name: 'rbush',
          license: 'MIT',
        },
        {
          name: 'Vue.js',
          license: 'MIT',
        },
        {
          name: 'Vue2Leaflet',
          license: 'MIT',
        },
        {
          name: 'Vuex',
          license: 'MIT',
        },
        {
          name: 'isomorphic-xml2js',
          license: 'MIT',
        },        
      ],
      version: process.env.VUE_APP_GIT_REV,
    }
  },
  computed: {
    links () {
      let res = [];
      res.push({
        name: 'Sailonline Manual',
        url: '/wiki/show/Manual/'
      });
      res.push({
        name: 'Race Leaderboard',
        url: this.raceLoaded ?
             '/races/' + this.raceId + '/leaderboard' :
             null,
      });
      res.push({
        name: 'SYC Official Ranking',
        url: '/series/2/',
      });
      res.push({
        name: 'Google Earth Feed',
        url: this.raceLoaded ?
             '/googleearth/race_' + this.raceId + '.kml' :
             null,
      });
      return res;
    },
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceId: state => state.race.info.id,
    }),
  },
}
</script>

<style scoped>
#misc {
  width: 100%;
  height: 100%;
  font-size: 12px;
  text-align: left;
  overflow-y: auto;
}
.misc-header {
  font-size: 14px;
  font-weight: bold;
}
.misc-small {
  font-size: 11px;
}
#banner-container {
  position: relative;
}
</style>
