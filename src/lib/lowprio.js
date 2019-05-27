export const lowPrioTask = (() => {
  function timer(resolve) {
    setTimeout(resolve, 0);
  }
  return {
    idle() {
      return new Promise(timer);
    }
  };
})();
