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
    </div>
    <div>
      <button
        @click="$store.commit('ui/showConfigEditor')"
      >
        Settings
      </button>
      <button
        @click = "$store.commit('ui/showTools')"
      >
        Tools
      </button>
      <button
        @click = "$store.commit('ui/showQuickHelp')"
      >
        Quick Help
      </button>
    </div>
    <div>
      <div class="misc-header">Race Information</div>
      <div>
        <race-gpx v-if = "raceLoaded"/>
      </div>
      <div>
        Tile set:
        <span
          v-if = "raceLoaded"
        >
          {{raceTilemap === 'h' ? 'high' : 'intermediate'}}
        </span>
      </div>
      <div>
        Weather grid:
        <span
          v-if = "wxLoaded"
        >
          {{formatDeg(wxCellSize[0])}}&deg; x
          {{formatDeg(wxCellSize[1])}}&deg;
        </span>
      </div>
      <div>
        Weather update times:
        <span
          v-if = "wxLoaded"
        >
          <span
            v-for = "(t, index) in wxUpdateTimes"
            :key = "'t' + index"
          >
            {{formatTime(t)}}
          </span>
          UTC
        </span>
      </div>
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
        Version identifier {{version}} (GPL v2) ij 2018-2023.
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import RaceGpx from './racegpx.vue';
import SycBanner from '../../sycbanner.vue';
import { weatherData } from '../../../store/modules/weather.js';

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
          name: 'xml2js',
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
        name: 'Boat Polar',
        url: this.boatId !== null ?
             '/webclient/vpp/boat/' + this.boatId + '/' :
             null,
      }),
      res.push({
        name: 'Google Earth Feed',
        url: this.raceLoaded ?
             '/googleearth/race_' + this.raceId + '.kml' :
             null,
      });
      return res;
    },
    wxCellSize() {
      this.wxDataStamp;
      if (typeof weatherData[0] === 'undefined') {
        return null;
      }
      return weatherData[0].cellSize;
    },
    ...mapState({
      raceLoaded: state => state.race.loaded,
      raceId: state => state.race.info.id,
      raceTilemap: state => state.race.info.tilemap,
      boatId: state => state.boat.id,
      wxLoaded: state => state.weather.loaded,
      wxUpdateTimes: state => state.weather.updateTimes,
      wxDataStamp: state => state.weather.dataStamp,
    }),
  },
  methods: {
    formatDeg (d) {
      return d.toFixed(3).replace(/\.?0*$/,'');
    },
    formatTime (t) {
      const h = Math.floor(t / 60);
      return ('00' + h.toFixed(0)).slice(-2) + ':' +
             ('00' + ((t - h * 60) % 60).toFixed(0)).slice(-2);
    },
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
.control-panel-dark a {
  color: orange;
}
.control-panel-dark a:visited {
  color: saddlebrown;
}
</style>
