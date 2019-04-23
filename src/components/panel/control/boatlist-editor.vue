<template>
  <popup-window
    class = "boatlist-editor"
    title = "Select Boats"
    :z-index = "1001"
    close-button-label = "Cancel"
    @close = "$emit('close')"
    :submit-button-label = "this.submitLabel"
    @submit = "createList"
    :can-submit = "this.canCreate"
  >
    <div class="listname">
      <label for="name">List name:</label>
      <input id="name" v-model.trim = "listname">
    </div>
    <div v-if = "editorMode === 'distance'">
      <label for="name">Distance:</label>
      <input id="name" v-model.trim = "distance">
    </div>
    <div class = "boatlist-editor-body" v-if = "editorMode === 'boat'">
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
          :search = "this.search"
          :boat-list = "this.boatLists.offList"
          @input = "offSelected = $event"
        />
      </div>
      <div class = "center">
        <div>
          <button
            :disabled = "this.offSelected.length === 0"
            @click.prevent = "onAdd"
            @keydown.enter.prevent = "onAdd"
          >
            Add
          </button>
        </div>
        <div>
          <button
            :disabled = "this.onSelected.length === 0"
            @click.prevent = "onDel"
            @keydown.enter.prevent = "onDel"
          >
            Del
          </button>
        </div>
      </div>
      <div class = "onlist-header">Included boats</div>
      <div class = "onlist">
        <boat-list
          :search = "this.search"
          :boat-list = "this.boatLists.onList"
          @input = "onSelected = $event"
        />
      </div>
    </div>
  </popup-window>
</template>

<script>
import Vue from 'vue';
import { mapState, mapGetters } from 'vuex';
import PopupWindow from '../../popupwindow.vue';
import BoatList from './boatlist.vue';

export default {
  name: 'BoatlistSelector',
  components: {
    'popup-window': PopupWindow,
    'boat-list': BoatList,
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
      onList: {},
      onSelected: [],
      offSelected: [],
    }
  },
  computed: {
    editorMode () {
      if (this.editListKey !== null) {
	return ((this.editList.filter.boats !== null) ? 'boat' : 'distance');
      }
      return this.editorType;
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
      } else if (this.editorMode === 'boat') {
        return Object.keys(this.onList).length > 0;
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
      for (let i = 0; i < boatList.length; i++) {
        if (typeof this.onList[boatList[i].id] !== 'undefined') {
          res.onList.push(boatList[i]);
        } else {
          res.offList.push(boatList[i]);
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
        this.onList = this.editList.filter.boats.reduce((arr, boat) => {
            arr[boat] = true;
            return arr;
        }, {});
      }
      if (this.editList.filter.distance !== null) {
        this.distance = this.editList.filter.distance;
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
          boats: (this.editorMode === 'boat') ? Object.keys(this.onList) : null,
          distance: (this.editorMode === 'distance') ? parseFloat(this.distance) : null,
        },
      });
      this.$emit('close');
    },
    onAdd () {
      for (let id of this.offSelected) {
        Vue.set(this.onList, id, true);
      }
      this.offSelected = [];
    },
    onDel () {
      for (let id of this.onSelected) {
        Vue.delete(this.onList, id);
      }
      this.onSelected = [];
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
