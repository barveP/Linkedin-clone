'use strict';

const { hashPasswordSync } = require('../../auth/password');

/**
 * Seeds a small, realistic professional network so the feed has content on a
 * fresh checkout. Every demo account uses the password: password123
 */
exports.seed = async function seed(knex) {
  // Reset in FK-safe order.
  await knex('activities').del();
  await knex('comments').del();
  await knex('likes').del();
  await knex('posts').del();
  await knex('connections').del();
  await knex('experiences').del();
  await knex('users').del();

  const hash = hashPasswordSync('password123');

  const users = await knex('users')
    .insert([
      {
        email: 'ada@example.com',
        password_hash: hash,
        name: 'Ada Lovelace',
        headline: 'Software Engineer • Distributed Systems',
        location: 'London, UK',
        about: 'Building reliable backends. Caffeine to code converter.',
        avatar_url: 'https://i.pravatar.cc/150?img=47',
      },
      {
        email: 'alan@example.com',
        password_hash: hash,
        name: 'Alan Turing',
        headline: 'Machine Learning Engineer',
        location: 'Manchester, UK',
        about: 'I like hard problems and longer walks.',
        avatar_url: 'https://i.pravatar.cc/150?img=12',
      },
      {
        email: 'grace@example.com',
        password_hash: hash,
        name: 'Grace Hopper',
        headline: 'Principal Engineer • Compilers',
        location: 'New York, USA',
        about: 'It is easier to ask forgiveness than permission.',
        avatar_url: 'https://i.pravatar.cc/150?img=32',
      },
      {
        email: 'linus@example.com',
        password_hash: hash,
        name: 'Linus Pauling',
        headline: 'Platform Engineer',
        location: 'Portland, USA',
        about: 'Infrastructure, observability, and a lot of YAML.',
        avatar_url: 'https://i.pravatar.cc/150?img=15',
      },
    ])
    .returning('*');

  const [ada, alan, grace, linus] = users;

  await knex('experiences').insert([
    { user_id: ada.id, title: 'Senior Backend Engineer', company: 'Analytical Engines', location: 'London, UK', start_date: '2021-03-01', description: 'GraphQL APIs at scale.' },
    { user_id: ada.id, title: 'Backend Engineer', company: 'Babbage Co', location: 'London, UK', start_date: '2018-06-01', end_date: '2021-02-01' },
    { user_id: alan.id, title: 'ML Engineer', company: 'Enigma Labs', location: 'Manchester, UK', start_date: '2020-01-01' },
    { user_id: grace.id, title: 'Principal Engineer', company: 'COBOL Systems', location: 'New York, USA', start_date: '2015-09-01' },
  ]);

  const posts = await knex('posts')
    .insert([
      { author_id: ada.id, content: 'Shipped a new GraphQL subscriptions layer today — real-time feeds are live! 🚀' },
      { author_id: grace.id, content: 'Reminder: the most dangerous phrase in engineering is "we have always done it this way."' },
      { author_id: alan.id, content: 'Spent the weekend tuning a model. Tiny gains, huge satisfaction.' },
      { author_id: linus.id, content: 'Migrated our event pipeline to Kafka. Throughput is looking great.' },
    ])
    .returning('*');

  await knex('connections').insert([
    { requester_id: ada.id, addressee_id: alan.id, status: 'ACCEPTED' },
    { requester_id: ada.id, addressee_id: grace.id, status: 'ACCEPTED' },
    { requester_id: alan.id, addressee_id: linus.id, status: 'ACCEPTED' },
    { requester_id: grace.id, addressee_id: linus.id, status: 'PENDING' },
  ]);

  await knex('likes').insert([
    { post_id: posts[0].id, user_id: alan.id },
    { post_id: posts[0].id, user_id: grace.id },
    { post_id: posts[1].id, user_id: ada.id },
  ]);

  await knex('comments').insert([
    { post_id: posts[0].id, author_id: grace.id, content: 'Congrats! Subscriptions are tricky to get right.' },
    { post_id: posts[3].id, author_id: ada.id, content: 'kafkajs has been solid for us too.' },
  ]);

  await knex('activities').insert([
    { actor_id: ada.id, verb: 'POSTED', object_type: 'post', object_id: posts[0].id, metadata: JSON.stringify({ preview: posts[0].content.slice(0, 80) }) },
    { actor_id: grace.id, verb: 'POSTED', object_type: 'post', object_id: posts[1].id, metadata: JSON.stringify({ preview: posts[1].content.slice(0, 80) }) },
    { actor_id: alan.id, verb: 'LIKED', object_type: 'post', object_id: posts[0].id, metadata: JSON.stringify({}) },
  ]);
};
