export const apiMiddleware = (/*store*/) => (next: (action: any) => any) => (action: any) => {
  if (!action.then && !action.$request) {
    return next(action);
  }
  const { meta } = action.$request;
  next({ type: action.$request.actionTypes[0] /*ACTION_START*/, meta });
  return action.then((payload: any) =>
    next({ type: action.$request.actionTypes[1] /*ACTION*/, meta, payload }),
  );
};
