export class SkipThenError extends Error {}

export function solapiLogError (err) {
  if (err instanceof SkipThenError) {
    return;
  }
  console.log(err);
}

export function solapiRetryDispatch (dispatch, action, param, timeout = 10000) {
  setTimeout(() => {
    dispatch(action, param);
  }, timeout);
}

