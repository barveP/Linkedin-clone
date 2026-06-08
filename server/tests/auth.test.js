'use strict';

const { run, resetDb } = require('./helpers');

beforeEach(resetDb);

const SIGNUP = `
  mutation($input: SignupInput!) {
    signup(input: $input) { token user { id email name } }
  }
`;

describe('authentication', () => {
  test('signup creates an account and returns a token', async () => {
    const res = await run(SIGNUP, {
      variables: { input: { email: 'New.User@Example.com', password: 'secret123', name: 'New User' } },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.signup.token).toEqual(expect.any(String));

    // Email is normalized to lowercase and readable by the owner via `me`.
    const userId = Number(res.data.signup.user.id);
    const me = await run(`{ me { email } }`, { userId });
    expect(me.data.me.email).toBe('new.user@example.com');
  });

  test('a user cannot read another user’s email (PII is owner-only)', async () => {
    const a = await run(SIGNUP, {
      variables: { input: { email: 'a@example.com', password: 'secret123', name: 'A' } },
    });
    const b = await run(SIGNUP, {
      variables: { input: { email: 'b@example.com', password: 'secret123', name: 'B' } },
    });
    const aId = Number(a.data.signup.user.id);
    const bId = Number(b.data.signup.user.id);

    const asB = await run(`query($id: ID!){ user(id:$id){ name email } }`, {
      variables: { id: String(aId) },
      userId: bId,
    });
    expect(asB.data.user.name).toBe('A');
    expect(asB.data.user.email).toBeNull();
  });

  test('signup rejects a short password', async () => {
    const res = await run(SIGNUP, {
      variables: { input: { email: 'a@b.com', password: '123', name: 'A' } },
    });
    expect(res.errors[0].message).toMatch(/at least 6 characters/);
  });

  test('signup rejects a duplicate email', async () => {
    const vars = { variables: { input: { email: 'dupe@example.com', password: 'secret123', name: 'Dupe' } } };
    await run(SIGNUP, vars);
    const res = await run(SIGNUP, vars);
    expect(res.errors[0].message).toMatch(/already exists/);
  });

  test('login succeeds with valid credentials and me returns the user', async () => {
    const signup = await run(SIGNUP, {
      variables: { input: { email: 'login@example.com', password: 'secret123', name: 'Login User' } },
    });
    const userId = Number(signup.data.signup.user.id);

    const login = await run(
      `mutation { login(email: "login@example.com", password: "secret123") { token user { id } } }`
    );
    expect(login.data.login.token).toEqual(expect.any(String));

    const me = await run(`{ me { id name } }`, { userId });
    expect(me.data.me.name).toBe('Login User');
  });

  test('login fails with a wrong password', async () => {
    await run(SIGNUP, {
      variables: { input: { email: 'wrong@example.com', password: 'secret123', name: 'W' } },
    });
    const login = await run(
      `mutation { login(email: "wrong@example.com", password: "nope") { token } }`
    );
    expect(login.errors[0].message).toMatch(/Invalid email or password/);
  });

  test('me is null when unauthenticated', async () => {
    const res = await run(`{ me { id } }`);
    expect(res.data.me).toBeNull();
  });
});
