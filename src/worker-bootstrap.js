'use strict';

const { createGenerator } = require('./composition/create-generator.js');
const generator = createGenerator();

self.onmessage = event => {
  try { self.postMessage({ result: generator.execute(event.data) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
