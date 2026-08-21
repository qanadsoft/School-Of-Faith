import { query } from "../db/pool.js";
import { sanitizeText } from "../utils/sanitize.js";

/**
 * Public Prayer Wall: get approved and answered requests with prayer counts and replies count
 */
export async function getPrayerWall(currentUserId = null) {
  const result = await query(
    `
      SELECT
        pr.id,
        pr.title,
        pr.description,
        pr.category,
        pr.type,
        pr.status,
        pr.is_anonymous,
        pr.created_at,
        CASE
          WHEN pr.is_anonymous THEN 'Anonymous'
          WHEN pr.author_name IS NOT NULL AND pr.author_name != '' THEN pr.author_name
          ELSE u.first_name || ' ' || u.last_name
        END AS author,
        CASE
          WHEN pr.is_anonymous THEN NULL
          ELSE u.profile_image
        END AS avatar,
        COUNT(DISTINCT pa.id)::int AS prays,
        COUNT(DISTINCT pa.id)::int AS prayer_count,
        COUNT(DISTINCT pc.id)::int AS replies,
        COUNT(DISTINCT pc.id)::int AS comments,
        CASE
          WHEN $1::uuid IS NOT NULL AND EXISTS (
            SELECT 1 FROM prayer_actions pa_user
            WHERE pa_user.prayer_request_id = pr.id AND pa_user.member_id = $1::uuid
          ) THEN TRUE
          ELSE FALSE
        END AS has_prayed
      FROM prayer_requests pr
      JOIN users u ON u.id = pr.member_id
      LEFT JOIN prayer_actions pa ON pa.prayer_request_id = pr.id
      LEFT JOIN prayer_comments pc ON pc.prayer_request_id = pr.id
      WHERE pr.status IN ('approved', 'answered')
      GROUP BY pr.id, u.id
      ORDER BY pr.created_at DESC
    `,
    [currentUserId]
  );
  return result.rows;
}

/**
 * Get replies / comments for a prayer request
 */
export async function getPrayerComments(requestId) {
  const result = await query(
    `
      SELECT
        pc.id,
        pc.prayer_request_id,
        pc.member_id,
        pc.content,
        pc.created_at,
        COALESCE(pc.author_name, u.first_name || ' ' || u.last_name) AS author,
        u.profile_image AS avatar
      FROM prayer_comments pc
      JOIN users u ON u.id = pc.member_id
      WHERE pc.prayer_request_id = $1
      ORDER BY pc.created_at ASC
    `,
    [requestId]
  );
  return result.rows;
}

/**
 * Add a reply / word of encouragement to a prayer request
 */
export async function addPrayerComment(requestId, memberId, content, authorName = null) {
  const result = await query(
    `
      INSERT INTO prayer_comments (prayer_request_id, member_id, content, author_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      requestId,
      memberId,
      sanitizeText(content.trim()),
      authorName ? sanitizeText(authorName.trim()) : null,
    ]
  );

  // Return full comment with user details
  const fullComment = await query(
    `
      SELECT
        pc.id,
        pc.prayer_request_id,
        pc.member_id,
        pc.content,
        pc.created_at,
        COALESCE(pc.author_name, u.first_name || ' ' || u.last_name) AS author,
        u.profile_image AS avatar
      FROM prayer_comments pc
      JOIN users u ON u.id = pc.member_id
      WHERE pc.id = $1
    `,
    [result.rows[0].id]
  );

  return fullComment.rows[0];
}

/**
 * Get active Today's Prayer Focus
 */
export async function getTodayPrayerFocus(currentUserId = null) {
  const result = await query(
    `
      SELECT
        pf.id,
        pf.title,
        pf.topic,
        pf.scripture,
        pf.description,
        pf.active_date,
        pf.is_published,
        COUNT(DISTINCT pfa.id)::int AS prayer_count,
        CASE
          WHEN $1::uuid IS NOT NULL AND EXISTS (
            SELECT 1 FROM prayer_focus_actions pfa_user
            WHERE pfa_user.focus_id = pf.id AND pfa_user.member_id = $1::uuid
          ) THEN TRUE
          ELSE FALSE
        END AS has_prayed
      FROM prayer_focuses pf
      LEFT JOIN prayer_focus_actions pfa ON pfa.focus_id = pf.id
      WHERE pf.is_published = TRUE AND pf.archived = FALSE
      GROUP BY pf.id
      ORDER BY pf.active_date DESC, pf.created_at DESC
      LIMIT 1
    `,
    [currentUserId]
  );
  return result.rows[0] || null;
}

/**
 * Member clicks "I'm Praying" on a prayer request
 */
export async function recordPrayerAction(requestId, memberId) {
  // Prevent duplicate: insert with DO NOTHING
  await query(
    `
      INSERT INTO prayer_actions (prayer_request_id, member_id)
      VALUES ($1, $2)
      ON CONFLICT (prayer_request_id, member_id) DO NOTHING
    `,
    [requestId, memberId]
  );

  // Return new count
  const countRes = await query(
    `SELECT COUNT(*)::int AS prayer_count FROM prayer_actions WHERE prayer_request_id = $1`,
    [requestId]
  );
  return {
    prayer_count: countRes.rows[0]?.prayer_count || 0,
    has_prayed: true,
  };
}

/**
 * Member clicks "I'm Praying" on Today's Prayer Focus
 */
export async function recordFocusPrayerAction(focusId, memberId) {
  await query(
    `
      INSERT INTO prayer_focus_actions (focus_id, member_id)
      VALUES ($1, $2)
      ON CONFLICT (focus_id, member_id) DO NOTHING
    `,
    [focusId, memberId]
  );

  const countRes = await query(
    `SELECT COUNT(*)::int AS prayer_count FROM prayer_focus_actions WHERE focus_id = $1`,
    [focusId]
  );
  return {
    prayer_count: countRes.rows[0]?.prayer_count || 0,
    has_prayed: true,
  };
}

/**
 * Create a new member prayer request with status = 'pending'
 */
export async function createPrayerRequest(memberId, { title, description, category = 'General', type = 'request', authorName = null, isAnonymous = false }) {
  const finalTitle = title?.trim() || description?.trim().slice(0, 50) || 'Prayer Request';
  const result = await query(
    `
      INSERT INTO prayer_requests (member_id, title, description, category, type, status, author_name, is_anonymous)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
      RETURNING *
    `,
    [
      memberId,
      sanitizeText(finalTitle),
      sanitizeText(description.trim()),
      sanitizeText(category),
      type === 'praise' ? 'praise' : 'request',
      authorName ? sanitizeText(authorName.trim()) : null,
      isAnonymous,
    ]
  );

  await query(
    `
      INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
      VALUES ($1, 'prayer_request_submitted', $2, 'prayer_request', $3)
    `,
    [memberId, `Submitted ${type === 'praise' ? 'praise report' : 'prayer request'}: ${sanitizeText(finalTitle)}`, result.rows[0].id]
  );

  return result.rows[0];
}

/**
 * Member's own prayer requests with all statuses
 */
export async function getMemberPrayerRequests(memberId) {
  const result = await query(
    `
      SELECT
        pr.*,
        COUNT(DISTINCT pa.id)::int AS prayer_count,
        COUNT(DISTINCT pa.id)::int AS prays
      FROM prayer_requests pr
      LEFT JOIN prayer_actions pa ON pa.prayer_request_id = pr.id
      WHERE pr.member_id = $1
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `,
    [memberId]
  );
  return result.rows;
}

/**
 * Admin: Get all prayer requests with filters and stats
 */
export async function getAdminPrayerRequests(statusFilter = null) {
  let queryText = `
    SELECT
      pr.*,
      COUNT(DISTINCT pa.id)::int AS prayer_count,
      COUNT(DISTINCT pa.id)::int AS prays,
      JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email) AS member
    FROM prayer_requests pr
    JOIN users u ON u.id = pr.member_id
    LEFT JOIN prayer_actions pa ON pa.prayer_request_id = pr.id
  `;
  const params = [];
  if (statusFilter) {
    params.push(statusFilter);
    queryText += ` WHERE pr.status = $1`;
  }
  queryText += ` GROUP BY pr.id, u.id ORDER BY pr.created_at DESC`;

  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Admin: Summary statistics
 */
export async function getAdminPrayerStats() {
  const totalRes = await query(`SELECT COUNT(*)::int AS total FROM prayer_requests`);
  const pendingRes = await query(`SELECT COUNT(*)::int AS count FROM prayer_requests WHERE status = 'pending'`);
  const approvedRes = await query(`SELECT COUNT(*)::int AS count FROM prayer_requests WHERE status = 'approved'`);
  const answeredRes = await query(`SELECT COUNT(*)::int AS count FROM prayer_requests WHERE status = 'answered'`);
  const totalPrayersRes = await query(`SELECT COUNT(*)::int AS count FROM prayer_actions`);

  return {
    totalRequests: totalRes.rows[0]?.total || 0,
    pending: pendingRes.rows[0]?.count || 0,
    approved: approvedRes.rows[0]?.count || 0,
    answered: answeredRes.rows[0]?.count || 0,
    totalPrayers: totalPrayersRes.rows[0]?.count || 0,
  };
}

/**
 * Admin: Update status
 */
export async function updatePrayerStatus(requestId, status) {
  const result = await query(
    `UPDATE prayer_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, requestId]
  );
  return result.rows[0] || null;
}

/**
 * Admin: Daily Focus Management
 */
export async function getAdminPrayerFocuses() {
  const result = await query(
    `
      SELECT
        pf.*,
        COUNT(DISTINCT pfa.id)::int AS prayer_count
      FROM prayer_focuses pf
      LEFT JOIN prayer_focus_actions pfa ON pfa.focus_id = pf.id
      GROUP BY pf.id
      ORDER BY pf.active_date DESC, pf.created_at DESC
    `
  );
  return result.rows;
}

export async function createPrayerFocus({ title, topic = 'Global Missions', scripture = '', description, activeDate, isPublished = true }) {
  const result = await query(
    `
      INSERT INTO prayer_focuses (title, topic, scripture, description, active_date, is_published)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      sanitizeText(title),
      sanitizeText(topic),
      sanitizeText(scripture),
      sanitizeText(description),
      activeDate || new Date().toISOString().split('T')[0],
      isPublished,
    ]
  );
  return result.rows[0];
}

export async function updatePrayerFocus(id, { title, topic, scripture, description, activeDate, isPublished, archived }) {
  const result = await query(
    `
      UPDATE prayer_focuses
      SET
        title = COALESCE($1, title),
        topic = COALESCE($2, topic),
        scripture = COALESCE($3, scripture),
        description = COALESCE($4, description),
        active_date = COALESCE($5, active_date),
        is_published = COALESCE($6, is_published),
        archived = COALESCE($7, archived),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `,
    [
      title ? sanitizeText(title) : null,
      topic ? sanitizeText(topic) : null,
      scripture ? sanitizeText(scripture) : null,
      description ? sanitizeText(description) : null,
      activeDate ?? null,
      isPublished ?? null,
      archived ?? null,
      id,
    ]
  );
  return result.rows[0] || null;
}

export async function deletePrayerFocus(id) {
  await query(`DELETE FROM prayer_focuses WHERE id = $1`, [id]);
}
