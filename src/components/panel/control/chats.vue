<template>
  <div id="chat-channels" v-if="this.$store.state.race.loaded">
    <div
      class = "chat-channel"
      v-for = "channel in this.$store.state.chatrooms.activeRooms"
      v-bind:key = "channel.key"
      v-bind:style = "{ height: 800 / roomCount + 'px' }"
    >
      <chat-channel
        :room-key = "channel.roomKey"
        :room-id = "channel.id"
      />
    </div>
    <div v-if="this.roomCount < 3">
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

  data () {
    return {}
  },

  computed: {
    roomCount () {
      return this.$store.state.chatrooms.activeRooms.length;
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
  min-height: 100%;
  max-height: 100%;
  overflow: hidden;
}
</style>
