<template>
  <div class="chat-channel">
    <div class="chat-channel-header">
      <span>
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
      </span>
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
        v-for = "msg in msgs"
        :key = "msg.id"
      >
        <div class="chat-block-header">
          <country-flag :country = "msg.boat.country"/>
          <syc-flag :syc = "msg.boat.syc"/>
          <span class="chat-name">
            <span v-html="msg.name"/>
          </span>
          <span class="chat-time">
            {{ timeOnlyForToday(msg.timestamp) }}
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
            v-model="messageDraft"
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
import { msecToUTCDateWithoutYearString, msecToUTCTimeString } from '../../../lib/utils.js';
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
      dummyBoat: {
        syc: false,
        country: null,
      }
    }
  },

  computed: {
    messageDraft: {
      get () {
        for (let room of this.$store.state.chatrooms.activeRooms) {
          if (room.roomKey === this.roomKey) {
            return room.messageDraft;
          }
        }
        /* Should never be reached */
        return '';
      },
      set (value) {
        this.$store.commit('chatrooms/setMessageDraft', {
          roomKey: this.roomKey,
          message: value,
        });
      },
    },
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
      return !this.publicBoat && (this.messageDraft.trim().length > 0);
    },
    canClose () {
      return this.$store.state.chatrooms.activeRooms.length > 1;
    },
    /* Trim, force consecutive newline chars to up to double '\n' */
    myStringClean () {
      return this.messageDraft.trim()
               .replace(/\r\n/g, '\n')
               .replace(/\n\n\n*/g, '\n\n');
    },
    boatDateString () {
      return msecToUTCDateWithoutYearString(this.boatTime);
    },
    ...mapGetters({
      boatTime: 'boat/time',
      publicBoat: 'boat/publicBoat',
    }),
  },

  methods: {
    timeOnlyForToday (value) {
      const date = msecToUTCDateWithoutYearString(value);
      const time = msecToUTCTimeString(value);
      if (this.boatDateString !== date) {
        return date + ' ' + time;
      }
      return time;
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
      this.messageDraft = '';
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
  height: 100%;
  max-height: 100%;
  font-size: 9px;
  display: flex;
  flex-direction: column;
}

.chat-channel-header {
  flex: none;
  display: flex;
  text-align: left;
  font-size: 10px;
  padding-bottom: 5px;
  justify-content: space-between;
}

.chat-channel-header span {
  display: flex;
}

#chat-channel-selector {
  font-size: 10px;
}

.chat-channel-close {
  position: absolute;
  right: 0px;
}

.chat-block-list {
  width: 100%;
  border: solid 1px;
  border-color: #a0a0a0;
  overflow-y: scroll;
  flex: auto;
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
  font-size: 9px;
  font-weight: bold;
  padding-right: 10px;
}
.chat-time {
}
.chat-msg {
  padding-left: 2px;
  padding-top: 2px;
  overflow-wrap: break-word;
  font-size: 12px;
}

.chat-channel-input {
  padding-top: 5px;
  width: 100%;
  flex: none;
}
.chat-channel-input-box {
  width: 100%;
  font-size: 12px;
  height: 4em;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;
}
.chat-channel-input-btn {
  text-align: right;
}
</style>
