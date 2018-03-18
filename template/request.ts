import { ApiResponse, ReqOptions, RequestParams, OpenApiAction } from './types';

let options: ReqOptions = {
  modules: {},
  defaults: {},
  // ^^^^^ Remove ^^^^^
};

type InitializeFn = (options: ReqOptions) => Partial<ReqOptions>;

/** Initialize this api with some options */
export const initialize = (newOptions?: Partial<ReqOptions> | InitializeFn) => {
  if (newOptions)
    options = {
      ...options,
      ...(typeof newOptions === 'function' ? newOptions(options) : newOptions),
    };
};

/** Return a copy of the options object */
export const getOptions = (): ReqOptions => ({ ...options });

export interface ResponsePromise<TResponseData, TRequestOptions>
  extends PromiseLike<ApiResponse<TResponseData, TRequestOptions>> {
  type: typeof OpenApiAction;
  promise: Promise<ApiResponse<TResponseData, TRequestOptions>>;
  request: RequestParams<TRequestOptions>;
}

export const request = <TResponseData, TRequestOptions>(
  req: RequestParams<TRequestOptions>,
): ResponsePromise<TResponseData, TRequestOptions> => {
  req.module = req.module || 'default';
  const mod = options.modules[req.module];
  let resolveParams = Promise.resolve(req);
  const security = req.security !== null ? req.security || options.defaults.security : undefined;
  if (
    options.applyAuth && // Have specified a method to resolve auth
    req.security !== null && // Security is specified as null so don't try to use default security
    (security && security.length) // Have some sort of security defined
  ) {
    resolveParams = security.reduce(
      (promise, sec) =>
        promise.then(newReq => options.applyAuth!(newReq, sec, mod.security[sec.id])) as Promise<
          RequestParams<TRequestOptions>
        >,
      resolveParams,
    );
  }
  const promise: Promise<ApiResponse<TResponseData, TRequestOptions>> = resolveParams.then(p => {
    const params = options.processRequest ? options.processRequest(p) : p;

    let url = mod.url + req.uri;
    if (params.path) {
      url = Object.keys(params.path).reduce((u, p) => u.replace(`{${p}}`, params.path![p]), url);
    }
    if (params.query) {
      url += `?${Object.keys(params.query)
        .map(q => `${q}=${params.query![q]}`)
        .join('&')}`;
    }

    const produces = options.defaults.produces ? [options.defaults.produces] : req.produces;
    const consumes = options.defaults.consumes ? [options.defaults.consumes] : req.consumes;
    console.log('produces', produces);
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        Accept: produces ? produces.join(', ') : '',
        'Content-Type': consumes ? consumes[0] : '',
        ...params.header,
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    };

    return fetch(url, fetchOptions).then(parseResponse.bind(null, req));
  }) as any;
  return {
    type: OpenApiAction,
    promise,
    request: req,
    then: (th, ca) => promise.then(th, ca),
  };
};

function parseResponse(request: RequestParams<any>, res: Response) {
  // const format = response.ok ? parseResponse : formatServiceError;;
  const contentType = res.headers.get('content-type') || '';

  let parse: Promise<any> = Promise.resolve();
  if (res.status !== 204) {
    if (contentType.indexOf('json') > -1) parse = res.json();
    else if (contentType.indexOf('octet-stream') > -1) parse = res.blob();
    else if (contentType.indexOf('text') > -1) parse = res.text();
  }

  return parse.then(data => {
    console.log('parse', contentType, data);
    const parsed = { raw: res, data, request };
    if (options.formatResponse) return options.formatResponse(parsed);
    return parsed;
  });
}

export default initialize;
