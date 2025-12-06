require('dotenv').config();
const connection = process.env.DATABASE_URL || (process.env.NODE_ENV === 'test' ? 'sqlite3://:memory:' : 'postgres://valuecog:valuecogpass@db:5432/valuecogdb');

module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'valuecog',
      password: process.env.DB_PASSWORD || 'valuecogpass',
      database: process.env.DB_NAME || 'valuecogdb'
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  }
};