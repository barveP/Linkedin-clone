'use strict';

const knexFactory = require('knex');
const knexConfig = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knexFactory(knexConfig[env] || knexConfig.development);

module.exports = db;
