import { Options as PrettierOptions } from 'prettier';

// region Spec

export interface Spec {
  swagger: string;
  info: {
    description: string;
    version: string;
    title: string;
  };
  host: string;
  basePath: string;
  tags: SpecTag[];
  schemes: string[];
  paths: { [k: string]: { [k: string]: Operation } };
  securityDefinitions: { [k: string]: SpecSecurityDefinition };
  definitions: { [k: string]: SpecDefinition };
}

export interface SpecTag {
  name: string;
  description: string;
}

export type OperationSecurity = Array<{ [k: string]: string[] }>;

export interface Operation {
  tags: string[];
  summary: string;
  description: string;
  operationId: string;
  consumes: string[];
  produces: string[];
  parameters: OperationParameter[];
  responses: { [k: string]: OperationResponse };
  security?: OperationSecurity;
  deprecated: boolean;
}

export interface OperationParameter extends SpecSchema {
  name: string;
  in: OperationParameterIN;
  description: string;
  required: boolean;
  schema: SpecSchema;
  collectionFormat: string;
}

export type OperationParameterType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'file';

export type OperationParameterIN = 'query' | 'header' | 'path' | 'formData' | 'body';

export interface OperationResponse {
  description: string;
  schema: SpecSchema;
}

export interface SpecSchema {
  type: OperationParameterType;
  format: string;
  items: SpecSchema;
  $ref: string;
  enum: string[];
  default: string;
}

interface StringMap {
  [k: string]: string;
}

export interface SpecSecurityDefinition {
  type: 'basic' | 'apiKey' | 'oauth2'; // Required. The type of the security scheme. Valid values are "basic", "apiKey" or "oauth2".
  description: string; // A short description for security scheme.
  name: string; // (type:apiKey) Required. The name of the header or query parameter to be used.
  in: 'query' | 'header'; // (type:apiKey) Required The location of the API key. Valid values are "query'|'header".
  flow: 'implicit' | 'password' | 'application' | 'accessCode'; // (type:oauth2) Required. The flow used by the OAuth2 security scheme. Valid values are "implicit", "password", "application\accessCode".
  authorizationUrl: string; // (type:oauth2) ("implicit", "accessCode") 	Required. The authorization URL to be used for this flow. This SHOULD be in the form of a URL.
  tokenUrl: string; // (type:oauth2) ("password", "application", "accessCode") 	Required. The token URL to be used for this flow. This SHOULD be in the form of a URL.
  scopes: StringMap; // oauth2 Required. The available scopes for the OAuth2 security scheme.
}

export interface SpecDefinition {
  enum?: string[];
  description?: string;
  type: SpecDefinitionType;
  properties: { [k: string]: SpecDefinition };
  required: string[];
  format: string;
  $ref: string;
  items: SpecDefinition;
}

export type SpecDefinitionType =
  | 'array'
  | 'boolean'
  | 'integer'
  | 'number'
  | 'null'
  | 'object'
  | 'string';

// endregion

export interface CodeGenOptions {
  schema: string | StringMap; // File or url to schema file
  outDir: string; // Directory to place code
  httpSchema?: 'https' | 'http';
  prettierOptions?: PrettierOptions;
  defaults: {
    consumes?: string; // Default consumes
    produces?: string; // Default produces
    security?: OperationSecurity; // Default security
  }; // Some defaults
  redux?: boolean; // Generate redux actions
  mangleActions?: boolean; // redux: mangle actions names to be smaller, useful in production
  actionTypePrefix?: string; // redux: prefix for actionType
  transformSpec?: (options: ModuleOptions, spec: Spec) => string; // Transform the Spec
  transformOperation?: (options: ModuleOptions, spec: Operation) => string; // Transform the Spec
}

export interface ModuleOptions {
  name: string; // Name of the module itself
  schema: string; // Path to the schema file
  scope: string; // Scope of the module ('moduleName.' or '')
  outDir: string; // Directory to place code for this module (options.outDir/moduleName)
  options: CodeGenOptions; // Global options
}
