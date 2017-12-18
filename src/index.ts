import * as fs from 'fs-extra';
import fetch from 'node-fetch';
import genDefinitions from './genDefinitions';
import genOperations from './genOperations';
import genRequest from './genRequest';
import { CodeGenOptions, ModuleOptions, Spec, StringMap } from './types';

/**
 * Load the spec from JSON
 */
const loadSpec = async (options: ModuleOptions): Promise<Spec | null> => {
  try {
    return /^https?:\/\//im.test(options.schema)
      ? await (await fetch(options.schema)).json()
      : JSON.parse((await fs.readFile(options.schema)).toString());
  } catch (e) {
    console.error('Error loading spec', module.filename);
    console.error('\t', e.message);
    return null;
  }
};

/**
 * Generate code from schema
 */
async function codeGen(options: CodeGenOptions) {
  const modules: ModuleOptions[] = [];
  if (typeof options.outDir === 'undefined') {
    throw new Error('Missing option outDir on genSpec');
  }
  if (typeof options.schema === 'string') {
    modules.push({ options, name: '', scope: '', outDir: options.outDir, schema: options.schema });
  } else if (typeof options.schema === 'object') {
    Object.keys(options.schema).map((name: string) =>
      modules.push({
        name,
        options,
        outDir: `${options.outDir}/${name}`,
        schema: (options.schema as StringMap)[name],
        scope: `${name}.`,
      }),
    );
  } else {
    console.error('options.schema has to be either a string or an object');
  }
  if (!options.defaults) {
    options.defaults = {};
  }

  await fs.remove(options.outDir);

  const specs = (await Promise.all(
    modules.map(async module => {
      const spec = await loadSpec(module);
      if (spec !== null) {
        if (options.transformSpec) {
          options.transformSpec(module, spec);
        }
        await genDefinitions(module, spec);
        await genOperations(module, spec);
        console.log(`Generated: ${spec.info.title} on ${module.outDir}`);
      }

      return spec;
    }),
  )) as Spec[];
  try {
    await genRequest(modules, specs, options);
  } catch (_) {
    /**/
  }
}

module.exports = codeGen;
