const codeGen = require('../../lib/index');


codeGen({
  schema: 'http://petstore.swagger.io/v2/swagger.json',
  outDir: './api',
  genJS: true,
  defaults: {
    consumes: ["application/json"],
    produces: ["application/json"],
    security: [{api_key: []}]
  }
});
