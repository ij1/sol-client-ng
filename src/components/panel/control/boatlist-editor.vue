<template>
  <popup-window
    class = "boatlist-editor"
    title = "Select Boats"
    :z-index = "1001"
    close-button-label = "Cancel"
    @close = "$emit('close')"
    :submit-button-label = "submitLabel"
    @submit = "createList"
    :can-submit = "canCreate"
  >
    <div class="listname">
      <label for="name">List name:</label>
      <input id="name" v-model.trim = "listname">
    </div>
    <div v-if = "editorMode === 'distance'">
      <label for="name">Distance:</label>
      <input id="name" v-model.trim = "distance">
    </div>
    <div v-if = "editorMode === 'country'">
      
    </div>
    <div class = "boatlist-editor-body" v-if = "listsAddDelMode">
      <div class="search">
        <label for="search">Search</label>
        <input
          id = "search"
          class = "boatlist-search-box"
          v-model = "search"
        >
      </div>
      <div class = "offlist">
        <boat-list
          v-if = "editorMode === 'boat'"
          :search = "search"
          :boat-list = "boatLists.offList"
          @input = "offSelected = $event"
        />
        <country-list
          v-if = "editorMode === 'country'"
          :search = "search"
          :country-list = "countryLists.offList"
          @input = "offSelected = $event"
        />
      </div>
      <div class = "center">
        <div>
          <button
            :disabled = "Object.getOwnPropertyNames(offSelected).length === 0"
            @click.prevent = "onAdd"
            @keydown.enter.prevent = "onAdd"
          >
            Add
          </button>
        </div>
        <div>
          <button
            :disabled = "Object.getOwnPropertyNames(onSelected).length === 0"
            @click.prevent = "onDel"
            @keydown.enter.prevent = "onDel"
          >
            Del
          </button>
        </div>
      </div>
      <div class = "onlist-header">Included {{listTypeLabel}}</div>
      <div class = "onlist">
        <boat-list
          v-if = "editorMode === 'boat'"
          :search = "search"
          :boat-list = "boatLists.onList"
          @input = "onSelected = $event"
        />
        <country-list
          v-if = "editorMode === 'country'"
          :search = "search"
          :country-list = "countryLists.onList"
          @input = "onSelected = $event"
        />
      </div>
    </div>
  </popup-window>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import PopupWindow from '../../popupwindow.vue';
import BoatList from './boatlist.vue';
import CountryList from './countrylist.vue';
import { validCountries } from '../../../lib/country.js';

export default {
  name: 'BoatlistSelector',
  components: {
    'popup-window': PopupWindow,
    'boat-list': BoatList,
    'country-list': CountryList,
  },
  props: {
    editorType: {
      type: String,
    },
    editListKey: {
      type: String,
    },
  },
  data () {
    return {
      listname: '',
      distance: '',
      search: '',
      onListStamp: 0,
      onList: new Set(),
      onSelected: {},
      offSelected: {},
    }
  },
  computed: {
    editorMode () {
      if (this.editListKey !== null) {
        this.editList.filterStamp;
	if (this.editList.filter.boats !== null) {
          return 'boat';
        }
        if (this.editList.filter.distance !== null) {
          return 'distance';
        }
	if (this.editList.filter.country !== null) {
          return 'country';
        }
      }
      return this.editorType;
    },
    listsAddDelMode () {
      return (this.editorMode !== 'distance');
    },
    listTypeLabel () {
      return (this.editorMode === 'boat') ? 'boats' : 'countries';
    },
    submitLabel () {
      return this.editorType === 'edit' ? 'Edit list' : 'Create list';
    },
    canCreate () {
      if (this.listname.length === 0) {
        return false;
      }
      for (const existingKey of Object.keys(this.boatlists)) {
        if (this.listname === this.boatlists[existingKey].name) {
          if (this.editListKey !== existingKey) {
            return false;
          }
        }
      }
      if (this.editorMode === 'distance') {
        const regex = /^\d(\.\d)?/;
        return regex.test(this.distance);
      } else if ((this.editorMode === 'boat') ||
                 (this.editorMode === 'country')) {
        this.onListStamp;
        return this.onList.size > 0;
      }
      /* Should never be reached */
      return false;
    },
    boatLists () {
      const boatList = this.$store.state.race.fleet.boat;
      let res = {
        offList: [],
        onList: [],
      }
      this.onListStamp;
      for (let i = 0; i < boatList.length; i++) {
        if (this.onList.has(boatList[i].name)) {
          res.onList.push(boatList[i]);
        } else {
          res.offList.push(boatList[i]);
        }
      }
      return res;
    },
    countryList () {
      let res = Object.keys(validCountries).sort((a, b) => {
        return a - b;
      }).reduce((arr, val) => {
        arr.push({
          country: val.toUpperCase(),
          name: validCountries[val],
        });
        return arr;
      }, []);
      return res;
    },
    countryLists () {
      let res = {
        offList: [],
        onList: [],
      }
      this.onListStamp;
      for (let country of this.countryList) {
        if (this.onList.has(country.country)) {
          res.onList.push(country);
        } else {
          res.offList.push(country);
        }
      }
      return res;
    },
    editList () {
      if (this.editListKey === null) {
        return null;
      }
      if (typeof this.boatlists[this.editListKey] !== 'undefined') {
        return this.boatlists[this.editListKey];
      }
      /* Should never be reached */
      return null;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
    ...mapState({
      boatlists: state => state.ui.boatlists.boatlists,
    }),
  },
  created () {
    if (this.editList !== null) {
      this.listname = this.editList.name;
      if (this.editList.filter.boats !== null) {
        this.onList = new Set(this.editList.filter.boats);
        this.onListStamp++;
      }
      if (this.editList.filter.distance !== null) {
        this.distance = this.editList.filter.distance;
      }
      if (this.editList.filter.country !== null) {
        this.onList = new Set(this.editList.filter.country);
        this.onListStamp++;
      }
    }
  },
  methods: {
    createList () {
      if (!this.canCreate) {
        return;
      }
      this.$store.commit('ui/boatlists/addOrEdit', {
        editListKey: this.editListKey,
        name: this.listname,
        filter: {
          boats: (this.editorMode === 'boat') ? this.onList : null,
          distance: (this.editorMode === 'distance') ? parseFloat(this.distance) : null,
          country: (this.editorMode === 'country') ? this.onList: null,
        },
      });
      this.$emit('close');
    },
    onAdd () {
      for (let id of Object.keys(this.offSelected)) {
        if (this.editorMode === 'boat') {
          this.onList.add(this.fleetBoatFromId(id).name);
        } else {
          this.onList.add(id);
        }
      }
      this.onListStamp++;
      this.offSelected = {};
    },
    onDel () {
      for (let id of Object.keys(this.onSelected)) {
        if (this.editorMode === 'boat') {
          this.onList.delete(this.fleetBoatFromId(id).name);
        } else {
          this.onList.delete(id);
        }
      }
      this.onListStamp++;
      this.onSelected = {};
    },
  },
}
</script>

<style scoped>
.boatlist-editor {
  font-size: 11px;
}
.boatlist-editor-body {
  display: grid;
  grid-template: 
    "search   .         onlist-header"
    "offlist  center    onlist";
}
.search {
  grid-area: search;
}
.search input {
  font-size: 11px;
}
.onlist-header {
  grid-area: onlist-header;
}
.onlist, .offlist {
  width: 100%;
  height: 400px;
}
.onlist {
  grid-area: onlist;
}
.center {
  grid-area: center
}
.offlist {
  grid-area: offlist;
}
</style>
