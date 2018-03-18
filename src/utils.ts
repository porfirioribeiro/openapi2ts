import * as fs from 'fs-extra';
import * as prettier from 'prettier';
import { CodeGenOptions, OperationSecurity, SpecDefinitionType } from './types';

export function typeFromRef(ref: string) {
  return ref.replace(/.*\/(\w+)$/g, '$1');
}

export function typeFix(type: SpecDefinitionType) {
  if (type === undefined) {
    return 'object';
  }
  return type === 'integer' ? 'number' : type;
}

export function fileHeader(_: CodeGenOptions) {
  return `/**\n * Auto-generated, do not edit, it will be overwritten\n * https://github.com/porfirioribeiro/openapi2ts\n */`;
}

export function transformSecurity(security?: OperationSecurity) {
  // console.log('trans', security);
  if (!security || security.length === 0) {
    return null;
  }
  return security.map(securityDefinition => {
    if (securityDefinition.id) {
      return securityDefinition;
    }
    const id = Object.keys(securityDefinition)[0];
    return securityDefinition[id].length ? { id, scopes: securityDefinition[id] } : { id };
  });
}

export function writeFile(options: CodeGenOptions, fileName: string, tsCode: string) {
  if (!fileName.endsWith('.d.ts')) options._internal!.tsFiles.push(fileName);
  return fs.outputFile(
    fileName,
    prettier.format(tsCode, {
      ...options.prettierOptions,
      parser: 'typescript',
    }),
  );
}

const removeTpl = '// ^^^^^ Remove ^^^^^';
export function loadTemplate(file: string) {
  const request: string = fs.readFileSync(file) + '';

  const index = request.indexOf(removeTpl);

  return (index > -1 ? request.slice(index + removeTpl.length) : request) + '\n';
}
