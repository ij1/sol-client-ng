import Vue from 'vue';
import { orderBy } from 'lodash';
import { secToMsec } from '../../lib/utils.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';


export default {
  namespaced: true,

  state: {
    rooms: {},
    activeRooms: [],
    roomKey: 0,
    nextRoomIndex: -1,
    pendingMessages: [],
    lastSentStamp: 0,
    retryTimer: 1000,
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

    addMessage(state, msg) {
      state.pendingMessages.push(msg);
    },
    messageSent(state) {
      state.pendingMessages.shift();
      state.retryTimer = secToMsec(1);
    },
    messageSendFailed(state) {
      state.retryTimer = Math.min(state.retryTimer * 2, secToMsec(50));
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
    queueMessage({state, commit, dispatch}, msg) {
      commit('addMessage', msg);
      if (state.pendingMessages.length === 1) {
        dispatch('sendMessage');
      }
    },
    sendMessage({state, rootState, commit, dispatch}) {
      const sendParams = state.pendingMessages[0];

      const postDef = {
        url: '/webclient/chat/post/?token=' + rootState.auth.token,
        params: sendParams,
        useArrays: false,
      };

      return dispatch('solapi/post', postDef, {root: true})
        .catch(err => {
          commit('messageSendFailed');
          solapiRetryDispatch(dispatch, 'sendMessage', undefined,
                              state.retryTimer);
          return Promise.reject(err);
        })
        .then(() => {
          commit('messageSent');
          if (state.pendingMessages.length > 0) {
            solapiRetryDispatch(dispatch, 'sendMessage', undefined,
                                state.retryTimer);
          }
        })
        .catch(err => {
          commit('solapi/logError', err, {root: true});
        });
    }
  }
}
