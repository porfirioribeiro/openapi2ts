/**
 * @author Porfírio Ribeiro
 */
import * as utils from './utils';

import { ModuleOptions, Spec, SpecDefinition } from './types';

async function genDefinitions(module: ModuleOptions, spec: Spec) {
  let code = utils.fileHeader(module.options);
  code += Object.keys(spec.definitions)
    .map(name => genDefinition(module, name, spec.definitions[name]))
    .join('');
  await utils.writeFile(module.options, `${module.outDir}/types.d.ts`, code);
  console.log('Generated definition', `${module.outDir}/types.d.ts`);
}

function genDefinition(module: ModuleOptions, name: string, def: SpecDefinition) {
  const properties = Object.keys(def.properties).map(propertyName =>
    genDefinitionProp(
      module,
      propertyName,
      def.properties[propertyName],
      def.required && def.required.indexOf(propertyName) > -1,
    ),
  );
  return `\nexport interface ${name} {
${properties.join('\n')}
}\n`;
}

function genDefinitionProp(
  module: ModuleOptions,
  name: string,
  property: SpecDefinition,
  required = false,
) {
  const description = property.description ? ` // ${property.description}` : '';
  return `${name}${required ? ':' : '?:'} ${genPropertyType(module, property)}${description}`;
}

function genPropertyType(module: ModuleOptions, property: SpecDefinition): string {
  if (property.enum) {
    return property.enum.map(JSON.stringify as any).join(' | ');
  }
  if (property.$ref) {
    return utils.typeFromRef(property.$ref);
  }
  if (property.type === 'array') {
    return `${genPropertyType(module, property.items)}[]`;
  }
  return utils.typeFix(property.type);
}

export default genDefinitions;
