'use strict';

const bcrypt = require('bcryptjs');

const ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// Synchronous variant used by DB seeds (no async context there).
function hashPasswordSync(plain) {
  return bcrypt.hashSync(plain, ROUNDS);
}

module.exports = { hashPassword, verifyPassword, hashPasswordSync };
