<template>
  <div id="chat-channels" v-if="$store.state.race.loaded">
    <chat-channel
      v-for = "channel in $store.state.chatrooms.activeRooms"
      v-bind:key = "channel.key"
      :room-key = "channel.roomKey"
      :room-id = "channel.id"
    />
    <div v-if="allowAdd">
      <button @click="addChannel">+</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ControlChat from './chat.vue';

export default {
  name: 'ControlChat',
  components: {
    'chat-channel': ControlChat,
  },

  computed: {
    allowAdd () {
      return this.roomCount < this.maxOpenRooms;
    },
    ...mapState({
      roomCount: state => state.chatrooms.activeRooms.length,
      maxOpenRooms: state => state.chatrooms.maxOpenRooms,
    }),
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
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
