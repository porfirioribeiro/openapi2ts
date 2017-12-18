export interface Security {
  id: string;
  scopes?: string[];
}

interface StringMap {
  [name: string]: string;
}
interface ParamsMap {
  [name: string]: any;
}

export interface RequestParams {
  module?: string;
  method: string;
  uri: string;
  path?: ParamsMap;
  query?: ParamsMap;
  formData?: ParamsMap;
  header?: ParamsMap;
  security?: Security[] | null;
  produces?: string[];
  consumes?: string[];
  body?: object;
  meta?: object;
  actionTypes?: string[];
}

export interface SecurityOptions {
  type: 'oauth2' | 'apiKey' | string; // Todo check all options
  name?: string;
  authorizationUrl?: string;
  flow?: 'implicit' | string; // Todo check all options
  scopes?: StringMap;
  in?: 'header' | string; // Todo check all options
}

export interface ReqOptions {
  applyAuth?: (p: RequestParams, s: Security, securityOption: SecurityOptions, moduleName: string) => Promise<RequestParams>;
  modules: {
    [key: string]: {
      url: string;
      security: { [key: string]: SecurityOptions };
    };
  };
  defaults: { consumes?: string[]; produces?: string[]; security?: Security[] };
}
