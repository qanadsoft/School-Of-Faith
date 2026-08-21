import { query } from "../db/pool.js";

export async function getAdminDashboard() {
  const result = await query(
    `
      WITH member_stats AS (
        SELECT
          COUNT(DISTINCT u.id)::int AS total,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = TRUE)::int AS active
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'member'
      ),
      course_stats AS (
        SELECT COUNT(DISTINCT id)::int AS total
        FROM courses
        WHERE archived = FALSE
      ),
      enrollment_stats AS (
        SELECT
          COUNT(DISTINCT ce.id)::int AS total,
          COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'active')::int AS active,
          COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'completed')::int AS completed
        FROM course_enrollments ce
        JOIN courses c ON c.id = ce.course_id
        WHERE ce.status <> 'cancelled'
          AND c.archived = FALSE
      ),
      watch_stats AS (
        SELECT COALESCE(SUM(watch_duration_minutes), 0)::int AS total_watch_minutes
        FROM watch_history
      ),
      event_stats AS (
        SELECT
          COUNT(DISTINCT id)::int AS total,
          COUNT(DISTINCT id) FILTER (WHERE archived = FALSE)::int AS active
        FROM events
        WHERE archived = FALSE
      ),
      attendance_stats AS (
        SELECT COUNT(DISTINCT ea.id)::int AS total
        FROM event_attendance ea
        JOIN events e ON e.id = ea.event_id
        WHERE ea.status = 'attended'
          AND e.archived = FALSE
      ),
      certificate_stats AS (
        SELECT COUNT(DISTINCT cert.id)::int AS total
        FROM certificates cert
        JOIN courses c ON c.id = cert.course_id
        JOIN course_enrollments ce ON ce.course_id = cert.course_id AND ce.member_id = cert.member_id
        WHERE cert.status = 'valid'
          AND c.archived = FALSE
          AND ce.status <> 'cancelled'
      ),
      donation_stats AS (
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM donation_transactions
        WHERE payment_status = 'completed'
      ),
      prayer_stats AS (
        SELECT
          COALESCE(
            (SELECT COUNT(DISTINCT id)::int FROM prayer_requests WHERE status IN ('active', 'approved', 'pending')),
            0
          ) + COALESCE(
            (SELECT COUNT(DISTINCT CONCAT(pfa.focus_id, ':', pfa.member_id))::int FROM prayer_focus_actions pfa),
            0
          ) AS active
      ),
      activity_stats AS (
        SELECT COUNT(DISTINCT id)::int AS total
        FROM member_activity
      )
      SELECT
        (SELECT total FROM member_stats) AS total_members,
        (SELECT active FROM member_stats) AS active_members,
        (SELECT total FROM course_stats) AS active_courses,
        (SELECT total FROM enrollment_stats) AS total_enrollments,
        (SELECT active FROM enrollment_stats) AS active_enrollments,
        (SELECT total_watch_minutes FROM watch_stats) AS total_watch_hours,
        (SELECT total_watch_minutes FROM watch_stats) AS total_watch_minutes,
        (SELECT total FROM event_stats) AS total_events,
        (SELECT total FROM attendance_stats) AS total_attendance,
        (SELECT total FROM certificate_stats) AS total_certificates,
        (SELECT total FROM donation_stats) AS total_donations,
        (SELECT active FROM prayer_stats) AS active_prayer_requests,
        (SELECT total FROM activity_stats) AS recent_activity
    `
  );

  return result.rows[0];
}

export async function getAdminActivity() {
  const result = await query(
    `
      SELECT
        ma.id,
        ma.member_id,
        ma.activity_type,
        ma.description,
        ma.related_entity_type,
        ma.related_entity_id,
        ma.created_at,
        u.first_name,
        u.last_name,
        u.profile_image
      FROM member_activity ma
      LEFT JOIN users u ON u.id = ma.member_id
      ORDER BY ma.created_at DESC
      LIMIT 25
    `
  );
  return result.rows;
}

export async function listMembers() {
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
        COALESCE(
          ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::TEXT[]
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.join_date DESC
    `
  );

  return result.rows;
}

export async function getMemberById(id) {
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
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', t.id, 'name', t.name, 'color', t.color, 'textColor', t.text_color)
            ORDER BY t.name
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS tags,
        COALESCE(
          ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::TEXT[]
        ) AS roles
      FROM users u
      LEFT JOIN user_tags ut ON ut.user_id = u.id
      LEFT JOIN tags t ON t.id = ut.tag_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1
      GROUP BY u.id
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function getMemberStats(memberId) {
  const result = await query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM course_enrollments WHERE member_id = $1 AND status <> 'cancelled') AS courses,
        (SELECT COALESCE(ROUND(SUM(watch_duration_minutes)::numeric / 60), 0)::int FROM watch_history WHERE member_id = $1) AS hours_watched,
        (SELECT COUNT(*)::int FROM event_attendance WHERE member_id = $1 AND status = 'attended') AS events,
        (SELECT COUNT(*)::int FROM certificates WHERE member_id = $1 AND status = 'valid') AS certificates
    `,
    [memberId]
  );
  return result.rows[0];
}

export async function getTableRows(tableName, orderBy) {
  const validTables = [
    'member_activity',
    'courses',
    'course_enrollments',
    'course_purchases',
    'watch_history',
    'events',
    'certificates',
    'reading_plans',
    'messages',
    'downloads',
    'donation_transactions',
    'prayer_requests',
    'event_tickets',
    'tags',
  ];

  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
  const result = await query(`SELECT * FROM ${tableName} ${orderClause}`);
  return result.rows;
}
