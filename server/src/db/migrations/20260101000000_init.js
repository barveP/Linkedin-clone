'use strict';

/**
 * Initial schema for the LinkedIn Clone.
 *
 * Tables:
 *   users        — accounts + profile fields
 *   experiences  — work history rows that hang off a user (profile richness)
 *   posts        — feed posts authored by a user
 *   comments     — comments on a post
 *   likes        — likes on a post (one per user/post)
 *   connections  — connection requests / accepted links between two users
 *   activities   — append-only activity log that powers the real-time feed
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('name').notNullable();
    t.string('headline').defaultTo('');
    t.string('location').defaultTo('');
    t.text('about').defaultTo('');
    t.string('avatar_url').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('experiences', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.string('company').notNullable();
    t.string('location').defaultTo('');
    t.date('start_date');
    t.date('end_date');
    t.text('description').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['user_id']);
  });

  await knex.schema.createTable('posts', (t) => {
    t.increments('id').primary();
    t.integer('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('content').notNullable();
    t.string('image_url').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['author_id']);
    t.index(['created_at']);
  });

  await knex.schema.createTable('comments', (t) => {
    t.increments('id').primary();
    t.integer('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.integer('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('content').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['post_id']);
  });

  await knex.schema.createTable('likes', (t) => {
    t.increments('id').primary();
    t.integer('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['post_id', 'user_id']);
  });

  await knex.schema.createTable('connections', (t) => {
    t.increments('id').primary();
    t.integer('requester_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('addressee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // PENDING | ACCEPTED | DECLINED
    t.string('status').notNullable().defaultTo('PENDING');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['requester_id', 'addressee_id']);
    t.index(['addressee_id', 'status']);
  });

  await knex.schema.createTable('activities', (t) => {
    t.increments('id').primary();
    t.integer('actor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // POSTED | LIKED | COMMENTED | CONNECTED
    t.string('verb').notNullable();
    t.string('object_type').notNullable(); // post | user | comment
    t.integer('object_id');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['actor_id']);
    t.index(['created_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('activities');
  await knex.schema.dropTableIfExists('connections');
  await knex.schema.dropTableIfExists('likes');
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('posts');
  await knex.schema.dropTableIfExists('experiences');
  await knex.schema.dropTableIfExists('users');
};
