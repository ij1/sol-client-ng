<template>
  <div id="boatlist-editor" v-if="!this.closing">
    <div id="boatlist-editor-header">
      Select Boats
    </div>
    <form @submit.prevent="createList">
      <div class="listname">
        <label for="name">List name:</label>
        <input id="name" v-model.trim = "listname">
      </div>
      <div class="search">
        <label for="search">Search</label>
        <input
          id = "search"
          class = "boatlist-search-box"
          v-model = "filter"
        >
      </div>
      <div class = "offlist">
        <boat-list
          :filter = "this.filter"
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
          :filter = "this.filter"
          :boat-list = "this.boatLists.onList"
          @input = "onSelected = $event"
        />
      </div>
      <div class = "buttons">
        <button type = "submit" :disabled="!canCreate">
          Create list
        </button>
        <button
          type = "cancel"
          @click.prevent = "close"
          @keydown.enter.prevent = "close"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';
import BoatList from './boatlist.vue';

export default {
  name: 'BoatlistSelector',
  components: {
    'boat-list': BoatList,
  },
  data () {
    return {
      closing: false,
      listname: '',
      filter: '',
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
      // ADDME: create the list
      this.close();
    },
    close () {
      this.closing = true;
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
#boatlist-editor {
  position: fixed;
  top: 50%;
  left: 50%;
  margin-right: -50%;
  transform: translate(-50%, -50%);
  padding: 10px;
  border: solid 3px;
  border-radius: 10px;
  border-color: #808080;
  background: #fff;
  z-index: 2000;
  text-align: left;

  height: 500px;
  width: 500px;
  font-size: 11px;
}
#boatlist-editor form {
  display: grid;
  grid-template: 
    "listname listname  ."
    "search   .         onlist-header"
    "offlist  center    onlist"
    "buttons  buttons   buttons";
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
.buttons {
  grid-area: buttons;
}
</style>
