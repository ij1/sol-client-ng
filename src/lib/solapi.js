export const SOLAPI_MIN_DELAY = 15000;
export const SOLAPI_MAX_DECAY = 0.99;

export class SolapiError extends Error {
  constructor(category, message) {
    super(message);
    this.name = 'SolapiError';
    this.category = category;
  }
}

export class SolapiDataError extends SolapiError {
  constructor(message) {
    super('data', message);
    this.name = 'SolapiDataError';
  }
}

export function solapiRetryDispatch (dispatch, action, param, timeout = 10000) {
  setTimeout(() => {
    dispatch(action, param);
  }, timeout);
}

