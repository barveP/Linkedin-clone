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

describe('posts, feed and likes', () => {
  test('createPost requires authentication', async () => {
    const res = await run(`mutation{ createPost(content:"hi"){ id } }`);
    expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  test('rejects an empty post', async () => {
    const uid = await makeUser('ada@test.com', 'Ada');
    const res = await run(`mutation{ createPost(content:"   "){ id } }`, { userId: uid });
    expect(res.errors[0].message).toMatch(/cannot be empty/);
  });

  test('createPost appears in the author feed', async () => {
    const uid = await makeUser('ada@test.com', 'Ada');
    const created = await run(
      `mutation{ createPost(content:"Hello world"){ id content author{ name } } }`,
      { userId: uid }
    );
    expect(created.data.createPost.author.name).toBe('Ada');

    const feed = await run(`{ feed{ id content } }`, { userId: uid });
    expect(feed.data.feed).toHaveLength(1);
    expect(feed.data.feed[0].content).toBe('Hello world');
  });

  test('likes are counted and idempotent, and likedByMe reflects the viewer', async () => {
    const ada = await makeUser('ada@test.com', 'Ada');
    const bob = await makeUser('bob@test.com', 'Bob');
    const post = await run(`mutation{ createPost(content:"Like me"){ id } }`, { userId: ada });
    const postId = post.data.createPost.id;

    await run(`mutation($p: ID!){ likePost(postId:$p){ id } }`, { variables: { p: postId }, userId: bob });
    // Liking again must not double-count.
    await run(`mutation($p: ID!){ likePost(postId:$p){ id } }`, { variables: { p: postId }, userId: bob });

    const asBob = await run(`query($p: ID!){ post(id:$p){ likeCount likedByMe } }`, {
      variables: { p: postId },
      userId: bob,
    });
    expect(asBob.data.post.likeCount).toBe(1);
    expect(asBob.data.post.likedByMe).toBe(true);

    const asAda = await run(`query($p: ID!){ post(id:$p){ likedByMe } }`, {
      variables: { p: postId },
      userId: ada,
    });
    expect(asAda.data.post.likedByMe).toBe(false);

    // Unlike returns to zero.
    await run(`mutation($p: ID!){ unlikePost(postId:$p){ id } }`, { variables: { p: postId }, userId: bob });
    const after = await run(`query($p: ID!){ post(id:$p){ likeCount } }`, { variables: { p: postId }, userId: bob });
    expect(after.data.post.likeCount).toBe(0);
  });

  test('comments are recorded with their author', async () => {
    const ada = await makeUser('ada@test.com', 'Ada');
    const bob = await makeUser('bob@test.com', 'Bob');
    const post = await run(`mutation{ createPost(content:"Discuss"){ id } }`, { userId: ada });
    const postId = post.data.createPost.id;

    await run(`mutation($p: ID!){ commentOnPost(postId:$p, content:"Nice!"){ id } }`, {
      variables: { p: postId },
      userId: bob,
    });

    const res = await run(`query($p: ID!){ post(id:$p){ commentCount comments{ content author{ name } } } }`, {
      variables: { p: postId },
      userId: ada,
    });
    expect(res.data.post.commentCount).toBe(1);
    expect(res.data.post.comments[0]).toEqual({ content: 'Nice!', author: { name: 'Bob' } });
  });
});
