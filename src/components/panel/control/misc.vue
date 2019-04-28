<template>
  <div id="misc">
    <div>
      <div class="misc-header">Helpful Links</div>
    </div>
    <div>
      <button
        @click="$store.commit('ui/showConfigEditor')"
      >
        Configure Options
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