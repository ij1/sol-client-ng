<template>
  <div class="chat-channel">
    <div class="chat-channel-header">
      Chatroom:
      <select 
        class="chat-channel-selector"
        :value="roomId"
        @input="selectRoom"
      >
        <option disabled value="">
          Please select channel
        </option>
        <option
          v-for = "channel in this.$store.state.chatrooms.rooms"
          v-bind:value = "channel.id"
          v-bind:key = "channel.name"
        >
          {{ channel.name }}
        </option>
      </select>
    </div>
    <div class="chat-block-list">
      <div class="chat-block"
        v-for = "(msg, index) in this.$store.state.chatrooms.rooms[roomId].msgs"
        v-bind:key = "index"
      >
        <div class="chat-block-header">
          <span class="chat-flag">
          </span>
          <span class="chat-bundee">
          </span>
          <span class="chat-name">
            <span v-html="msg.name"/>
          </span>
          <span class="chat-time">
            {{ msg.t | timeOnly }}
          </span>
        </div>
        <div class="chat-msg">
          <span v-html="msg.msg"/>
        </div>
      </div>
    </div>
    <div class="chat-channel-input">
      <div>
        <textarea
          v-model="myMessage"
          class="chat-channel-input-box"
        ></textarea>
      </div>
      <div class="chat-channel-input-btn">
        <button
          @click="sendChatMessage"
          :disabled = "!canSend"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'ControlChat',
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
    }
  },

  filters: {
    timeOnly (value) {
      return value.split(" ", 2)[1];
    }
  },

  computed: {
    canSend () {
      return (this.myMessage.trim().length > 0) &&
             !this.$store.state.chatrooms.rooms[this.roomId].sending;
    },
    /* Trim, force all consecutive newline chars into singular '\n' */
    myStringClean () {
      return this.myMessage.trim().replace(/[\n\r][\n\r]*/g, '\n');
    },
  },

  methods: {
    selectRoom(e) {
      this.$store.commit('chatrooms/selectRoom', {
        roomKey: this.roomKey,
        newRoom: e.target.value
      }, {root: true});
    },
    sendChatMessage() {
      this.$store.dispatch('chatrooms/sendMessage', {
        room_id: this.roomId,
        text: this.myStringClean,
      })
      .then(status => {
        if (status !== 'OK') {
          this.$store.dispatch('notifications/add', {
            text: 'Failed to send a message to chat!',
            color: 'red',
          });
        }
      });
    }
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
  text-align: right;
  padding-bottom: 5px;
}

.chat-channel-header select {
  font-size: 9px;
}

.chat-block-list {
  float: down;
  height: 80%;
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
}

.chat-channel-input {
  padding-top: 5px;
  float: bottom;
  width: 100%;
}
.chat-channel-input-box {
  width: 100%;
  font-size: 9px;
  height: 4em;
  box-sizing: border-box;
}
.chat-channel-input-btn {
  text-align: right;
}
</style>
