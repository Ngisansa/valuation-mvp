// initialize and export a singleton knex instance for the app/tests
const path = require('path');

// load knexfile (backend/knexfile.js)
const knexfile = require(path.join(__dirname, '..', '..', 'knexfile.js'));

const env = process.env.NODE_ENV || 'development';

// knexfile may export a function or an object with environments
let config;
if (typeof knexfile === 'function') {
  config = knexfile(env);
} else if (knexfile[env]) {
  config = knexfile[env];
} else {
  // fallback: if knexfile exports a connection string or object directly
  config = knexfile;
}

const knexLib = require('knex');
const knex = knexLib(config);

module.exports = knex;