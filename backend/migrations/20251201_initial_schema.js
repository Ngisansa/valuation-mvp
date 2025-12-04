/**
 * Knex migration for initial schema
 */
exports.up = async function(knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('role').notNullable().defaultTo('user'); // user | admin
    t.timestamps(true, true);
  });

  await knex.schema.createTable('comps', (t) => {
    t.increments('id').primary();
    t.decimal('lat', 10, 6);
    t.decimal('lon', 10, 6);
    t.decimal('area_sqm', 12, 2);
    t.decimal('price', 14, 2);
    t.string('property_type');
    t.date('sale_date');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('valuations', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.string('type').notNullable(); // property | business | shares
    t.jsonb('inputs').notNullable();
    t.jsonb('methods').notNullable();
    t.jsonb('results').notNullable();
    t.decimal('confidence', 5, 2).defaultTo(0);
    t.boolean('pdf_unlocked').defaultTo(false);
    t.string('pdf_path').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('transactions', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.integer('valuation_id').unsigned().references('id').inTable('valuations').onDelete('SET NULL');
    t.string('provider'); // paypal | paystack
    t.string('provider_order_id');
    t.string('status'); // created | approved | completed | failed
    t.jsonb('payload');
    t.decimal('amount', 12, 2);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('plans', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.decimal('monthly_price', 10,2).defaultTo(0);
    t.jsonb('meta');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('subscriptions', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.integer('plan_id').unsigned().references('id').inTable('plans').onDelete('SET NULL');
    t.string('status'); // active | canceled
    t.timestamp('starts_at');
    t.timestamp('ends_at').nullable();
    t.jsonb('provider_payload');
    t.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('plans');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('valuations');
  await knex.schema.dropTableIfExists('comps');
  await knex.schema.dropTableIfExists('users');
};