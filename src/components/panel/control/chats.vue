<template>
  <div id="chat-channels" v-if="this.$store.state.race.loaded">
    <div
      class = "chat-channel"
      v-for = "channel in this.$store.state.chatrooms.activeRooms"
      v-bind:key = "channel.key"
      v-bind:style = "{ height: 'calc((100% - ' + (allowAdd ? 32 : 0) + 'px) / ' + roomCount + ')' }"
    >
      <chat-channel
        :room-key = "channel.roomKey"
        :room-id = "channel.id"
      />
    </div>
    <div v-if="this.allowAdd">
      <button @click="addChannel">+</button>
    </div>
  </div>
</template>

<script>
import ControlChat from './chat.vue';

export default {
  name: 'ControlChat',
  components: {
    'chat-channel': ControlChat,
  },

  computed: {
    roomCount () {
      return this.$store.state.chatrooms.activeRooms.length;
    },
    allowAdd () {
      return this.roomCount < 3;
    }
  },

  methods: {
    addChannel() {
      const newRoom = this.$store.state.chatrooms.activeRooms[0].id;
      this.$store.commit('chatrooms/addRoom', newRoom);
    }
  }
}
</script>

<style scoped>
#chat-channels {
  height: 100%;
  overflow: hidden;
}
</style>
