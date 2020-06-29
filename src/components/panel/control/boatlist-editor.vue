<template>
  <popup-window
    class = "boatlist-editor"
    title = "Select Boats"
    :z-index = "1002"
    close-button-label = "Cancel"
    @close = "$emit('close')"
    :submit-button-label = "submitLabel"
    @submit = "createList"
    :can-submit = "canCreate"
  >
    <div class="listname">
      <label for="name">List name:</label>
      <input id="name" v-model.trim = "listname"/>
    </div>
    <div v-if = "editorMode === 'distance'">
      <label for="name">Distance:</label>
      <input id="name" v-model.trim = "distance"/>
    </div>
    <div v-if = "editorMode === 'country'">
      
    </div>
    <div v-if = "editorMode === 'boattype'">

    </div>
    <div class = "boatlist-editor-body" v-if = "listsAddDelMode">
      <div class="search">
        <label for="search">Search</label>
        <input
          id = "search"
          class = "boatlist-search-box"
          v-model = "search"
        />
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
        <boattype-list
          v-if = "editorMode === 'boattype'"
          :search = "search"
          :boattype-list = "boattypeLists.offList"
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
        <boattype-list
          v-if = "editorMode === 'boattype'"
          :search = "search"
          :boattype-list = "boattypeLists.onList"
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
import BoattypeList from './boattypelist.vue';
import { validCountries } from '../../../lib/country.js';

export default {
  name: 'BoatlistSelector',
  components: {
    'popup-window': PopupWindow,
    'boat-list': BoatList,
    'country-list': CountryList,
    'boattype-list': BoattypeList,
  },
  props: {
    editorType: {
      type: String,
    },
    editListKey: {
      type: String,
      default: null,
    },
    seedListKey: {
      type: String,
      required: true,
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
      editorMode: null,
    }
  },
  computed: {
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
        const regex = /^\d\d*(\.\d\d*)?$/;
        return regex.test(this.distance);
      } else if ((this.editorMode === 'boat') ||
                 (this.editorMode === 'country') ||
                 (this.editorMode === 'boattype')) {
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
    boattypeList () {
      this.boatTypesCount;      /* Dummy dep */

      let res = Array.from(this.boatTypes).sort((a, b) => {
        return a - b;
      }).map(val => { return { 'boattype': val }; });
      return res;
    },
    boattypeLists () {
      let res = {
        offList: [],
        onList: [],
      }
      this.onListStamp;
      for (let boattype of this.boattypeList) {
        if (this.onList.has(boattype.boattype)) {
          res.onList.push(boattype);
        } else {
          res.offList.push(boattype);
        }
      }
      return res;
    },
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
    ...mapState({
      boatlists: state => state.ui.boatlists.boatlists,
      boatTypes: state => state.race.fleet.boatTypes,
      boatTypesCount: state => state.race.fleet.boatTypesCount,
    }),
  },
  created () {
    let seedList = null;

    if (this.editListKey !== null) {
      seedList = this.getList(this.editListKey);
      if (seedList !== null) {
        this.listname = seedList.name;
        this.editorMode = this.filterToMode(seedList.filter);
      }

    } else {
      seedList = this.getList(this.seedListKey);
      this.editorMode = this.editorType;
    }

    if ((seedList !== null) &&
        (this.filterToMode(seedList.filter) === this.editorMode)) {
      if (seedList.filter.boats !== null) {
        this.onList = new Set(seedList.filter.boats);
        this.onListStamp++;
      }
      if (seedList.filter.distance !== null) {
        this.distance = seedList.filter.distance;
      }
      if (seedList.filter.country !== null) {
        this.onList = new Set(seedList.filter.country);
        this.onListStamp++;
      }
      if (seedList.filter.boattype !== null) {
        this.onList = new Set(seedList.filter.boattype);
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
          boattype: (this.editorMode === 'boattype') ? this.onList: null,
        },
      });
      this.$emit('close');
    },
    getList (listKey) {
      if (listKey === null) {
        return null;
      }
      if (typeof this.boatlists[listKey] !== 'undefined') {
        return this.boatlists[listKey];
      }
      return null;
    },
    filterToMode (filter) {
      if (filter.boats !== null) {
        return 'boat';
      }
      if (filter.distance !== null) {
        return 'distance';
      }
      if (filter.country !== null) {
        return 'country';
      }
      if (filter.boattype !== null) {
        return 'boattype';
      }
      return null;
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
