import { pool } from './src/db/pool.js';

async function checkAdminRoles() {
  const client = await pool.connect();
  try {
    // Check user_roles for admin user
    const res = await client.query(
      'SELECT ur.user_id, ur.role_id, r.name as role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1',
      ['00000000-0000-0000-0000-000000000002']
    );
    console.log('Admin roles:', res.rows);
    
    // Check all roles in roles table
    const rolesRes = await client.query('SELECT id, name FROM roles');
    console.log('All roles:', rolesRes.rows);
    
    // Check the specific admin role ID
    const adminRoleRes = await client.query(
      'SELECT id, name FROM roles WHERE name = $1',
      ['admin']
    );
    console.log('Admin role:', adminRoleRes.rows[0] || 'NOT FOUND');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdminRoles();