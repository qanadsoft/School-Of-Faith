import { query } from "../db/pool.js";
import { sanitizeText } from "../utils/sanitize.js";

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export async function listCourses(userId = null, filters = {}) {
  const { search, category } = filters;
  const conditions = ["c.archived = FALSE"];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(c.title) LIKE $${params.length} OR LOWER(c.instructor) LIKE $${params.length} OR LOWER(c.description) LIKE $${params.length})`);
  }

  if (category && category !== "All" && category !== "all") {
    params.push(category);
    conditions.push(`c.category = $${params.length}`);
  }

  let userParamIdx = null;
  if (userId) {
    params.push(userId);
    userParamIdx = params.length;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      c.id,
      c.title,
      c.instructor,
      c.category,
      c.description,
      c.difficulty,
      c.image_url,
      c.image_url AS image,
      c.thumbnail_url,
      c.created_at,
      COUNT(DISTINCT cl.id)::int AS lessons,
      COALESCE(SUM(cl.duration_minutes), c.duration_minutes, 0)::int AS duration_minutes,
      ${
        userParamIdx
          ? `
        COALESCE(BOOL_OR(ce.member_id = $${userParamIdx} AND ce.status <> 'cancelled'), FALSE) AS is_enrolled,
        MAX(CASE WHEN ce.member_id = $${userParamIdx} THEN ce.status ELSE NULL END) AS enrollment_status,
        COUNT(DISTINCT CASE WHEN lp.member_id = $${userParamIdx} AND lp.is_completed = TRUE THEN lp.lesson_id ELSE NULL END)::int AS completed_lessons,
        CASE
          WHEN COUNT(DISTINCT cl.id) > 0 THEN
            ROUND((COUNT(DISTINCT CASE WHEN lp.member_id = $${userParamIdx} AND lp.is_completed = TRUE THEN lp.lesson_id ELSE NULL END)::numeric / COUNT(DISTINCT cl.id)) * 100)::int
          ELSE 0
        END AS progress
      `
          : `
        FALSE AS is_enrolled,
        NULL AS enrollment_status,
        0 AS completed_lessons,
        0 AS progress
      `
      }
    FROM courses c
    LEFT JOIN course_lessons cl ON cl.course_id = c.id
    ${
      userParamIdx
        ? `
      LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.member_id = $${userParamIdx}
      LEFT JOIN lesson_progress lp ON lp.course_id = c.id AND lp.member_id = $${userParamIdx}
    `
        : ""
    }
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const result = await query(sql, params);

  return result.rows.map((row) => ({
    ...row,
    duration: formatDuration(row.duration_minutes),
    progress: Number(row.progress || 0),
    lessons: Number(row.lessons || 0),
    completed_lessons: Number(row.completed_lessons || 0),
  }));
}

export async function getCourseDetails(courseId, userId = null) {
  const courseRes = await query(
    `
      SELECT
        c.*,
        c.image_url AS image,
        COUNT(DISTINCT cl.id)::int AS lessons_count,
        COALESCE(SUM(cl.duration_minutes), c.duration_minutes, 0)::int AS total_duration_minutes
      FROM courses c
      LEFT JOIN course_lessons cl ON cl.course_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `,
    [courseId]
  );

  if (!courseRes.rows[0]) return null;
  const course = courseRes.rows[0];

  // Fetch lessons
  const lessonsRes = await query(
    `
      SELECT
        cl.id,
        cl.course_id,
        cl.title,
        cl.duration_minutes,
        cl.sort_order,
        cl.video_url,
        COALESCE(lp.last_position_seconds, 0) AS last_position_seconds,
        COALESCE(lp.progress_percentage, 0) AS progress_percentage,
        COALESCE(lp.is_completed, FALSE) AS is_completed,
        lp.completed_at
      FROM course_lessons cl
      LEFT JOIN lesson_progress lp
        ON lp.lesson_id = cl.id
       AND lp.member_id = $2
      WHERE cl.course_id = $1
      ORDER BY cl.sort_order ASC, cl.created_at ASC
    `,
    [courseId, userId || null]
  );

  // Check enrollment
  let enrollment = null;
  if (userId) {
    const enrollRes = await query(
      `SELECT * FROM course_enrollments WHERE course_id = $1 AND member_id = $2`,
      [courseId, userId]
    );
    enrollment = enrollRes.rows[0] || null;
  }

  // Check certificate
  let certificate = null;
  if (userId) {
    const certRes = await query(
      `SELECT * FROM certificates WHERE course_id = $1 AND member_id = $2`,
      [courseId, userId]
    );
    certificate = certRes.rows[0] || null;
  }

  // Calculate sequential unlock logic:
  // Lesson 1 is always unlocked.
  // Lesson k (k > 1) is unlocked if Lesson k-1 is_completed is true.
  let isPreviousCompleted = true;
  const lessons = lessonsRes.rows.map((lesson, index) => {
    const isUnlocked = index === 0 || isPreviousCompleted;
    if (!lesson.is_completed) {
      isPreviousCompleted = false;
    }
    return {
      ...lesson,
      order: lesson.sort_order || index + 1,
      duration: formatDuration(lesson.duration_minutes),
      is_unlocked: isUnlocked,
    };
  });

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) => l.is_completed).length;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    ...course,
    duration: formatDuration(course.total_duration_minutes),
    duration_minutes: course.total_duration_minutes,
    lessons,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    progress,
    is_enrolled: !!enrollment && enrollment.status !== "cancelled",
    enrollment_status: enrollment ? enrollment.status : null,
    certificate,
  };
}

export async function enrollMemberInCourse(courseId, userId) {
  const result = await query(
    `
      INSERT INTO course_enrollments (member_id, course_id, status, enrolled_at)
      VALUES ($1, $2, 'active', NOW())
      ON CONFLICT (member_id, course_id)
      DO UPDATE SET status = 'active', updated_at = NOW()
      RETURNING *
    `,
    [userId, courseId]
  );

  await query(
    `
      INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
      SELECT $1, 'course_enrolled', 'Enrolled in ' || c.title, 'course', $2
      FROM courses c WHERE c.id = $2
    `,
    [userId, courseId]
  );

  return result.rows[0];
}

export async function saveLessonProgress(courseId, lessonId, userId, data) {
  const {
    lastPositionSeconds = 0,
    watchDurationSeconds = 0,
    progressPercentage = 0,
    isCompleted = false,
  } = data;

  const completedAt = isCompleted ? "NOW()" : "NULL";

  const progressRes = await query(
    `
      INSERT INTO lesson_progress (
        member_id, course_id, lesson_id,
        last_position_seconds, watch_duration_seconds,
        progress_percentage, is_completed, completed_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, ${completedAt}, NOW())
      ON CONFLICT (member_id, lesson_id)
      DO UPDATE SET
        last_position_seconds = EXCLUDED.last_position_seconds,
        watch_duration_seconds = lesson_progress.watch_duration_seconds + EXCLUDED.watch_duration_seconds,
        progress_percentage = GREATEST(lesson_progress.progress_percentage, EXCLUDED.progress_percentage),
        is_completed = lesson_progress.is_completed OR EXCLUDED.is_completed,
        completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      courseId,
      lessonId,
      Math.floor(lastPositionSeconds),
      Math.floor(watchDurationSeconds),
      Math.min(100, Math.max(0, Math.round(progressPercentage))),
      Boolean(isCompleted),
    ]
  );

  // Sync to watch_history
  const watchMinutes = Math.max(1, Math.round(watchDurationSeconds / 60));
  await query(
    `
      INSERT INTO watch_history (member_id, course_id, lesson_id, watch_duration_minutes, completion_percentage, watched_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [userId, courseId, lessonId, watchMinutes, Math.min(100, Math.max(0, Math.round(progressPercentage)))]
  );

  // Check if course is completed
  let courseCompleted = false;
  let certificate = null;

  const countRes = await query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM course_lessons WHERE course_id = $1) AS total_lessons,
        (
          SELECT COUNT(DISTINCT lp.lesson_id)::int
          FROM lesson_progress lp
          JOIN course_lessons cl ON cl.id = lp.lesson_id
          WHERE cl.course_id = $1
            AND lp.member_id = $2
            AND lp.is_completed = TRUE
        ) AS completed_lessons
    `,
    [courseId, userId]
  );

  const totalLessons = countRes.rows[0]?.total_lessons || 0;
  const completedLessons = countRes.rows[0]?.completed_lessons || 0;

  if (totalLessons > 0 && completedLessons >= totalLessons) {
    courseCompleted = true;

    // Update enrollment status
    await query(
      `
        UPDATE course_enrollments
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE course_id = $1 AND member_id = $2
      `,
      [courseId, userId]
    );

    // Issue certificate
    const certNumber = `SOF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const certInsert = await query(
      `
        INSERT INTO certificates (member_id, course_id, certificate_number, title, issue_date, status)
        SELECT $1, $2, $3, 'Certificate of Completion - ' || c.title, CURRENT_DATE, 'valid'
        FROM courses c WHERE c.id = $2
        ON CONFLICT (member_id, course_id)
        DO UPDATE SET status = 'valid', updated_at = NOW()
        RETURNING *
      `,
      [userId, courseId, certNumber]
    );
    certificate = certInsert.rows[0] || null;

    // Log member activity
    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id)
        SELECT $1, 'course_completed', 'Completed course: ' || c.title, 'course', $2
        FROM courses c WHERE c.id = $2
      `,
      [userId, courseId]
    );
  }

  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    lesson_progress: progressRes.rows[0],
    overall_progress: overallProgress,
    completed_lessons: completedLessons,
    total_lessons: totalLessons,
    is_course_completed: courseCompleted,
    certificate,
  };
}

export async function getCourseCertificate(courseId, userId) {
  const result = await query(
    `
      SELECT
        cert.id,
        cert.certificate_number,
        cert.title,
        cert.issue_date,
        cert.status,
        c.id AS course_id,
        c.title AS course_title,
        c.instructor,
        c.category,
        u.id AS member_id,
        CONCAT(u.first_name, ' ', u.last_name) AS member_name,
        u.email AS member_email
      FROM certificates cert
      JOIN courses c ON c.id = cert.course_id
      JOIN users u ON u.id = cert.member_id
      WHERE cert.course_id = $1 AND cert.member_id = $2
    `,
    [courseId, userId]
  );

  return result.rows[0] || null;
}

export async function getAdminCourseLessons(courseId) {
  const result = await query(
    `
      SELECT *
      FROM course_lessons
      WHERE course_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `,
    [courseId]
  );
  return result.rows;
}

export async function createAdminLesson(courseId, data) {
  const { title, durationMinutes = 30, sortOrder, videoUrl } = data;

  let order = sortOrder;
  if (!order) {
    const maxOrder = await query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM course_lessons WHERE course_id = $1`,
      [courseId]
    );
    order = maxOrder.rows[0]?.next_order || 1;
  }

  const result = await query(
    `
      INSERT INTO course_lessons (course_id, title, duration_minutes, sort_order, video_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [courseId, sanitizeText(title), durationMinutes, order, videoUrl || null]
  );

  // Recalculate total course duration
  await recalculateCourseDuration(courseId);

  return result.rows[0];
}

export async function updateAdminLesson(lessonId, data) {
  const { title, durationMinutes, sortOrder, videoUrl } = data;

  const result = await query(
    `
      UPDATE course_lessons
      SET
        title = COALESCE($1, title),
        duration_minutes = COALESCE($2, duration_minutes),
        sort_order = COALESCE($3, sort_order),
        video_url = COALESCE($4, video_url),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `,
    [
      title ? sanitizeText(title) : null,
      durationMinutes,
      sortOrder,
      videoUrl,
      lessonId,
    ]
  );

  if (result.rows[0]) {
    await recalculateCourseDuration(result.rows[0].course_id);
  }

  return result.rows[0] || null;
}

export async function deleteAdminLesson(lessonId) {
  const lessonRes = await query(`SELECT course_id FROM course_lessons WHERE id = $1`, [lessonId]);
  const courseId = lessonRes.rows[0]?.course_id;

  await query(`DELETE FROM course_lessons WHERE id = $1`, [lessonId]);

  if (courseId) {
    await recalculateCourseDuration(courseId);
  }

  return true;
}

async function recalculateCourseDuration(courseId) {
  await query(
    `
      UPDATE courses
      SET duration_minutes = COALESCE((SELECT SUM(duration_minutes) FROM course_lessons WHERE course_id = $1), 0),
          updated_at = NOW()
      WHERE id = $1
    `,
    [courseId]
  );
}

export async function getAdminCourseEnrollments(courseId) {
  const result = await query(
    `
      SELECT
        ce.id,
        ce.member_id,
        ce.course_id,
        ce.status,
        ce.enrolled_at,
        ce.completed_at,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image,
        COUNT(DISTINCT lp.lesson_id)::int AS completed_lessons,
        (SELECT COUNT(*)::int FROM course_lessons WHERE course_id = $1) AS total_lessons
      FROM course_enrollments ce
      JOIN users u ON u.id = ce.member_id
      LEFT JOIN lesson_progress lp ON lp.course_id = ce.course_id AND lp.member_id = ce.member_id AND lp.is_completed = TRUE
      WHERE ce.course_id = $1
      GROUP BY ce.id, u.id
      ORDER BY ce.enrolled_at DESC
    `,
    [courseId]
  );

  return result.rows.map((row) => ({
    ...row,
    progress: row.total_lessons > 0 ? Math.round((row.completed_lessons / row.total_lessons) * 100) : 0,
  }));
}
