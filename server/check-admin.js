import { pool } from './src/db/pool.js';

async function checkAdmin() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT u.id, u.email, u.password_hash, r.name as role FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE u.email = $1',
      ['admin@example.com']
    );
    console.log('Admin user:', res.rows[0] ? res.rows[0] : 'NOT FOUND');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdmin();