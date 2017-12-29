// import { initialize, RequestParams, Security, SecurityOptions } from './api';
const { getPetById } =require('./api/pet') ;

global.fetch = require('node-fetch');

// initialize({
//   async applyAuth(p: RequestParams, s: Security, securityOption: SecurityOptions, moduleName:string): Promise<RequestParams> {
//     console.log('applyAuth', moduleName);
//     return await p;
//   },
// });

async function main() {
  const pet = await getPetById({ petId: 10 });
  console.log('pet', pet);
}

main();
