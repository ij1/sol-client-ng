<template>
  <div class="chat-channel">
    <div class="chat-channel-header">
      <span>
        <label for = "chat-channel-selector">Chatroom:</label>
        <select
          id = "chat-channel-selector"
          :value="roomId"
          @change="selectRoom"
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
    <div class="chat-block-wrapper">
      <div class="chat-block-list">
        <div class="chat-block"
          v-for = "msg in msgs"
          :key = "msg.id"
        >
          <div class="chat-block-header">
            <span @click = "selectBoat($event, msg.boatId)">
              <span class="chat-name">
                <span v-html="msg.name"/>
              </span>
              <country-flag :country = "msg.boat.country"/>
              <syc-flag :syc = "msg.boat.syc"/>
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
    </div>
    <div class="chat-channel-input">
      <form @submit.prevent="sendChatMessage">
        <div>
          <textarea
            v-model="messageDraft"
            class="chat-channel-input-box"
            maxlength="200"
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
import { EventBus } from '../../../lib/event-bus.js';
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
    room () {
      return this.$store.state.chatrooms.rooms[this.roomId];
    },
    rawMsgs () {
      return this.room.msgs;
    },
    viewStamp () {
      return this.room.viewStamp;
    },
    updateStamp () {
      return this.room.updateStamp;
    },
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
      for (let msg of this.rawMsgs) {
        let msgcopy = Object.assign({}, msg);
        if (msg.boatId !== null) {
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
    updateViewStamp () {
      this.$store.commit('chatrooms/updateViewStamp', {
        id: this.roomId,
        timestamp: this.$store.getters['time/now'](),
      });
    },
    selectBoat(e, boatId) {
      if (boatId !== null) {
        EventBus.$emit('map-highlight', {
          boatId: boatId,
          keepMapPosition: e.altKey,
        });
      }
    },
  },

  mounted () {
    this.updateViewStamp();
  },

  watch: {
    updateStamp (newVal) {
      if ((this.rawMsgs.length > 0) && (newVal > this.viewStamp)) {
        this.updateViewStamp();
      }
    }
  }
}
</script>

<style scoped>
.chat-channel {
  font-size: 11px;
  flex: auto;
  min-height: 30px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.chat-channel-header {
  flex: none;
  display: flex;
  text-align: left;
  font-size: 11px;
  padding-bottom: 5px;
  justify-content: space-between;
}

.chat-channel-header span {
  display: flex;
  flex-direction: row;
}

#chat-channel-selector {
  font-size: 11px;
}

.chat-channel-close {
  position: absolute;
  right: 0px;
}

.chat-block-wrapper {
  flex: auto;
  overflow-y: scroll;
  position: relative;
  border: solid 1px;
  border-color: #a0a0a0;
}

.chat-block-list {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.chat-block {
  text-align: left;
  padding: 2px;
  width: inherit;
  box-sizing: border-box;
}
.chat-block:nth-last-child(even) {
  background: #ffffff;
}
.chat-block:nth-last-child(odd) {
  background: #e0e0e0;
}
.control-panel-dark .chat-block:nth-last-child(even) {
  background: #10104f;
}
.control-panel-dark .chat-block:nth-last-child(odd) {
  background: #00001f;
}


.chat-flag {
}
.chat-bundee {
}
.chat-name {
  position: relative;
  top: -1px;
  left: 1px;
  font-size: 10px;
  font-weight: bold;
  padding-right: 8px;
}
.chat-time {
}
.chat-msg {
  padding-left: 2px;
  padding-top: 2px;
  width: inherit;
  box-sizing: border-box;
  overflow-wrap: break-word;
  font-size: 13px;
}

.chat-channel-input {
  padding-top: 5px;
  width: 100%;
  flex: none;
}
.chat-channel-input-box {
  width: 100%;
  font-size: 12px;
  line-height: 1.1em;
  height: 4.8em;
  box-sizing: border-box;
  resize: none;
  overflow-y: scroll;
}
.chat-channel-input-btn {
  text-align: right;
}
</style>
