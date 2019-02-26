<template>
  <popup-window
    class = "boatlist-editor"
    title = "Select Boats"
    :z-index = "1001"
    close-button-label = "Cancel"
    @close = "$emit('close')"
    submit-button-label = "Create list"
    @submit = "createList"
    :can-submit = "this.canCreate"
  >
    <div class = "boatlist-editor-body">
      <div class="listname">
        <label for="name">List name:</label>
        <input id="name" v-model.trim = "listname">
      </div>
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
import { mapGetters } from 'vuex';
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
  },
  data () {
    return {
      listname: '',
      search: '',
      onList: {},
      onSelected: [],
      offSelected: [],
    }
  },
  computed: {
    canCreate () {
      // ADDME: check unique list name
      return (this.listname.length > 0) &&
             (Object.keys(this.onList).length > 0);
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
    ...mapGetters({
      fleetBoatFromId: 'race/fleet/boatFromId',
    }),
  },
  methods: {
    createList () {
      if (!this.canCreate) {
        return;
      }
      this.$store.commit('ui/boatlists/add', {
        name: this.listname,
        filter: {
          boats: Object.keys(this.onList),
          distance: null,
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
    "listname listname  ."
    "search   .         onlist-header"
    "offlist  center    onlist";
}
.listname {
  grid-area: listname;
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
