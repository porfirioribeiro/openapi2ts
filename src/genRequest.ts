import * as path from 'path';
import { CodeGenOptions, ModuleOptions, Spec } from './types';
import * as utils from './utils';
/**
 *
 * @param {ModuleOptions[]} modules
 * @param {Spec[]} specs
 * @param {CodeGenOptions} options
 */
async function genRequest(modules: ModuleOptions[], specs: Spec[], options: CodeGenOptions) {
  const typesTemplate = utils.loadTemplate(path.resolve(__dirname, '../template/types.ts'));

  const httpSchema = options.httpSchema || (specs[0].schemes ? specs[0].schemes[0] : 'https');
  let code = `${utils.fileHeader(options)}
${typesTemplate}
let options: ReqOptions = {
    modules: {
        ${modules
          .map(
            (module, i) => `${module.name || 'default'}: {
            url: '${httpSchema}://${specs[i].host}${specs[i].basePath}',
            security: ${JSON.stringify(specs[i].securityDefinitions)}
        },`,
          )
          .join('')}    
    },
    defaults: ${JSON.stringify({
      ...options.defaults,
      security: utils.transformSecurity(options.defaults && options.defaults.security),
    })},
`; //This object will be close on the request.ts template
  code += utils.loadTemplate(path.resolve(__dirname, '../template/request.ts'));

  if (options.redux && options.reduxMiddleware !== false) {
    code += utils.loadTemplate(path.resolve(__dirname, '../template/reduxMiddleware.ts'));
  }
  await utils.writeFile(options, `${options.outDir}/index.ts`, code);
  // await fs.outputFile('/index.js', code + template);
}

export default genRequest;
