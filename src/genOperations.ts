import * as _ from 'lodash';
import {
  ModuleOptions,
  Operation,
  OperationParameter,
  OperationResponse,
  Spec,
  SpecSchema,
} from './types';
import * as utils from './utils';

let moduleId = 0;

// interface Params {
//   names: { [n: string]: any };
//   paramString: any[];
// }

interface Param extends Partial<OperationParameter> {
  tsType?: string;
  value?: string;
}

interface Params {
  other: Param[];
  query?: Param[];
  header?: Param[];
  path?: Param[];
  formData?: Param[];
  body?: Param[];
}

async function genOperations(module: ModuleOptions, spec: Spec) {
  const code: { [tag: string]: string[] } = {};
  let opId = 0;
  ++moduleId;
  const redux = module.options.redux;
  const modulePath = module.name ? `/${module.name}` : '';
  const basePath = module.name ? '../' : './';
  const allOps: { [k: string]: { [k: string]: Operation } } = {};
  Object.keys(spec.paths).forEach((path: string) => {
    Object.keys(spec.paths[path]).forEach(method => {
      const op = spec.paths[path][method];
      const tag = getTag(op);
      if (!allOps[tag]) {
        allOps[tag] = { [op.operationId]: op };
      } else if (allOps[tag][op.operationId]) {
        const operationId =
          op.operationId + path.split('/').pop()!.replace(/^\w/, l => l.toUpperCase());
        console.warn(
          `'${op.operationId}' operationId is duplicated in '${
            module.name
          }#${tag}' will use '${operationId}'`,
        );
        op.operationId = operationId;
      }
      allOps[tag][op.operationId] = op;

      if (!Array.isArray(code[tag])) {
        code[tag] = [
          `${utils.fileHeader(module.options)}
           import { request, ResponsePromise } from '${basePath}';
           import * as types from "./types";
           `,
        ];
      }
      if (module.options.transformOperation) {
        module.options.transformOperation(module, op);
      }
      const params = op.parameters.reduce(
        (acc: Params, p) => {
          return {
            ...acc,
            [p.in]: (acc[p.in] || []).concat({
              ...p,
              tsType: genParameterType(module, p),
              value: `options.${p.name}`,
            }),
          };
        },
        { other: [] },
      );

      addOtherParams(module, op, params);
      const optionsType = getOptionsType(params);
      const requestArgs = optionsType.length ? [`options: {${optionsType.join(', ')}}`] : [];
      const docResponse = getDocResponse(module, op);

      if (redux) {
        const actionType = op.operationId.replace(/([A-Z]+)/g, '_$1').toUpperCase();
        const actionString = module.options.mangleActions
          ? `a/${moduleId}/${opId++}`
          : `api${modulePath}/${tag}/${op.operationId}`;
        requestArgs.push('meta?: any');
        params.other.push({ name: 'meta' });
        params.other.push({ name: 'actionTypes', value: `[${actionType}_START, ${actionType}]` });
        code[tag].push(`
export const ${actionType} = '${actionString}';
export const ${actionType}_START = '${actionString}/START';
                `);
      }

      const docs = [op.description, op.summary, op.deprecated && '@deprecated'].filter(Boolean);
      code[tag].push(`
/**
 * ${docs.join('\n * ')}
 */
export const ${op.operationId} = (${requestArgs.join(', ')}): ResponsePromise<${docResponse}> => 
    request({
        ${module.name && `module: '${module.name}',\n\t\t`}method: '${method.toUpperCase()}',
        uri: '${path}',
        ${genParams(params)}
    });
`);
    });
  });

  // console.log(allOps)
  await Promise.all(
    Object.keys(code).map(tag =>
      utils.writeFile(module.options, `${module.outDir}/${tag}.ts`, code[tag].join('')),
    ),
  );
  console.log('Gen operations', Object.keys(code).join());
}

function getOptionsType(params: Params) {
  return Object.keys(params)
    .filter(n => n !== 'other')
    .reduce(
      (acc: string[], iN: string) =>
        acc.concat(
          params[iN as keyof Params]!.map(p => `${p.name}${p.required ? ':' : '?:'} ${p.tsType}`),
        ),
      [],
    );
}

function genParams(params: Params) {
  return Object.keys(params)
    .filter(n => n !== 'other')
    .reduce(
      (acc: string[], iN: string) =>
        acc.concat([
          iN === 'body'
            ? 'body: options.body'
            : `${iN}: {${params[iN as keyof Params]!
                .map(p => `${p.name}: options.${p.name}`)
                .join(', ')}}`,
        ]),
      [],
    )
    .concat(params.other.map(p => (p.value ? `${p.name}: ${p.value}` : p.name!)))
    .join(', ');
}
// function genParams(params: Params, name: string) {
//   const param = params.names[name];
//   // console.log('genParams', name, param)
//   return Array.isArray(param)
//     ? `${name}: {\n\t\t\t${param.map(p => `${p}: options.${p}`).join(',\n\t\t\t')}\n\t\t}`
//     : param === null ? name : `${name}: ${param}`;
// }

function addOtherParams(module: ModuleOptions, op: Operation, params: Params) {
  if (!_.isEqual(op.security, module.options.defaults.security)) {
    params.other.push({
      name: 'security',
      value: JSON.stringify(op.security ? utils.transformSecurity(op.security) : null),
    });
  }
  if (op.consumes && !module.options.defaults.consumes) {
    params.other.push({
      name: 'consumes',
      value: JSON.stringify(op.consumes),
    });
  }
  if (op.produces && !module.options.defaults.produces) {
    params.other.push({
      name: 'produces',
      value: JSON.stringify(op.produces),
    });
  }

  // console.log(op.consumes, module.options.defaults.consumes, op.consumes === module.options.defaults.consumes);
}

function genParameterType(
  module: ModuleOptions,
  param: SpecSchema | OperationParameter | OperationResponse | any,
): string {
  if ('$ref' in param) {
    return 'types.' + utils.typeFromRef(param.$ref);
  }

  if ('schema' in param) {
    return genParameterType(module, param.schema as SpecSchema);
  }

  if (param.type === 'array') {
    return `${genParameterType(module, param.items)}[]`;
  }

  if (param.type === 'file') {
    return 'any';
  }

  return utils.typeFix(param.type);
}

const getTag = (op: Operation): string =>
  (op.tags && op.tags.length ? op.tags[0] : 'default').replace(/(^\d+|[^$_a-z0-9]+)/i, '');

function getDocResponse(module: ModuleOptions, op: Operation): string {
  const codes = Object.keys(op.responses).sort();
  if (!codes.length) {
    return 'object';
  }
  return genParameterType(module, op.responses[codes[0]]);
}

export default genOperations;
