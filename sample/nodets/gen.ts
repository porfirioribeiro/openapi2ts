const codeGen = require('../..');
const path = require('path');


codeGen({
  schema: 'http://petstore.swagger.io/v2/swagger.json',
  outDir: './api',
  defaults: {
    consumes: ["application/json"],
    produces: ["application/json"],
    security: [{ api_key: [] }]
  }
});
