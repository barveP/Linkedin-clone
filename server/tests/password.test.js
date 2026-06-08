'use strict';

const { hashPassword, verifyPassword, hashPasswordSync } = require('../src/auth/password');

describe('password hashing', () => {
  test('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('hunter2');
    expect(hash).not.toBe('hunter2');
    await expect(verifyPassword('hunter2', hash)).resolves.toBe(true);
  });

  test('rejects an incorrect password', async () => {
    const hash = await hashPassword('hunter2');
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  test('verify returns false for a missing hash', async () => {
    await expect(verifyPassword('anything', null)).resolves.toBe(false);
  });

  test('sync hashing also verifies', async () => {
    const hash = hashPasswordSync('password123');
    await expect(verifyPassword('password123', hash)).resolves.toBe(true);
  });
});
