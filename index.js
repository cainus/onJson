var dir = './lib/';
if (process.env.ONJSON_COVERAGE){
  dir = './lib-cov/';
}
module.exports = require(dir + 'onJsonMiddleware');

