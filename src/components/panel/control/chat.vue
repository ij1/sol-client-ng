<template>
  <div class="chat-channel">
    <div class="chat-channel-header">
      <label for = "chat-channel-selector">Chatroom:</label>
      <select 
        id = "chat-channel-selector"
        :value="roomId"
        @input="selectRoom"
      >
        <option disabled value="">
          Please select channel
        </option>
        <option
          v-for = "channel in $store.state.chatrooms.rooms"
          v-bind:value = "channel.id"
          v-bind:key = "channel.name"
        >
          {{ channel.name }}
        </option>
      </select>
      <button
        class = "chat-channel-close"
        @click = "onClose"
        :disabled = "!canClose"
      >
        Close
      </button>
    </div>
    <div class="chat-block-list">
      <div class="chat-block"
        v-for = "(msg, index) in msgs"
        v-bind:key = "index"
      >
        <div class="chat-block-header">
          <country-flag :country = "msg.boat.country"/>
          <syc-flag :syc = "msg.boat.syc"/>
          <span class="chat-name">
            <span v-html="msg.name"/>
          </span>
          <span class="chat-time">
            {{ timeOnlyForToday(msg.t) }}
          </span>
        </div>
        <div class="chat-msg">
          <span v-html="msg.msg"/>
        </div>
      </div>
    </div>
    <div class="chat-channel-input">
      <form @submit.prevent="sendChatMessage">
        <div>
          <textarea
            v-model="myMessage"
            class="chat-channel-input-box"
            @keydown.enter.exact.prevent = "sendChatMessage"
          ></textarea>
        </div>
        <div class="chat-channel-input-btn">
          <button
            :disabled = "!canSend"
            type = "submit"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { msecToUTCDateString } from '../../../lib/utils.js';
import CountryFlag from '../../countryflag.vue';
import SycFlag from '../../sycflag.vue';

export default {
  name: 'ControlChat',
  components: {
    'country-flag': CountryFlag,
    'syc-flag': SycFlag,
  },
  props: {
    roomKey: {
      type: Number,
      required: true
    },
    roomId: {
      type: String,
      required: true
    }
  },

  data () {
    return {
      myMessage: "",
      dummyBoat: {
        syc: false,
        country: null,
      }
    }
  },

  computed: {
    msgs () {
      let res = [];
      /* Dummy dep */
      for (let msg of this.$store.state.chatrooms.rooms[this.roomId].msgs) {
        let msgcopy = Object.assign({}, msg);
        if (typeof msg.boatId !== 'undefined') {
          msgcopy.boat = this.$store.getters['race/fleet/boatFromId'](msg.boatId);
        } else {
          msgcopy.boat = this.dummyBoat;
        }
        res.push(msgcopy);
      }
      return res;
    },
    canSend () {
      return (this.myMessage.trim().length > 0);
    },
    canClose () {
      return this.$store.state.chatrooms.activeRooms.length > 1;
    },
    /* Trim, force all consecutive newline chars into singular '\n' */
    myStringClean () {
      return this.myMessage.trim().replace(/[\n\r][\n\r]*/g, '\n');
    },
    boatTimeString () {
      return msecToUTCDateString(this.boatTime);
    },
    ...mapGetters({
      boatTime: 'boat/time',
    }),
  },

  methods: {
    timeOnlyForToday (value) {
      const s = value.split(" ", 2);
      if (this.boatTimeString !== s[0]) {
        const d = s[0].split("/", 3);
        return d[1] + "/" + d[2] + ' ' + s[1];
      }
      return s[1];
    },
    selectRoom(e) {
      this.$store.commit('chatrooms/selectRoom', {
        roomKey: this.roomKey,
        newRoom: e.target.value
      }, {root: true});
    },
    sendChatMessage() {
      if (!this.canSend) {
        return;
      }
      this.$store.dispatch('chatrooms/queueMessage', {
        room_id: this.roomId,
        text: this.myStringClean,
      });
      this.myMessage = '';
    },
    onClose () {
      if (this.canClose) {
        this.$store.commit('chatrooms/closeRoom', this.roomKey);
      }
    },
  }
}
</script>

<style scoped>
.chat-channel {
  font-size: 10px;
  height: 100%;
  max-height: 100%;
  font-size: 9px;
}

.chat-channel-header {
  text-align: left;
  padding-bottom: 5px;
}

.chat-channel-header select {
  font-size: 9px;
}

.chat-channel-close {
  float: right;
}

.chat-block-list {
  height: calc(100% - 100px);
  width: 100%;
  border: solid 1px;
  border-color: #a0a0a0;
  overflow-y: scroll;
}

.chat-block {
  text-align: left;
  padding: 2px;
}
.chat-block:nth-child(even) {
  background: #ffffff;
}
.chat-block:nth-child(odd) {
  background: #e0e0e0;
}
.chat-flag {
}
.chat-bundee {
}
.chat-name {
  float: left;
  font-weight: bold;
  padding-right: 10px;
}
.chat-time {
}
.chat-msg {
  padding-left: 2px;
  padding-top: 2px;
  overflow-wrap: break-word;
}

.chat-channel-input {
  padding-top: 5px;
  width: 100%;
}
.chat-channel-input-box {
  width: 100%;
  font-size: 9px;
  height: 4em;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;
}
.chat-channel-input-btn {
  text-align: right;
}
</style>
