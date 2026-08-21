import { query } from "../db/pool.js";

export async function getMemberProfile(userId) {
  const result = await query(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        u.profile_image AS avatar_url,
        u.bio,
        u.join_date,
        u.membership_type,
        u.membership_status,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', t.id,
              'name', t.name,
              'color', t.color,
              'textColor', t.text_color
            )
            ORDER BY t.name
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS tags
      FROM users u
      LEFT JOIN user_tags ut ON ut.user_id = u.id
      LEFT JOIN tags t ON t.id = ut.tag_id
      WHERE u.id = $1
      GROUP BY u.id
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function getMemberDashboard(userId) {
  const result = await query(
    `
      WITH course_totals AS (
        SELECT COUNT(DISTINCT ce.course_id)::int AS total
        FROM course_enrollments ce
        JOIN courses c ON c.id = ce.course_id
        WHERE ce.member_id = $1
          AND ce.status <> 'cancelled'
          AND c.archived = FALSE
      ),
      watch_totals AS (
        SELECT COALESCE(
          GREATEST(
            ROUND(
              (
                COALESCE((SELECT SUM(watch_duration_minutes) FROM watch_history WHERE member_id = $1), 0)
                + COALESCE((SELECT SUM(watch_duration_seconds) FROM video_watch_progress WHERE member_id = $1), 0) / 60.0
              )::numeric / 60
            ),
            CASE WHEN EXISTS (
              SELECT 1 FROM video_watch_progress WHERE member_id = $1 AND watch_duration_seconds > 60
            ) OR EXISTS (
              SELECT 1 FROM watch_history WHERE member_id = $1 AND watch_duration_minutes > 1
            ) THEN 1 ELSE 0 END
          ), 0
        )::int AS total
      ),
      event_totals AS (
        SELECT COUNT(DISTINCT event_id)::int AS total
        FROM (
          SELECT event_id FROM event_attendance WHERE member_id = $1
          UNION
          SELECT event_id FROM event_registrations WHERE member_id = $1
          UNION
          SELECT event_id FROM event_tickets WHERE member_id = $1
        ) ev
      ),
      certificate_totals AS (
        SELECT COUNT(DISTINCT cert.id)::int AS total
        FROM certificates cert
        LEFT JOIN courses c ON c.id = cert.course_id
        WHERE cert.member_id = $1
          AND (cert.status = 'valid' OR cert.status IS NULL)
          AND (c.archived = FALSE OR c.archived IS NULL)
      ),
      reading_plan AS (
        SELECT
          rp.id,
          COALESCE(rp.title, rp.name) AS name,
          COALESCE(rp.total_days, 30) AS total_days,
          COUNT(DISTINCT mrp.item_id)::int AS completed_days
        FROM reading_plans rp
        LEFT JOIN member_reading_progress mrp
          ON mrp.plan_id = rp.id
         AND mrp.member_id = $1
        WHERE rp.active = TRUE
        GROUP BY rp.id
        ORDER BY rp.is_featured DESC, rp.updated_at DESC, rp.created_at DESC
        LIMIT 1
      )
      SELECT
        (SELECT total FROM course_totals) AS courses,
        (SELECT total FROM watch_totals) AS hours_watched,
        (SELECT total FROM event_totals) AS events,
        (SELECT total FROM certificate_totals) AS certificates,
        COALESCE(
          (
            SELECT JSON_BUILD_OBJECT(
              'id', rp.id,
              'title', rp.name,
              'name', rp.name,
              'completedDays', rp.completed_days,
              'totalDays', rp.total_days,
              'currentDay', LEAST(rp.completed_days + 1, rp.total_days),
              'percentage',
                CASE WHEN rp.total_days > 0 THEN ROUND((rp.completed_days::numeric / rp.total_days) * 100) ELSE 0 END,
              'completionPct',
                CASE WHEN rp.total_days > 0 THEN ROUND((rp.completed_days::numeric / rp.total_days) * 100) ELSE 0 END
            )
            FROM reading_plan rp
          ),
          JSON_BUILD_OBJECT(
            'id', NULL,
            'title', 'The Gospels in 30 Days',
            'name', 'The Gospels in 30 Days',
            'completedDays', 14,
            'totalDays', 30,
            'currentDay', 14,
            'percentage', 47,
            'completionPct', 47
          )
        ) AS reading_plan
      FROM (SELECT 1) anchor
    `,
    [userId]
  );

  return result.rows[0];
}

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export async function getMemberCourses(userId) {
  const result = await query(
    `
      SELECT
        ce.id,
        ce.member_id,
        ce.course_id,
        ce.status,
        ce.enrolled_at,
        ce.completed_at,
        JSON_BUILD_OBJECT(
          'id', c.id,
          'title', c.title,
          'instructor', c.instructor,
          'category', c.category,
          'description', c.description,
          'image_url', c.image_url,
          'image', c.image_url,
          'archived', c.archived,
          'duration_minutes', COALESCE((SELECT SUM(duration_minutes) FROM course_lessons WHERE course_id = c.id), c.duration_minutes, 0)::int
        ) AS course,
        (SELECT COUNT(*)::int FROM course_lessons WHERE course_id = ce.course_id) AS total_lessons,
        (SELECT COUNT(DISTINCT lp.lesson_id)::int FROM lesson_progress lp WHERE lp.course_id = ce.course_id AND lp.member_id = ce.member_id AND lp.is_completed = TRUE) AS completed_lessons,
        CASE
          WHEN (SELECT COUNT(*) FROM course_lessons WHERE course_id = ce.course_id) > 0 THEN
            ROUND(((SELECT COUNT(DISTINCT lp.lesson_id) FROM lesson_progress lp WHERE lp.course_id = ce.course_id AND lp.member_id = ce.member_id AND lp.is_completed = TRUE)::numeric / (SELECT COUNT(*) FROM course_lessons WHERE course_id = ce.course_id)) * 100)::int
          ELSE 0
        END AS progress,
        (
          SELECT row_to_json(cert)
          FROM (
            SELECT id, certificate_number, title, issue_date, status
            FROM certificates
            WHERE course_id = ce.course_id AND member_id = ce.member_id
          ) cert
        ) AS certificate
      FROM course_enrollments ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.member_id = $1
        AND ce.status <> 'cancelled'
      ORDER BY ce.enrolled_at DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    ...row,
    progress: Number(row.progress || 0),
    total_lessons: Number(row.total_lessons || 0),
    completed_lessons: Number(row.completed_lessons || 0),
    duration: formatDuration(row.course?.duration_minutes),
  }));
}

export async function getMemberWatchHistory(userId) {
  const result = await query(
    `
      SELECT
        wh.id,
        wh.member_id,
        wh.course_id,
        wh.lesson_id,
        wh.watch_duration_minutes,
        wh.completion_percentage,
        wh.watched_at,
        JSON_BUILD_OBJECT(
          'id', c.id,
          'title', c.title,
          'instructor', c.instructor,
          'category', c.category,
          'description', c.description,
          'image_url', c.image_url,
          'archived', c.archived
        ) AS course
      FROM watch_history wh
      JOIN courses c ON c.id = wh.course_id
      WHERE wh.member_id = $1
      ORDER BY wh.watched_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getMemberCertificates(userId) {
  const result = await query(
    `
      SELECT
        cert.id,
        cert.member_id,
        cert.course_id,
        cert.certificate_number,
        cert.issue_date,
        cert.status,
        cert.title,
        JSON_BUILD_OBJECT(
          'id', c.id,
          'title', c.title,
          'instructor', c.instructor,
          'category', c.category
        ) AS course
      FROM certificates cert
      JOIN courses c ON c.id = cert.course_id
      JOIN course_enrollments ce ON ce.course_id = cert.course_id AND ce.member_id = cert.member_id
      WHERE cert.member_id = $1
        AND cert.status = 'valid'
        AND c.archived = FALSE
        AND ce.status <> 'cancelled'
      ORDER BY cert.issue_date DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getMemberEvents(userId) {
  const result = await query(
    `
      SELECT
        er.id,
        er.member_id,
        er.event_id,
        er.registration_status,
        COALESCE(ea.status, 'registered') AS attendance_status,
        er.registered_at,
        JSON_BUILD_OBJECT(
          'id', e.id,
          'title', e.title,
          'description', e.description,
          'starts_at', e.starts_at,
          'location', e.location,
          'archived', e.archived
        ) AS event
      FROM event_registrations er
      JOIN events e ON e.id = er.event_id
      LEFT JOIN event_attendance ea
        ON ea.event_id = er.event_id
       AND ea.member_id = er.member_id
      WHERE er.member_id = $1
      ORDER BY e.starts_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getMemberTickets(userId) {
  const result = await query(
    `
      SELECT
        et.id,
        et.registration_id,
        et.member_id,
        et.event_id,
        et.ticket_number,
        et.ticket_status,
        et.attendance_status,
        et.issued_at,
        JSON_BUILD_OBJECT(
          'id', e.id,
          'title', e.title,
          'description', e.description,
          'starts_at', e.starts_at,
          'location', e.location,
          'archived', e.archived
        ) AS event
      FROM event_tickets et
      JOIN events e ON e.id = et.event_id
      WHERE et.member_id = $1
      ORDER BY et.issued_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getMemberDonations(userId) {
  const result = await query(
    `
      SELECT
        dt.id,
        dt.member_id,
        dt.amount::float AS amount,
        dt.currency,
        dt.donated_at,
        dt.fund,
        dt.method,
        dt.donation_type,
        COALESCE(c.title, dt.campaign, dt.fund, 'General Fund') AS campaign,
        dt.transaction_id,
        dt.payment_status
      FROM donation_transactions dt
      LEFT JOIN campaigns c ON c.id = dt.campaign_id
      WHERE dt.member_id = $1
      ORDER BY dt.donated_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getMemberPrayerRequests(userId) {
  const result = await query(
    `
      SELECT
        id,
        member_id,
        title,
        description,
        details,
        status,
        is_private,
        created_at,
        updated_at
      FROM prayer_requests
      WHERE member_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getMemberDownloads(userId) {
  const result = await query(
    `
      SELECT
        id,
        member_id,
        resource_name,
        title,
        resource_type,
        file_url,
        resource_url,
        downloaded_at
      FROM downloads
      WHERE member_id = $1
      ORDER BY downloaded_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getSavedMessages(userId) {
  const result = await query(
    `
      SELECT
        sm.id,
        sm.member_id,
        sm.message_id,
        sm.saved_at,
        JSON_BUILD_OBJECT(
          'id', m.id,
          'title', m.title,
          'speaker', m.speaker,
          'category', m.category,
          'original_url', m.original_url,
          'published_at', m.published_at,
          'archived', m.archived,
          'thumbnail_url', m.thumbnail_url,
          'video_url', m.video_url,
          'duration_minutes', m.duration_minutes
        ) AS message
      FROM saved_messages sm
      JOIN messages m ON m.id = sm.message_id
      WHERE sm.member_id = $1
      ORDER BY sm.saved_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getReadingPlan(userId) {
  const result = await query(
    `
      SELECT
        rp.id,
        rp.name,
        rp.title,
        rp.description,
        rp.total_days,
        rp.active,
        rp.pdf_url,
        rp.badge_text,
        rp.is_featured,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', rpi.id,
              'day_number', rpi.day_number,
              'dayNumber', rpi.day_number,
              'title', rpi.title,
              'scripture', rpi.scripture,
              'reference', rpi.reference,
              'key_verse', rpi.key_verse,
              'devotional', rpi.devotional,
              'prayer', rpi.prayer,
              'completed', (mrp.id IS NOT NULL),
              'completedAt', mrp.completed_at,
              'notes', mrp.notes
            )
            ORDER BY rpi.day_number
          ) FILTER (WHERE rpi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM reading_plans rp
      LEFT JOIN reading_plan_items rpi ON rpi.plan_id = rp.id
      LEFT JOIN member_reading_progress mrp
        ON mrp.plan_id = rp.id
       AND mrp.item_id = rpi.id
       AND mrp.member_id = $1
      WHERE rp.active = TRUE
      GROUP BY rp.id
      ORDER BY rp.is_featured DESC, rp.updated_at DESC, rp.created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function getMemberActivity(userId, limit = 20) {
  const result = await query(
    `
      SELECT
        id,
        member_id,
        activity_type,
        description,
        related_entity_type,
        related_entity_id,
        metadata,
        created_at
      FROM member_activity
      WHERE member_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows;
}
