<template>
  <div id="chat-channels" v-if="$store.state.race.loaded">
    <div
      class = "chat-channel"
      v-for = "channel in $store.state.chatrooms.activeRooms"
      v-bind:key = "channel.key"
      v-bind:style = "{ height: 'calc((100% - ' + (allowAdd ? 32 : 0) + 'px) / ' + roomCount + ')' }"
    >
      <chat-channel
        :room-key = "channel.roomKey"
        :room-id = "channel.id"
      />
    </div>
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
  overflow: hidden;
}
</style>
