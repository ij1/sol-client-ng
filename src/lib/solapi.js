export class SolapiError extends Error {
  constructor(category, message) {
    super(message);
    this.name = 'SolapiError';
    this.category = category;
  }
}

export function solapiRetryDispatch (dispatch, action, param, timeout = 10000) {
  setTimeout(() => {
    dispatch(action, param);
  }, timeout);
}

