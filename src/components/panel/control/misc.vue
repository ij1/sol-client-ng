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
    </div>
    <div>
      <div class="misc-header">Main Frameworks and Libraries Used</div>
      <ul>
        <li
          v-for = "library in libraries"
          :key = "library.name"
        >
          {{library.name}} (license: {{library.license}})
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'ControlMisc',
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
    }
  },
  computed: {
    links () {
      let res = [];
      res.push({
        name: 'Sailonline Manual',
        url: 'http://www.sailonline.org/wiki/show/Manual/'
      });
      res.push({
        name: 'Race Leaderboard',
        url: this.raceLoaded ?
             'http://www.sailonline.org/races/' + this.raceId + '/leaderboard' :
             null,
      });
      res.push({
        name: 'SYC Official Ranking',
        url: 'http://www.sailonline.org/series/2/',
      });
      res.push({
        name: 'Google Earth Feed',
        url: this.raceLoaded ?
             'http://www.sailonline.org/googleearth/race_' + this.raceId + '.kml' :
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
  font-size: 10px;
  text-align: left;
}
.misc-header {
  font-size: 11px;
  font-weight: bold;
}
</style>