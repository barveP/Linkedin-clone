'use strict';

const { run, resetDb } = require('./helpers');

async function makeUser(email, name) {
  const res = await run(
    `mutation($i: SignupInput!){ signup(input:$i){ user{ id } } }`,
    { variables: { i: { email, password: 'secret123', name } } }
  );
  return Number(res.data.signup.user.id);
}

beforeEach(resetDb);

describe('connections', () => {
  test('request -> accept flow links two users', async () => {
    const ada = await makeUser('ada@test.com', 'Ada');
    const bob = await makeUser('bob@test.com', 'Bob');

    // Ada requests Bob.
    const reqRes = await run(`mutation($u: ID!){ sendConnectionRequest(userId:$u){ id status } }`, {
      variables: { u: String(bob) },
      userId: ada,
    });
    expect(reqRes.data.sendConnectionRequest.status).toBe('PENDING');
    const connId = reqRes.data.sendConnectionRequest.id;

    // Bob sees a pending request.
    const pending = await run(`{ connectionRequests{ id requester{ name } } }`, { userId: bob });
    expect(pending.data.connectionRequests).toHaveLength(1);
    expect(pending.data.connectionRequests[0].requester.name).toBe('Ada');

    // Bob accepts.
    await run(`mutation($c: ID!){ respondConnectionRequest(connectionId:$c, accept:true){ status } }`, {
      variables: { c: connId },
      userId: bob,
    });

    // Both now list each other as a connection.
    const adaConns = await run(`{ connections{ name } }`, { userId: ada });
    expect(adaConns.data.connections.map((u) => u.name)).toContain('Bob');

    const bobConns = await run(`{ connections{ name } }`, { userId: bob });
    expect(bobConns.data.connections.map((u) => u.name)).toContain('Ada');
  });

  test('cannot connect with yourself', async () => {
    const ada = await makeUser('ada@test.com', 'Ada');
    const res = await run(`mutation($u: ID!){ sendConnectionRequest(userId:$u){ id } }`, {
      variables: { u: String(ada) },
      userId: ada,
    });
    expect(res.errors[0].message).toMatch(/cannot connect with yourself/i);
  });

  test('connectionStatus reflects the viewer relationship', async () => {
    const ada = await makeUser('ada@test.com', 'Ada');
    const bob = await makeUser('bob@test.com', 'Bob');

    const before = await run(`query($id: ID!){ user(id:$id){ connectionStatus } }`, {
      variables: { id: String(bob) },
      userId: ada,
    });
    expect(before.data.user.connectionStatus).toBe('NONE');

    await run(`mutation($u: ID!){ sendConnectionRequest(userId:$u){ id } }`, {
      variables: { u: String(bob) },
      userId: ada,
    });

    const sent = await run(`query($id: ID!){ user(id:$id){ connectionStatus } }`, {
      variables: { id: String(bob) },
      userId: ada,
    });
    expect(sent.data.user.connectionStatus).toBe('REQUEST_SENT');

    const received = await run(`query($id: ID!){ user(id:$id){ connectionStatus } }`, {
      variables: { id: String(ada) },
      userId: bob,
    });
    expect(received.data.user.connectionStatus).toBe('REQUEST_RECEIVED');
  });

  test('feed includes posts from accepted connections', async () => {
    const ada = await makeUser('ada@test.com', 'Ada');
    const bob = await makeUser('bob@test.com', 'Bob');

    const req = await run(`mutation($u: ID!){ sendConnectionRequest(userId:$u){ id } }`, {
      variables: { u: String(bob) },
      userId: ada,
    });
    await run(`mutation($c: ID!){ respondConnectionRequest(connectionId:$c, accept:true){ status } }`, {
      variables: { c: req.data.sendConnectionRequest.id },
      userId: bob,
    });

    await run(`mutation{ createPost(content:"Bob's update"){ id } }`, { userId: bob });

    const adaFeed = await run(`{ feed{ content author{ name } } }`, { userId: ada });
    expect(adaFeed.data.feed.map((p) => p.content)).toContain("Bob's update");
  });
});
