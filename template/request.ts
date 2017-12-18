import { ReqOptions, RequestParams } from './types';

let options: ReqOptions;
// ^^^^^ Remove ^^^^^

type InitializeFn = (options: ReqOptions) => Partial<ReqOptions>;

/** Initialize this api with some options */
export const initialize = (newOptions?: Partial<ReqOptions> | InitializeFn) => {
  if (newOptions)
    options = {
      ...options,
      ...typeof newOptions === 'function' ? newOptions(options) : newOptions,
    };
};

/** Return a copy of the options object */
export const getOptions = (): ReqOptions => ({ ...options });

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ResponsePromise<T> = Promise<T> & { $request: any };

export const request = <T>(req: RequestParams): ResponsePromise<T> => {
    let moduleName = req.module || 'default';
    const mod = options.modules[moduleName];
  let resolveParams = Promise.resolve(req);
  const security = req.security !== null ? req.security || options.defaults.security : undefined;
  if (
    options.applyAuth && // Have specified a method to resolve auth
    req.security !== null && // Security is specified as null so don't try to use default security
    (security && security.length) // Have some sort of security defined
  ) {
    resolveParams = security.reduce(
      (promise, sec) =>
        promise.then(newReq => options.applyAuth!(newReq, sec, mod.security[sec.id], moduleName)),
      resolveParams,
    );
  }
  const r: ResponsePromise<T> = resolveParams.then(params => {
    let url = mod.url + req.uri;
    if (params.path) {
      url = Object.keys(params.path).reduce((u, p) => u.replace(`{${p}}`, params.path![p]), url);
    }
    if (params.query) {
      url +=
        '?' +
        Object.keys(params.query)
          .map(q => `${q}=${params.query![q]}`)
          .join('&');
    }

    const produces = req.produces || options.defaults.produces;
    const consumes = req.consumes || options.defaults.consumes;
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        Accept: produces ? produces.join(', ') : '',
        'Content-Type': consumes ? consumes[0] : '',
        ...params.header,
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    };

    return fetch(url, fetchOptions).then((res: Response) => {
      // const format = response.ok ? formatResponse : formatServiceError;;
      const contentType = res.headers.get('content-type') || '';

      let parse;
      if (res.status === 204) {
        parse = Promise.resolve();
      } else if (contentType.indexOf('json')) {
        parse = res.json();
      } else if (contentType.indexOf('octet-stream')) {
        parse = res.blob();
      } else if (contentType.indexOf('text')) {
        parse = res.text();
      } else {
        parse = Promise.resolve();
      }
      return parse;
    });
  }) as any;
  r.$request = req;
  return r;
};

export default initialize;
