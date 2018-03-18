export interface Security {
  id: string;
  scopes?: string[];
}

export interface StringMap {
  [name: string]: string;
}
export interface ParamsMap {
  [name: string]: any;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestParams<TRequestOptions> = TRequestOptions extends any
  ? {
      module?: string;
      method: HttpMethod;
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
      actionType?: string;
      options: TRequestOptions;
    }
  : {
      module?: string;
      method: HttpMethod;
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
      actionType?: string;
    };

export interface SecurityOptions {
  type: 'oauth2' | 'apiKey' | string; // Todo check all options
  name?: string;
  authorizationUrl?: string;
  flow?: 'implicit' | string; // Todo check all options
  scopes?: StringMap;
  in?: 'header' | string; // Todo check all options
}

export interface ApiResponse<TResponseData = any, TRequestOptions = any> {
  raw: Response;
  request: RequestParams<TRequestOptions>;
  data: TResponseData;
  error?: boolean;
}

export interface ReqOptions {
  modules: {
    [key: string]: {
      url: string;
      security: { [key: string]: SecurityOptions };
    };
  };
  defaults: {
    consumes?: string | null;
    produces?: string | null;
    security?: Security[] | null;
  };
  applyAuth?: (
    p: RequestParams<any>,
    s: Security,
    securityOption: SecurityOptions,
  ) => Promise<RequestParams<any>>;
  processRequest?: (p: RequestParams<any>) => RequestParams<any>;
  formatResponse?: (apiResponse: ApiResponse) => ApiResponse;
}

export const OpenApiAction = Symbol('OpenApiAction');
