const Module = require('module');
const path = require('path');

const serverOnlyShim = path.join(__dirname, 'shims', 'server-only.js');
const resolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveWithServerOnlyShim(request, parent, isMain, options) {
  if (request === 'server-only') {
    return serverOnlyShim;
  }

  return resolveFilename.call(this, request, parent, isMain, options);
};
