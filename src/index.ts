import * as fs from 'fs-extra';
import fetch from 'node-fetch';
import * as ts from 'typescript';
import genDefinitions from './genDefinitions';
import genOperations from './genOperations';
import genRequest from './genRequest';
import { CodeGenOptions, ModuleOptions, Spec, StringMap } from './types';

/**
 * Load the spec from JSON
 */
const loadSpec = async (module: ModuleOptions): Promise<Spec | null> => {
  console.log(`Loading schema for module: ${module.name} - ${module.schema}`);
  try {
    return /^https?:\/\//im.test(module.schema)
      ? await (await fetch(module.schema)).json()
      : JSON.parse((await fs.readFile(module.schema)).toString());
  } catch (e) {
    die(
      `Failed to load schema for module: ${module.name} - it does not exist or is invalid: ${
        module.schema
      }\n\t${e.message}`,
    );

    return null;
  }
};

/**
 * Generate code from schema
 */
async function codeGen(options: CodeGenOptions) {
  console.time('Gen');
  console.time('GenTS');
  const modules: ModuleOptions[] = [];
  if (typeof options.outDir === 'undefined') {
    die('Missing option outDir on genSpec');
  }
  options._internal = {
    tsFiles: [],
  };

  await fs.remove(options.outDir);

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
    die('options.schema has to be either a string or an object');
  }
  if (!options.defaults) {
    options.defaults = {};
  }

  const specs = (await Promise.all(
    modules.map(async module => {
      const spec = await loadSpec(module);
      if (spec === null || !spec.definitions) {
        die(
          `Failed to load schema for module: ${module.name} - it does not exist or is invalid: ${
            module.schema
          }`,
        );
      } else {
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
  console.timeEnd('GenTS');
  if (options.genJS) {
    console.time('GenJS');
    let program = ts.createProgram(options._internal.tsFiles, {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.None,
      declaration: true,
      declarationDir: options.outDir,
      // strict: true,
      // noImplicitAny: true,
      // noImplicitReturns: true,
      // noStrictGenericChecks: false,
      // skipLibCheck: true,
      // isolatedModules: false,
    });
    let emitResult = program.emit();
    emitResult.diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
      }
    });

    options._internal.tsFiles.forEach(file => {
      fs.unlinkSync(file);
    });
    if (emitResult.emitSkipped) console.error('Failed to convert ts to JS');
    console.timeEnd('GenJS');
  } else console.log('All done');
  console.timeEnd('Gen');
}

function die(text: string) {
  console.error(text);
  process.exit(1);
}

export default codeGen;
