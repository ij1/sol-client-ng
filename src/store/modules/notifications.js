export default {
  namespaced: true,

  state: {
    notifications: [],
    idCount: 0,
  },

  mutations: {
    /* Call add action instead to get notification metadata set correctly */
    add (state, notification) {
      notification.id = state.idCount++;
      state.notifications.push(notification);
    },
    clear (state) {
      state.notifications = [];
    },
  },

  actions: {
    add ({rootGetters, commit}, notification) {
      notification.time = rootGetters['time/now']();
      if (typeof notification.color === 'undefined') {
        notification.color = 'black';
      }
      commit('add', notification);
    },
  },
}
