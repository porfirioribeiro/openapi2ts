import { OpenApiAction } from './types';
import { ResponsePromise } from './request';
// ^^^^^ Remove ^^^^^

type Dispatcher = (action: any) => any;
type ActionType = ResponsePromise<any, any> | any;
export const apiMiddleware = (/*store*/) => (next: Dispatcher) => (action: ActionType) => {
  if (action.type !== OpenApiAction) return next(action);

  const { meta, actionType } = action.request;
  next({ type: `${actionType}_START` /*ACTION_START*/, meta, request: action.request });
  return action.then(
    (payload: any) => next({ type: actionType /*ACTION*/, meta, request: action.request, payload }),
    (error: any) =>
      next({ type: `${actionType}_ERROR` /*ACTION_ERROR*/, meta, request: action.request, error }),
  );
};
