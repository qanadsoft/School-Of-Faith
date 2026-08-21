import pg from 'pg';
import { config } from './src/config.js';

const { Pool } = pg;

// Connect to default 'postgres' database to create our database
const adminPool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345',
  database: 'postgres',
});

async function createDatabase() {
  try {
    console.log('Creating database school_of_faith...');
    await adminPool.query('CREATE DATABASE school_of_faith');
    console.log('✓ Database created successfully');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('✓ Database already exists');
    } else {
      console.error('Failed to create database:', error.message);
      process.exit(1);
    }
  } finally {
    await adminPool.end();
  }
}

createDatabase();
