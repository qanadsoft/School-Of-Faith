import { query } from "../db/pool.js";

export async function getUserById(id) {
  const result = await query(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        u.bio,
        u.join_date,
        u.membership_type,
        u.membership_status,
        u.is_active,
        u.password_hash,
        COALESCE(
          ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::TEXT[]
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1
      GROUP BY u.id
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function getUserByEmail(email) {
  const result = await query(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        u.bio,
        u.join_date,
        u.membership_type,
        u.membership_status,
        u.is_active,
        u.password_hash,
        COALESCE(
          ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::TEXT[]
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE LOWER(u.email) = LOWER($1)
      GROUP BY u.id
    `,
    [email]
  );

  return result.rows[0] || null;
}

export function serializeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    profile_image: user.profile_image,
    avatar_url: user.profile_image,
    bio: user.bio,
    join_date: user.join_date,
    membership_type: user.membership_type,
    membership_status: user.membership_status,
    is_active: user.is_active,
    roles: user.roles || [],
    role: user.roles?.includes("admin") ? "admin" : "member",
  };
}
