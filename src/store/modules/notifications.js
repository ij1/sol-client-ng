export default {
  namespaced: true,

  state: {
    notifications: [],
    idCount: 0,
  },

  mutations: {
    add (state, notification) {
      notification.time = Date.now();
      if (typeof notification.color === 'undefined') {
        notification.color = 'black';
      }
      notification.id = state.idCount++;
      state.notifications.push(notification);
      
    },
    clear (state) {
      state.notifications = [];
    },
  },
}