import Vue from 'vue';
import { orderBy } from 'lodash';
import { secToMsec, UTCToMsec } from '../../lib/utils.js';
import { solapiRetryDispatch } from '../../lib/solapi.js';

function updateLocalStorageRooms(state) {
  for (let i = 0; i < state.maxOpenRooms; i++) {
    const key = state.localStorageKeyPrefix + i;
    if (i < state.activeRooms.length) {
      localStorage.setItem(key, state.rooms[state.activeRooms[i].id].name);
    } else {
      localStorage.removeItem(key);
    }
  }
}


export default {
  namespaced: true,

  state: {
    rooms: {},
    roomList: [],
    activeRooms: [],
    maxOpenRooms: 3,
    roomKey: 0,
    pendingMessages: [],
    lastSentStamp: 0,
    fetchCounter: 0,
    retryTimer: 1000,
    chatMsgId: 0,       /* Add unique ID to chat messages */

    localStorageKeyPrefix: 'sol-chatroom:',
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
          lastFetched: 0,
          boatIdsMapped: true,
          updateStamp: 0,
          viewStamp: 0,
        });
        state.roomList.push(chatroom.id);
      }
      state.activeRooms = [];

      for (let i = 0; i < state.maxOpenRooms; i++) {
        const val = localStorage.getItem(state.localStorageKeyPrefix + i);
        if (val === null) {
          break;
        }

        for (const roomId of state.roomList) {
          if (val === state.rooms[roomId].name) {
            state.activeRooms.push({
              roomKey: state.roomKey++,
              id: roomId,
              messageDraft: '',
            });
          }
        }
      }

      if (state.activeRooms.length === 0) {
        state.activeRooms.push({
          roomKey: state.roomKey++,
          id: '1',
          messageDraft: '',
        });
        updateLocalStorageRooms(state);
      }
    },

    updateRoom (state, data) {
      let newMsgs = data.chat;
      if (data.timestamp !== null) {
        // ADDME: Truncate tail?
        newMsgs = orderBy(newMsgs.concat(state.rooms[data.id].msgs), 'timestamp', 'desc');
        state.rooms[data.id].msgs = newMsgs;
        state.rooms[data.id].timestamp = data.timestamp;
        state.rooms[data.id].boatIdsMapped = false;
        /* If not viewed at all, make viewStamp to match updateStamp or only
         * own messages were added (and all other were already viewed)
         */
        if ((state.rooms[data.id].viewStamp === 0) ||
            (!data.messagesFromOthers &&
             (state.rooms[data.id].viewStamp >= state.rooms[data.id].updateStamp))) {
          state.rooms[data.id].viewStamp = data.fetchTimestamp;
        }
        state.rooms[data.id].updateStamp = data.fetchTimestamp;
      }

      state.rooms[data.id].lastFetched = data.fetchTimestamp;
      if (state.fetchCounter >= state.activeRooms.length) {
        state.fetchCounter = 0;
      } else {
        state.fetchCounter++;
      }
    },
    consumeMsgId (state) {
      state.chatMsgId++;
    },
    updateViewStamp (state, data) {
      state.rooms[data.id].viewStamp = data.timestamp;
    },

    mapBoatIds (state, name2boatId) {
      for (let c of state.roomList) {
        if (state.rooms[c].boatIdsMapped) {
          continue;
        }
        let allMapped = true;
        for (let i = 0; i < state.rooms[c].msgs.length; i++) {
          let msg = state.rooms[c].msgs[i];
          if (typeof msg.boatId === 'undefined') {
            let idList = name2boatId.get(msg.name);
            if (typeof idList !== 'undefined') {
              // FIXME: make boatId present when rewriting msg parsing code
              // to avoid need to use Vue.set here
              Vue.set(state.rooms[c].msgs[i], 'boatId', idList[0]);
            } else {
              allMapped = false;
            }
          }
        }
        state.rooms[c].boatIdsMapped = allMapped;
      }
    },

    addRoom(state, room) {
      state.activeRooms.push({
        roomKey: state.roomKey++,
        id: room,
        messageDraft: '',
      });
      updateLocalStorageRooms(state);
    },
    closeRoom(state, roomKey) {
      for (let i = 0; i < state.activeRooms.length; i++) {
        if (state.activeRooms[i].roomKey === roomKey) {
          state.activeRooms.splice(i, 1);
          updateLocalStorageRooms(state);
          return;
        }
      }
    },
    selectRoom(state, roomInfo) {
      for (let i = 0; i < state.activeRooms.length; i++) {
        if (state.activeRooms[i].roomKey === roomInfo.roomKey) {
          state.activeRooms[i].id = roomInfo.newRoom;
          updateLocalStorageRooms(state);
          return;
        }
      }
    },
    setMessageDraft(state, msgInfo) {
      for (let i = 0; i < state.activeRooms.length; i++) {
        if (state.activeRooms[i].roomKey === msgInfo.roomKey) {
          state.activeRooms[i].messageDraft = msgInfo.message;
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
      let fetchId = '1';
      let minTime = Number.MAX_VALUE;

      if (state.fetchCounter < state.activeRooms.length) {
        for (let active of state.activeRooms) {
          if (state.rooms[active.id].lastFetched < minTime) {
            fetchId = active.id;
            minTime = state.rooms[active.id].lastFetched;
          }
        }
      } else {
        /*
         * Fetch all rooms with low-priority to improve latency
         * when changing rooms (after each full cycle of the active
         * rooms).
         */
        for (const roomId of state.roomList) {
          if (state.rooms[roomId].lastFetched < minTime) {
            fetchId = roomId;
            minTime = state.rooms[roomId].lastFetched;
          }
        }
      }
      return fetchId;
    },

    newMessagesToShow: (state) => {
      let res = false;

      for (let activeRoom of state.activeRooms) {
        const room = state.rooms[activeRoom.id];
        if (room.msgs.length > 0 && room.viewStamp < room.updateStamp) {
          res = true;
        }
      }
      return res;
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
        apiCall: 'sendchat',
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
          commit('solapi/logError', {
            request: postDef,
            error: err,
          }, {root: true});
        });
    },
    parse({state, rootState, rootGetters, dispatch, commit}, chatInfo) {
      const now = rootGetters['time/now']();
      const chatData = chatInfo.chatData;
      let chat = [];
      let timestamp = null;
      let messagesFromOthers = false;

      if ((typeof chatData.chat !== 'undefined') &&
          (typeof chatData.timestamp !== 'undefined')) {
        timestamp = parseFloat(chatData.timestamp);
        if (isNaN(timestamp)) {
          timestamp = null;

        } else {
          const lastMsg = state.rooms[chatInfo.id].msgs[0];
          let chatRaw = chatData.chat;
          if (!Array.isArray(chatRaw)) {
            chatRaw = [chatData.chat];
          }

          for (let i = chatRaw.length - 1; i >= 0; i--) {
            const c = chatRaw[i];
            const timestamp = UTCToMsec(c.t);
            if (timestamp === null) {
              dispatch('diagnostics/add',
                       'Dropped message from ' + c.name + ' due to invalid timestamp: "' + c.t + '"',
                       {root: true});
              continue;
            }
            const msg = c.msg.trim()
                          .replace(/\r\n?/g, '\n')
                          .replace(/\n/g, '<br>');
            if (msg.length === 0) {
              dispatch('diagnostics/add',
                       'Dropped empty message from ' + c.name, {root: true});
              continue;
            }

            if ((typeof lastMsg !== 'undefined') && msg === lastMsg) {
              dispatch('diagnostics/add',
                       'Dropped duplicated message from ' + c.name, {root: true});
              continue;
            }
            if (c.name !== rootState.boat.name) {
              messagesFromOthers = true;
            }

            chat.push({
              id: state.chatMsgId,
              timestamp: timestamp,
              name: c.name,
              msg: msg,
            });
            commit('consumeMsgId');
          }
        }
      }
      commit('updateRoom', {
        id: chatInfo.id,
        timestamp: timestamp,
        fetchTimestamp: now,
        chat: chat,
        messagesFromOthers: messagesFromOthers,
      });
      commit('mapBoatIds', rootState.race.fleet.name2id);
    },
  }
}
