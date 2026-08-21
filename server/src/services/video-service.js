import { query } from "../db/pool.js";

export async function getPublishedVideos(topicSlug = null) {
  let text = `
    SELECT
      m.id, m.title, m.speaker, m.category, m.description, m.original_url,
      m.published_at, m.archived, m.thumbnail_url, m.video_url, m.duration_minutes,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('id', t.id, 'name', t.name, 'slug', t.slug, 'icon', t.icon)
          ORDER BY t.sort_order
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS topics
    FROM messages m
    LEFT JOIN message_topics mt ON mt.message_id = m.id
    LEFT JOIN topics t ON t.id = mt.topic_id
    WHERE m.archived = FALSE
  `;
  const params = [];

  if (topicSlug) {
    text += ` AND m.id IN (
      SELECT mt2.message_id FROM message_topics mt2
      JOIN topics t2 ON t2.id = mt2.topic_id
      WHERE t2.slug = $1
    )`;
    params.push(topicSlug);
  }

  text += ` GROUP BY m.id ORDER BY m.published_at DESC`;

  const result = await query(text, params);
  return result.rows;
}

export async function getRecentVideos(limit = 12) {
  const result = await query(
    `
      SELECT
        m.id, m.title, m.speaker, m.category, m.description, m.original_url,
        m.published_at, m.archived, m.thumbnail_url, m.video_url, m.duration_minutes,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', t.id, 'name', t.name, 'slug', t.slug, 'icon', t.icon)
            ORDER BY t.sort_order
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS topics
      FROM messages m
      LEFT JOIN message_topics mt ON mt.message_id = m.id
      LEFT JOIN topics t ON t.id = mt.topic_id
      WHERE m.archived = FALSE
      GROUP BY m.id
      ORDER BY m.published_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

export async function getVideoById(id) {
  const result = await query(
    `
      SELECT
        m.id, m.title, m.speaker, m.category, m.description, m.original_url,
        m.published_at, m.archived, m.thumbnail_url, m.video_url, m.duration_minutes,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', t.id, 'name', t.name, 'slug', t.slug, 'icon', t.icon)
            ORDER BY t.sort_order
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS topics
      FROM messages m
      LEFT JOIN message_topics mt ON mt.message_id = m.id
      LEFT JOIN topics t ON t.id = mt.topic_id
      WHERE m.id = $1
      GROUP BY m.id
    `,
    [id]
  );
  return result.rows[0] || null;
}

export async function getAllTopics() {
  const result = await query(`
    SELECT
      t.id, t.name, t.slug, t.icon, t.sort_order,
      COUNT(mt.message_id)::int AS count
    FROM topics t
    LEFT JOIN message_topics mt ON mt.topic_id = t.id
    LEFT JOIN messages m ON m.id = mt.message_id AND m.archived = FALSE
    GROUP BY t.id
    ORDER BY t.sort_order ASC
  `);
  return result.rows;
}

export async function getTopicBySlug(slug) {
  const result = await query(
    `
      SELECT
        t.id, t.name, t.slug, t.icon, t.sort_order,
        COUNT(mt.message_id)::int AS count
      FROM topics t
      LEFT JOIN message_topics mt ON mt.topic_id = t.id
      LEFT JOIN messages m ON m.id = mt.message_id AND m.archived = FALSE
      WHERE t.slug = $1
      GROUP BY t.id
    `,
    [slug]
  );
  return result.rows[0] || null;
}

export async function getVideosByTopic(slug) {
  const topic = await getTopicBySlug(slug);
  if (!topic) return null;

  const videos = await getPublishedVideos(slug);
  return {
    topic,
    count: topic.count,
    videos,
  };
}

export async function getContinueWatching(userId) {
  const result = await query(
    `
      SELECT
        vwp.id AS progress_id, vwp.member_id, vwp.message_id,
        vwp.watch_duration_seconds, vwp.last_position_seconds,
        vwp.progress_percentage, vwp.is_completed, vwp.last_watched_at,
        m.id, m.title, m.speaker, m.category, m.description, m.original_url,
        m.published_at, m.archived, m.thumbnail_url, m.video_url, m.duration_minutes,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', t.id, 'name', t.name, 'slug', t.slug, 'icon', t.icon)
            ORDER BY t.sort_order
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS topics
      FROM video_watch_progress vwp
      JOIN messages m ON m.id = vwp.message_id
      LEFT JOIN message_topics mt ON mt.message_id = m.id
      LEFT JOIN topics t ON t.id = mt.topic_id
      WHERE vwp.member_id = $1 AND vwp.is_completed = FALSE AND vwp.progress_percentage > 0
      GROUP BY vwp.id, m.id
      ORDER BY vwp.last_watched_at DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function getVideoProgress(userId, messageId) {
  const result = await query(
    `SELECT * FROM video_watch_progress WHERE member_id = $1 AND message_id = $2`,
    [userId, messageId]
  );
  return result.rows[0] || null;
}

export async function upsertVideoProgress(
  userId,
  { messageId, lastPositionSeconds, watchDurationSeconds, progressPercentage, isCompleted }
) {
  const result = await query(
    `
      INSERT INTO video_watch_progress (member_id, message_id, last_position_seconds, watch_duration_seconds, progress_percentage, is_completed, last_watched_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (member_id, message_id) DO UPDATE SET
        last_position_seconds = EXCLUDED.last_position_seconds,
        watch_duration_seconds = GREATEST(video_watch_progress.watch_duration_seconds, EXCLUDED.watch_duration_seconds),
        progress_percentage = EXCLUDED.progress_percentage,
        is_completed = CASE WHEN EXCLUDED.is_completed THEN TRUE ELSE video_watch_progress.is_completed END,
        last_watched_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [userId, messageId, lastPositionSeconds, watchDurationSeconds, progressPercentage, isCompleted]
  );

  await query(
    `
      INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
      VALUES ($1, 'video_watched', 'Watched video', 'message', $2)
    `,
    [userId, messageId]
  );

  return result.rows[0];
}

export async function saveMessage(userId, messageId) {
  const result = await query(
    `
      INSERT INTO saved_messages (member_id, message_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `,
    [userId, messageId]
  );

  if (result.rows.length > 0) {
    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        VALUES ($1, 'message_saved', 'Saved message', 'message', $2)
      `,
      [userId, messageId]
    );
  }

  if (result.rows.length === 0) {
    const existing = await query(
      `SELECT * FROM saved_messages WHERE member_id = $1 AND message_id = $2`,
      [userId, messageId]
    );
    return existing.rows[0];
  }
  return result.rows[0];
}
