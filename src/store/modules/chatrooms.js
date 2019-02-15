import Vue from 'vue';
import { orderBy } from 'lodash';

export default {
  namespaced: true,

  state: {
    rooms: {},
    activeRooms: [],
    roomKey: 0,
    nextRoomIndex: -1,
  },

  mutations: {
    init (state, chatroomsInfo) {
      for (let i = 0; i < chatroomsInfo.length; i++) {
        // FIXME: should probably just merge attributes in solapi call
        const chatroom = chatroomsInfo[i].$;
        Vue.set(state.rooms, chatroom.id, {
          id: chatroom.id,
          name: chatroom.name,
          msgs: [],
          timestamp: 0,
          sending: false,
        });
      }
      state.activeRooms = [{
        roomKey: state.roomKey++,
        id: '1',
      }];
      state.nextRoomIndex = 0;
    },

    updateRoom (state, data) {
      let newMsgs = data.chat;
      // ADDME: Truncate tail?
      newMsgs = orderBy(newMsgs.concat(state.rooms[data.id].msgs), 't', 'desc');
      state.rooms[data.id].msgs = newMsgs;
      state.rooms[data.id].timestamp = data.timestamp;
    },

    nextRoom(state) {
      /* Update round-robin room fetch index */
      state.nextRoomIndex++;
      if (state.nextRoomIndex === state.activeRooms.length) {
        state.nextRoomIndex = 0;
      }
    },

    addRoom(state, room) {
      state.activeRooms.push({
        roomKey: state.roomKey++,
        id: room,
      });
    },
    closeRoom(state, roomKey) {
      for (let i = 0; i < state.activeRooms.length; i++) {
        if (state.activeRooms[i].roomKey === roomKey) {
          state.activeRooms.splice(i, 1);

          /* Fix index as element was removed */
          if (i > state.nextRoomIndex) {
            state.nextRoomIndex--;
          }
          /* At the last element (that got removed) handling */
          if (state.nextRoomIndex >= state.activeRooms.length) {
            state.nextRoomIndex = 0;
          }
          return;
        }
      }
    },
    selectRoom(state, roomInfo) {
      for (let i = 0; i < state.activeRooms.length; i++) {
        if (state.activeRooms[i].roomKey === roomInfo.roomKey) {
          state.activeRooms[i].id = roomInfo.newRoom;
          return;
        }
      }
    },

    setSending(state, roomId) {
      state.rooms[roomId].sending = true;
    },
    clearSending(state, roomId) {
      state.rooms[roomId].sending = false;
    },

  },

  getters: {
    /* Returns the id of the room that should be fetched in the next
     * boat API call
     */
    nextRoomToFetch(state) {
      return state.activeRooms[state.nextRoomIndex].id;
    },
  },

  actions: {
    sendMessage({rootState, commit, dispatch}, sendParams) {
      commit('setSending', sendParams.room_id);

      const postDef = {
        url: '/webclient/chat/post/?token=' + rootState.auth.token,
        params: sendParams,
        useArrays: false,
      };

      let status = 'OK';
      return dispatch('solapi/post', postDef, {root: true})
        .catch(() => {
          /* FIXME: Should retry a number of times before giving up */
          status = 'ERROR';
        })
        .then(() => {
          commit('clearSending', sendParams.room_id);
          return status;
        });
    }
  }
}
