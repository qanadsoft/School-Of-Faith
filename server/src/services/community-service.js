import { query } from "../db/pool.js";

// ─── Categories ─────────────────────────────────────────────────────────────
export async function getCommunityCategories() {
  let result = await query(
    `SELECT * FROM community_categories WHERE status = 'active' ORDER BY sort_order ASC, name ASC`
  );
  if (result.rows.length === 0) {
    await query(`
      INSERT INTO community_categories (id, name, slug, icon, status, sort_order) VALUES
        ('91000000-0000-0000-0000-000000000001', 'General Discussion', 'general', 'Globe', 'active', 1),
        ('91000000-0000-0000-0000-000000000002', 'Prayer Wall', 'prayer-wall', 'Heart', 'active', 2),
        ('91000000-0000-0000-0000-000000000003', 'Local Groups', 'local-groups', 'Users', 'active', 3)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon
    `);
    result = await query(
      `SELECT * FROM community_categories WHERE status = 'active' ORDER BY sort_order ASC, name ASC`
    );
  }
  return result.rows;
}

export async function getAllAdminCategories() {
  const result = await query(
    `SELECT * FROM community_categories ORDER BY sort_order ASC, name ASC`
  );
  return result.rows;
}

// ─── Posts ──────────────────────────────────────────────────────────────────
export async function listCommunityPosts({ categorySlug, search, currentUserId, status = 'approved' }) {
  let text = `
    SELECT
      p.id,
      p.content,
      p.status,
      p.created_at,
      p.updated_at,
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      c.icon AS category_icon,
      u.id AS author_id,
      u.first_name AS author_first_name,
      u.last_name AS author_last_name,
      u.profile_image AS author_profile_image,
      u.membership_type AS author_role,
      (SELECT COUNT(*)::int FROM community_post_likes l WHERE l.post_id = p.id) AS likes_count,
      (SELECT COUNT(*)::int FROM community_comments cm WHERE cm.post_id = p.id) AS comments_count,
      EXISTS(
        SELECT 1 FROM community_post_likes l2
        WHERE l2.post_id = p.id AND l2.member_id = $1
      ) AS has_liked,
      FALSE AS is_prayer_wall
    FROM community_posts p
    JOIN community_categories c ON c.id = p.category_id
    JOIN users u ON u.id = p.member_id
    WHERE 1=1
  `;
  const params = [currentUserId || null];

  if (status) {
    params.push(status);
    text += ` AND p.status = $${params.length}`;
  }

  if (categorySlug && categorySlug !== 'all') {
    params.push(categorySlug);
    text += ` AND c.slug = $${params.length}`;
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    text += ` AND (LOWER(p.content) LIKE $${params.length} OR LOWER(u.first_name) LIKE $${params.length} OR LOWER(u.last_name) LIKE $${params.length})`;
  }

  const postsRes = await query(text, params);
  let allPosts = postsRes.rows;

  // Include live Prayer Wall requests when viewing all posts or prayer-wall category
  if (!categorySlug || categorySlug === 'all' || categorySlug === 'prayer-wall') {
    const prayerRes = await query(
      `
        SELECT
          pr.id,
          CASE 
            WHEN pr.title IS NOT NULL AND pr.title != '' THEN pr.title || E'\n\n' || pr.description
            ELSE pr.description
          END AS content,
          'approved' AS status,
          pr.created_at,
          pr.updated_at,
          '91000000-0000-0000-0000-000000000002' AS category_id,
          'Praise & Prayer' AS category_name,
          'prayer-wall' AS category_slug,
          'Heart' AS category_icon,
          u.id AS author_id,
          CASE WHEN pr.is_anonymous THEN 'Anonymous' WHEN pr.author_name IS NOT NULL AND pr.author_name != '' THEN SPLIT_PART(pr.author_name, ' ', 1) ELSE u.first_name END AS author_first_name,
          CASE WHEN pr.is_anonymous THEN 'Member' WHEN pr.author_name IS NOT NULL AND pr.author_name != '' THEN SUBSTRING(pr.author_name FROM POSITION(' ' IN pr.author_name) + 1) ELSE u.last_name END AS author_last_name,
          CASE WHEN pr.is_anonymous THEN NULL ELSE u.profile_image END AS author_profile_image,
          CASE WHEN pr.type = 'praise' THEN 'Leader' ELSE 'Prayer Warrior' END AS author_role,
          (SELECT COUNT(*)::int FROM prayer_actions pa WHERE pa.prayer_request_id = pr.id) AS likes_count,
          (SELECT COUNT(*)::int FROM prayer_comments pc WHERE pc.prayer_request_id = pr.id) AS comments_count,
          EXISTS(
            SELECT 1 FROM prayer_actions pa2
            WHERE pa2.prayer_request_id = pr.id AND pa2.member_id = $1
          ) AS has_liked,
          TRUE AS is_prayer_wall
        FROM prayer_requests pr
        JOIN users u ON u.id = pr.member_id
        WHERE pr.status IN ('approved', 'answered')
      `,
      [currentUserId || null]
    );

    allPosts = [...allPosts, ...prayerRes.rows];
  }

  // Sort unified feed by created_at DESC
  allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allPosts;
}

export async function getCommunityPostById(postId, currentUserId) {
  const result = await query(
    `
      SELECT
        p.id,
        p.content,
        p.status,
        p.created_at,
        p.updated_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.icon AS category_icon,
        u.id AS author_id,
        u.first_name AS author_first_name,
        u.last_name AS author_last_name,
        u.profile_image AS author_profile_image,
        u.membership_type AS author_role,
        (SELECT COUNT(*)::int FROM community_post_likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*)::int FROM community_comments cm WHERE cm.post_id = p.id) AS comments_count,
        EXISTS(
          SELECT 1 FROM community_post_likes l2
          WHERE l2.post_id = p.id AND l2.member_id = $2
        ) AS has_liked
      FROM community_posts p
      JOIN community_categories c ON c.id = p.category_id
      JOIN users u ON u.id = p.member_id
      WHERE p.id = $1
    `,
    [postId, currentUserId || null]
  );
  return result.rows[0] || null;
}

export async function createCommunityPost(memberId, { content, categoryId }) {
  // Ensure valid categoryId
  let catId = categoryId;
  if (catId) {
    const check = await query(`SELECT id FROM community_categories WHERE id = $1`, [catId]);
    if (!check.rows[0]) catId = null;
  }

  if (!catId) {
    const defaultCat = await query(
      `SELECT id FROM community_categories WHERE status = 'active' ORDER BY sort_order ASC LIMIT 1`
    );
    if (defaultCat.rows[0]) {
      catId = defaultCat.rows[0].id;
    } else {
      const newCat = await query(`
        INSERT INTO community_categories (id, name, slug, icon, status, sort_order)
        VALUES ('91000000-0000-0000-0000-000000000001', 'General Discussion', 'general', 'Globe', 'active', 1)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `);
      catId = newCat.rows[0]?.id || '91000000-0000-0000-0000-000000000001';
    }
  }

  const result = await query(
    `
      INSERT INTO community_posts (member_id, category_id, content, status)
      VALUES ($1, $2, $3, 'approved')
      RETURNING *
    `,
    [memberId, catId, content]
  );

  await query(
    `
      INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
      VALUES ($1, 'community_post_created', $2, 'community_post', $3)
    `,
    [memberId, `Shared a post in the Community`, result.rows[0].id]
  );

  return getCommunityPostById(result.rows[0].id, memberId);
}

export async function updateCommunityPost(memberId, postId, { content, categoryId }, isAdmin = false) {
  const check = await query(`SELECT * FROM community_posts WHERE id = $1`, [postId]);
  if (!check.rows[0]) throw new Error("Post not found");
  if (!isAdmin && check.rows[0].member_id !== memberId) {
    throw new Error("You are not authorized to edit this post");
  }

  const result = await query(
    `
      UPDATE community_posts
      SET
        content = COALESCE($1, content),
        category_id = COALESCE($2, category_id),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
    [content || null, categoryId || null, postId]
  );

  return getCommunityPostById(result.rows[0].id, memberId);
}

export async function deleteCommunityPost(memberId, postId, isAdmin = false) {
  const check = await query(`SELECT * FROM community_posts WHERE id = $1`, [postId]);
  if (!check.rows[0]) throw new Error("Post not found");
  if (!isAdmin && check.rows[0].member_id !== memberId) {
    throw new Error("You are not authorized to delete this post");
  }

  await query(`DELETE FROM community_posts WHERE id = $1`, [postId]);
  return { success: true };
}

// ─── Likes ──────────────────────────────────────────────────────────────────
export async function togglePostLike(memberId, postId) {
  // 1. Check if it's a prayer wall request
  const checkPrayer = await query(`SELECT id FROM prayer_requests WHERE id = $1`, [postId]);
  if (checkPrayer.rows[0]) {
    const userPrayed = await query(
      `SELECT id FROM prayer_actions WHERE prayer_request_id = $1 AND member_id = $2`,
      [postId, memberId]
    );
    let liked = false;
    if (userPrayed.rows[0]) {
      await query(
        `DELETE FROM prayer_actions WHERE prayer_request_id = $1 AND member_id = $2`,
        [postId, memberId]
      );
      liked = false;
    } else {
      await query(
        `INSERT INTO prayer_actions (prayer_request_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, memberId]
      );
      liked = true;
    }
    const countRes = await query(
      `SELECT COUNT(*)::int AS count FROM prayer_actions WHERE prayer_request_id = $1`,
      [postId]
    );
    return { liked, likesCount: countRes.rows[0]?.count ?? 0 };
  }

  // 2. Otherwise community post
  const check = await query(
    `SELECT * FROM community_post_likes WHERE post_id = $1 AND member_id = $2`,
    [postId, memberId]
  );

  let liked = false;
  if (check.rows[0]) {
    await query(
      `DELETE FROM community_post_likes WHERE post_id = $1 AND member_id = $2`,
      [postId, memberId]
    );
    liked = false;
  } else {
    await query(
      `INSERT INTO community_post_likes (post_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, memberId]
    );
    liked = true;
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM community_post_likes WHERE post_id = $1`,
    [postId]
  );

  return {
    liked,
    likesCount: countRes.rows[0]?.count ?? 0,
  };
}

// ─── Comments ───────────────────────────────────────────────────────────────
export async function listPostComments(postId) {
  // Check if prayer request
  const checkPrayer = await query(`SELECT id FROM prayer_requests WHERE id = $1`, [postId]);
  if (checkPrayer.rows[0]) {
    const res = await query(
      `
        SELECT
          pc.id,
          pc.prayer_request_id AS post_id,
          pc.content,
          pc.created_at,
          pc.updated_at,
          u.id AS author_id,
          u.first_name AS author_first_name,
          u.last_name AS author_last_name,
          u.profile_image AS author_profile_image,
          u.membership_type AS author_role
        FROM prayer_comments pc
        JOIN users u ON u.id = pc.member_id
        WHERE pc.prayer_request_id = $1
        ORDER BY pc.created_at ASC
      `,
      [postId]
    );
    return res.rows;
  }

  const result = await query(
    `
      SELECT
        c.id,
        c.post_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.id AS author_id,
        u.first_name AS author_first_name,
        u.last_name AS author_last_name,
        u.profile_image AS author_profile_image,
        u.membership_type AS author_role
      FROM community_comments c
      JOIN users u ON u.id = c.member_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `,
    [postId]
  );
  return result.rows;
}

export async function createPostComment(memberId, postId, content) {
  // Check if prayer request
  const checkPrayer = await query(`SELECT id FROM prayer_requests WHERE id = $1`, [postId]);
  if (checkPrayer.rows[0]) {
    const res = await query(
      `
        INSERT INTO prayer_comments (prayer_request_id, member_id, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [postId, memberId, content]
    );
    const comment = await query(
      `
        SELECT
          pc.id,
          pc.prayer_request_id AS post_id,
          pc.content,
          pc.created_at,
          pc.updated_at,
          u.id AS author_id,
          u.first_name AS author_first_name,
          u.last_name AS author_last_name,
          u.profile_image AS author_profile_image,
          u.membership_type AS author_role
        FROM prayer_comments pc
        JOIN users u ON u.id = pc.member_id
        WHERE pc.id = $1
      `,
      [res.rows[0].id]
    );
    return comment.rows[0];
  }

  const result = await query(
    `
      INSERT INTO community_comments (post_id, member_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [postId, memberId, content]
  );

  const comment = await query(
    `
      SELECT
        c.id,
        c.post_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.id AS author_id,
        u.first_name AS author_first_name,
        u.last_name AS author_last_name,
        u.profile_image AS author_profile_image,
        u.membership_type AS author_role
      FROM community_comments c
      JOIN users u ON u.id = c.member_id
      WHERE c.id = $1
    `,
    [result.rows[0].id]
  );

  return comment.rows[0];
}

export async function deletePostComment(memberId, commentId, isAdmin = false) {
  const check = await query(`SELECT * FROM community_comments WHERE id = $1`, [commentId]);
  if (check.rows[0]) {
    if (!isAdmin && check.rows[0].member_id !== memberId) {
      throw new Error("You are not authorized to delete this comment");
    }
    await query(`DELETE FROM community_comments WHERE id = $1`, [commentId]);
    return { success: true };
  }

  const checkPrayerComment = await query(`SELECT * FROM prayer_comments WHERE id = $1`, [commentId]);
  if (checkPrayerComment.rows[0]) {
    if (!isAdmin && checkPrayerComment.rows[0].member_id !== memberId) {
      throw new Error("You are not authorized to delete this comment");
    }
    await query(`DELETE FROM prayer_comments WHERE id = $1`, [commentId]);
    return { success: true };
  }

  throw new Error("Comment not found");
}

// ─── Reports ────────────────────────────────────────────────────────────────
export async function reportCommunityPost(memberId, postId, reason) {
  const result = await query(
    `
      INSERT INTO community_reports (post_id, member_id, reason, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `,
    [postId, memberId, reason]
  );
  return result.rows[0];
}

// ─── Admin Management ───────────────────────────────────────────────────────
export async function getAdminCommunityStats() {
  const result = await query(
    `
      SELECT
        ((SELECT COUNT(*)::int FROM community_posts) + (SELECT COUNT(*)::int FROM prayer_requests)) AS total_posts,
        ((SELECT COUNT(*)::int FROM community_posts WHERE status = 'pending') + (SELECT COUNT(*)::int FROM prayer_requests WHERE status = 'pending')) AS pending_posts,
        ((SELECT COUNT(*)::int FROM community_posts WHERE status = 'approved') + (SELECT COUNT(*)::int FROM prayer_requests WHERE status IN ('approved', 'answered'))) AS approved_posts,
        (SELECT COUNT(*)::int FROM community_reports WHERE status = 'pending') AS reported_posts,
        ((SELECT COUNT(*)::int FROM community_comments) + (SELECT COUNT(*)::int FROM prayer_comments)) AS total_comments,
        ((SELECT COUNT(*)::int FROM community_post_likes) + (SELECT COUNT(*)::int FROM prayer_actions)) AS total_likes
    `
  );
  return result.rows[0];
}

export async function getAdminCommunityPosts({ status, categoryId, search }) {
  let catSlug = null;
  if (categoryId && categoryId !== 'all') {
    const catCheck = await query(`SELECT slug FROM community_categories WHERE id = $1`, [categoryId]);
    if (catCheck.rows[0]) {
      catSlug = catCheck.rows[0].slug;
    }
  }

  let text = `
    SELECT
      p.id,
      p.content,
      p.status,
      p.created_at,
      p.updated_at,
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      u.id AS author_id,
      u.first_name AS author_first_name,
      u.last_name AS author_last_name,
      u.email AS author_email,
      u.profile_image AS author_profile_image,
      (SELECT COUNT(*)::int FROM community_post_likes l WHERE l.post_id = p.id) AS likes_count,
      (SELECT COUNT(*)::int FROM community_comments cm WHERE cm.post_id = p.id) AS comments_count,
      (SELECT COUNT(*)::int FROM community_reports r WHERE r.post_id = p.id AND r.status = 'pending') AS pending_reports_count,
      FALSE AS is_prayer_wall
    FROM community_posts p
    JOIN community_categories c ON c.id = p.category_id
    JOIN users u ON u.id = p.member_id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    text += ` AND p.status = $${params.length}`;
  }

  if (categoryId && categoryId !== 'all') {
    params.push(categoryId);
    text += ` AND p.category_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    text += ` AND (LOWER(p.content) LIKE $${params.length} OR LOWER(u.first_name) LIKE $${params.length} OR LOWER(u.last_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
  }

  const postsRes = await query(text, params);
  let allAdminPosts = postsRes.rows;

  // Include prayer requests if category is Prayer Wall or All
  if (!catSlug || catSlug === 'prayer-wall' || !categoryId || categoryId === 'all') {
    let prayerText = `
      SELECT
        pr.id,
        CASE 
          WHEN pr.title IS NOT NULL AND pr.title != '' THEN pr.title || E'\n\n' || pr.description
          ELSE pr.description
        END AS content,
        CASE 
          WHEN pr.status IN ('approved', 'answered') THEN 'approved'
          WHEN pr.status = 'pending' THEN 'pending'
          ELSE 'hidden'
        END AS status,
        pr.created_at,
        pr.updated_at,
        '91000000-0000-0000-0000-000000000002' AS category_id,
        'Prayer Wall' AS category_name,
        'prayer-wall' AS category_slug,
        u.id AS author_id,
        CASE WHEN pr.is_anonymous THEN 'Anonymous' WHEN pr.author_name IS NOT NULL AND pr.author_name != '' THEN SPLIT_PART(pr.author_name, ' ', 1) ELSE u.first_name END AS author_first_name,
        CASE WHEN pr.is_anonymous THEN 'Member' WHEN pr.author_name IS NOT NULL AND pr.author_name != '' THEN SUBSTRING(pr.author_name FROM POSITION(' ' IN pr.author_name) + 1) ELSE u.last_name END AS author_last_name,
        u.email AS author_email,
        CASE WHEN pr.is_anonymous THEN NULL ELSE u.profile_image END AS author_profile_image,
        (SELECT COUNT(*)::int FROM prayer_actions pa WHERE pa.prayer_request_id = pr.id) AS likes_count,
        (SELECT COUNT(*)::int FROM prayer_comments pc WHERE pc.prayer_request_id = pr.id) AS comments_count,
        0 AS pending_reports_count,
        TRUE AS is_prayer_wall
      FROM prayer_requests pr
      JOIN users u ON u.id = pr.member_id
      WHERE 1=1
    `;
    const pParams = [];

    if (status && status !== 'all') {
      if (status === 'approved') {
        prayerText += ` AND pr.status IN ('approved', 'answered')`;
      } else if (status === 'pending') {
        prayerText += ` AND pr.status = 'pending'`;
      } else {
        prayerText += ` AND pr.status NOT IN ('approved', 'answered', 'pending')`;
      }
    }

    if (search) {
      pParams.push(`%${search.toLowerCase()}%`);
      prayerText += ` AND (LOWER(pr.title) LIKE $${pParams.length} OR LOWER(pr.description) LIKE $${pParams.length} OR LOWER(u.first_name) LIKE $${pParams.length} OR LOWER(u.last_name) LIKE $${pParams.length} OR LOWER(u.email) LIKE $${pParams.length})`;
    }

    const prayerRes = await query(prayerText, pParams);
    allAdminPosts = [...allAdminPosts, ...prayerRes.rows];
  }

  allAdminPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allAdminPosts;
}

export async function updateAdminPostStatus(postId, status) {
  // Check if prayer request
  const checkPrayer = await query(`SELECT id FROM prayer_requests WHERE id = $1`, [postId]);
  if (checkPrayer.rows[0]) {
    const prayerStatus = status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : 'rejected';
    const res = await query(
      `
        UPDATE prayer_requests
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [prayerStatus, postId]
    );
    return res.rows[0];
  }

  const result = await query(
    `
      UPDATE community_posts
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [status, postId]
  );
  if (!result.rows[0]) throw new Error("Post not found");
  return result.rows[0];
}

export async function getAdminReports() {
  const result = await query(
    `
      SELECT
        r.id,
        r.post_id,
        r.reason,
        r.status,
        r.created_at,
        p.content AS post_content,
        p.status AS post_status,
        u.first_name AS reporter_first_name,
        u.last_name AS reporter_last_name,
        author.first_name AS author_first_name,
        author.last_name AS author_last_name
      FROM community_reports r
      JOIN community_posts p ON p.id = r.post_id
      JOIN users u ON u.id = r.member_id
      JOIN users author ON author.id = p.member_id
      ORDER BY r.created_at DESC
    `
  );
  return result.rows;
}

export async function updateAdminReportStatus(reportId, status) {
  const result = await query(
    `
      UPDATE community_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `,
    [status, reportId]
  );
  if (!result.rows[0]) throw new Error("Report not found");
  return result.rows[0];
}
