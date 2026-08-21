import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { newDb } from "pg-mem";
import { config } from "../config.js";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryDb = null;
let memoryInitialized = false;

function createPool() {
  if (config.databaseUrl === "memory") {
    memoryDb = newDb({
      autoCreateForeignKeyIndices: true,
    });
    const adapter = memoryDb.adapters.createPg();
    return new adapter.Pool();
  }

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.PGSSLMODE === "require" ||
    config.databaseUrl.includes("amazonaws.com");

  return new Pool({
    connectionString: config.databaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
}

export const pool = createPool();

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function ensureDatabase() {
  if (memoryInitialized) {
    return;
  }

  const sql = await fs.readFile(path.join(__dirname, "migration.sql"), "utf8");
  await pool.query(sql);

  // Clean up any initial dummy enrollment for michael@example.com
  try {
    await pool.query(`DELETE FROM course_enrollments WHERE member_id IN (SELECT id FROM users WHERE email = 'michael@example.com')`);
  } catch (e) {
    // ignore
  }

  if (config.databaseUrl === "memory") {
    // Auto-seed the in-memory database so it has users, videos, topics, etc.
    await seedMemoryDatabase(pool);
  }

  memoryInitialized = true;
}

async function seedMemoryDatabase(pool) {
  const bcrypt = await import("bcryptjs");
  const client = await pool.connect();

  const ids = {
    sarah: "00000000-0000-0000-0000-000000000001",
    admin: "00000000-0000-0000-0000-000000000002",
    michael: "00000000-0000-0000-0000-000000000003",
    memberRole: "10000000-0000-0000-0000-000000000001",
    adminRole: "10000000-0000-0000-0000-000000000002",
    faithfulLearner: "20000000-0000-0000-0000-000000000001",
    prayerWarrior: "20000000-0000-0000-0000-000000000002",
    communityBuilder: "20000000-0000-0000-0000-000000000003",
    course1: "30000000-0000-0000-0000-000000000001",
    course2: "30000000-0000-0000-0000-000000000002",
    course3: "30000000-0000-0000-0000-000000000003",
    course4: "30000000-0000-0000-0000-000000000004",
    event1: "40000000-0000-0000-0000-000000000001",
    event2: "40000000-0000-0000-0000-000000000002",
    event3: "40000000-0000-0000-0000-000000000003",
    plan1: "50000000-0000-0000-0000-000000000001",
    message1: "60000000-0000-0000-0000-000000000001",
    message2: "60000000-0000-0000-0000-000000000002",
    message3: "60000000-0000-0000-0000-000000000003",
    message4: "60000000-0000-0000-0000-000000000004",
    message5: "60000000-0000-0000-0000-000000000005",
    message6: "60000000-0000-0000-0000-000000000006",
    message7: "60000000-0000-0000-0000-000000000007",
    message8: "60000000-0000-0000-0000-000000000008",
    message9: "60000000-0000-0000-0000-000000000009",
    topicFaith: "70000000-0000-0000-0000-000000000001",
    topicFamily: "70000000-0000-0000-0000-000000000002",
    topicPurpose: "70000000-0000-0000-0000-000000000003",
    topicHealing: "70000000-0000-0000-0000-000000000004",
    topicHolySpirit: "70000000-0000-0000-0000-000000000005",
    topicGrace: "70000000-0000-0000-0000-000000000006",
    topicLeadership: "70000000-0000-0000-0000-000000000007",
    topicPrayer: "70000000-0000-0000-0000-000000000008",
    campaign1: "88000000-0000-0000-0000-000000000001",
    campaign2: "88000000-0000-0000-0000-000000000002",
    campaign3: "88000000-0000-0000-0000-000000000003",
  };

  try {
    const sarahHash = await bcrypt.default.hash("Faithful123!", 10);
    const adminHash = await bcrypt.default.hash("AdminFaith123!", 10);
    const michaelHash = await bcrypt.default.hash("MemberPass123!", 10);

    // Roles
    await client.query(
      `INSERT INTO roles (id, name) VALUES ($1, 'member'), ($2, 'admin')`,
      [ids.memberRole, ids.adminRole]
    );

    // Users
    await client.query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, profile_image, bio, join_date, membership_type, membership_status, is_active)
       VALUES
         ($1, 'Sarah', 'Jenkins', 'sarah@example.com', $2, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', 'Growing in grace through consistent study, prayer, and community.', '2023-10-01', 'Faithful Member', 'active', TRUE),
         ($3, 'Admin', 'User', 'admin@example.com', $4, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'Administrative account', '2023-01-01', 'Administrator', 'active', TRUE),
         ($5, 'Michael', 'Turner', 'michael@example.com', $6, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', 'Secondary member for access-control testing.', '2024-05-08', 'Member', 'active', TRUE)`,
      [ids.sarah, sarahHash, ids.admin, adminHash, ids.michael, michaelHash]
    );

    // User roles
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2), ($3, $2), ($3, $4), ($5, $2)`,
      [ids.sarah, ids.memberRole, ids.admin, ids.adminRole, ids.michael]
    );

    // Tags
    await client.query(
      `INSERT INTO tags (id, name, color, text_color) VALUES ($1, 'Faithful Learner', 'gold', '#9A3412'), ($2, 'Prayer Warrior', 'blue', '#1D4ED8'), ($3, 'Community Builder', 'green', '#166534')`,
      [ids.faithfulLearner, ids.prayerWarrior, ids.communityBuilder]
    );

    await client.query(
      `INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2), ($1, $3), ($4, $5)`,
      [ids.sarah, ids.faithfulLearner, ids.prayerWarrior, ids.michael, ids.communityBuilder]
    );

    // Courses
    await client.query(
      `INSERT INTO courses (id, title, instructor, category, description, image_url, archived, duration_minutes) VALUES
        ($1, 'Foundations of Faith', 'Dr. Robert Smith', 'Theology', 'Build a strong foundation for a life of faith through in-depth study of God''s Word.', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80', FALSE, 270),
        ($2, 'Biblical Leadership', 'Pastor Sarah Jenkins', 'Leadership', 'Lead with wisdom, humility, courage, and servant-hearted biblical vision.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80', FALSE, 195),
        ($3, 'The Power of Prayer', 'Rev. Michael Chang', 'Prayer', 'Develop a deeper, transformational, and consistent daily prayer walk.', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80', FALSE, 120),
        ($4, 'Serving the City', 'Pastor Elena Cruz', 'Service', 'A community-focused course on mission, outreach, and practical city service.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', FALSE, 180),
        ('30000000-0000-0000-0000-000000000005', 'Walking in Supernatural Faith', 'Pastor Sarah Jenkins', 'Theology', 'A masterclass on activating supernatural faith, understanding God''s promises, overcoming doubt, and walking in victory through every season.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80', FALSE, 150),
        ('30000000-0000-0000-0000-000000000006', 'Covenant Marriage & Family', 'Dr. Robert Smith', 'Marriage', 'Building a strong, Christ-centered marriage and raising godly children with purpose and biblical joy.', 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=900&q=80', FALSE, 120)`,
      [ids.course1, ids.course2, ids.course3, ids.course4]
    );

    // Course Lessons
    const l1_1 = '31000000-0000-0000-0000-000000000001';
    const l1_2 = '31000000-0000-0000-0000-000000000002';
    const l1_3 = '31000000-0000-0000-0000-000000000003';
    const l1_4 = '31000000-0000-0000-0000-000000000004';
    const l1_5 = '31000000-0000-0000-0000-000000000005';
    const l1_6 = '31000000-0000-0000-0000-000000000006';

    const l2_1 = '32000000-0000-0000-0000-000000000001';
    const l2_2 = '32000000-0000-0000-0000-000000000002';
    const l2_3 = '32000000-0000-0000-0000-000000000003';
    const l2_4 = '32000000-0000-0000-0000-000000000004';

    const l3_1 = '33000000-0000-0000-0000-000000000001';
    const l3_2 = '33000000-0000-0000-0000-000000000002';
    const l3_3 = '33000000-0000-0000-0000-000000000003';
    const l3_4 = '33000000-0000-0000-0000-000000000004';
    const l3_5 = '33000000-0000-0000-0000-000000000005';

    const l4_1 = '34000000-0000-0000-0000-000000000001';

    const l5_1 = '35000000-0000-0000-0000-000000000001';
    const l5_2 = '35000000-0000-0000-0000-000000000002';
    const l5_3 = '35000000-0000-0000-0000-000000000003';
    const l5_4 = '35000000-0000-0000-0000-000000000004';

    const l6_1 = '36000000-0000-0000-0000-000000000001';
    const l6_2 = '36000000-0000-0000-0000-000000000002';
    const l6_3 = '36000000-0000-0000-0000-000000000003';

    await client.query(
      `INSERT INTO course_lessons (id, course_id, title, duration_minutes, sort_order, video_url) VALUES
        ($1, $17, 'The Character & Nature of God', 45, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'),
        ($2, $17, 'Grace, Faith and Salvation', 45, 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'),
        ($3, $17, 'Assurance and Identity in Christ', 45, 3, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'),
        ($4, $17, 'The Authority of the Scriptures', 45, 4, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'),
        ($5, $17, 'The Power of Daily Prayer', 45, 5, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'),
        ($6, $17, 'Walking in Community and Fellowship', 45, 6, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4'),
        ($7, $18, 'Character and Calling', 48, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'),
        ($8, $18, 'Servant Leadership in Practice', 48, 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'),
        ($9, $18, 'Leading with Wisdom & Humility', 48, 3, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4'),
        ($10, $18, 'Building Healthy Teams', 51, 4, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'),
        ($11, $19, 'Prayer as Intimate Communion', 24, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4'),
        ($12, $19, 'Intercession in Daily Life', 24, 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4'),
        ($13, $19, 'Listening to God''s Voice', 24, 3, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'),
        ($14, $19, 'Spiritual Warfare & Breakthrough', 24, 4, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'),
        ($15, $19, 'The Discipline of Thanksgiving', 24, 5, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'),
        ($16, $20, 'The Heart of Compassion', 45, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'),
        ($21, '30000000-0000-0000-0000-000000000005', 'The Anatomy of Supernatural Faith', 30, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'),
        ($22, '30000000-0000-0000-0000-000000000005', 'Speaking and Declaring the Word', 35, 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'),
        ($23, '30000000-0000-0000-0000-000000000005', 'Conquering Fear and Unbelief', 40, 3, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'),
        ($24, '30000000-0000-0000-0000-000000000005', 'Standing Unshaken in the Promise', 45, 4, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'),
        ($25, '30000000-0000-0000-0000-000000000006', 'The Foundation of Covenant Love', 40, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'),
        ($26, '30000000-0000-0000-0000-000000000006', 'Communication & Conflict Resolution', 40, 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4'),
        ($27, '30000000-0000-0000-0000-000000000006', 'Building a Generational Legacy', 40, 3, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4')
      ON CONFLICT (id) DO NOTHING`,
      [
        l1_1, l1_2, l1_3, l1_4, l1_5, l1_6,
        l2_1, l2_2, l2_3, l2_4,
        l3_1, l3_2, l3_3, l3_4, l3_5,
        l4_1,
        ids.course1, ids.course2, ids.course3, ids.course4,
        l5_1, l5_2, l5_3, l5_4,
        l6_1, l6_2, l6_3,
      ]
    );

    // Course enrollments
    await client.query(
      `DELETE FROM course_enrollments WHERE member_id = $4;
       INSERT INTO course_enrollments (member_id, course_id, status, enrolled_at, completed_at) VALUES
        ($1, $2, 'active', '2024-01-02', NULL),
        ($1, $3, 'completed', '2024-05-07', '2024-06-01')
      ON CONFLICT (member_id, course_id) DO UPDATE SET status = EXCLUDED.status`,
      [ids.sarah, ids.course1, ids.course3, ids.michael]
    );

    // Lesson Progress
    await client.query(
      `INSERT INTO lesson_progress (member_id, course_id, lesson_id, last_position_seconds, watch_duration_seconds, progress_percentage, is_completed, completed_at) VALUES
        ($1, $2, $4, 2700, 2700, 100, TRUE, '2024-01-05'),
        ($1, $2, $5, 2700, 2700, 100, TRUE, '2024-01-12'),
        ($1, $2, $6, 2700, 2700, 100, TRUE, '2024-01-20'),
        ($1, $2, $7, 2700, 2700, 100, TRUE, '2024-01-28'),
        ($1, $3, $8, 1440, 1440, 100, TRUE, '2024-05-10'),
        ($1, $3, $9, 1440, 1440, 100, TRUE, '2024-05-15'),
        ($1, $3, $10, 1440, 1440, 100, TRUE, '2024-05-20'),
        ($1, $3, $11, 1440, 1440, 100, TRUE, '2024-05-25'),
        ($1, $3, $12, 1440, 1440, 100, TRUE, '2024-05-30')
      ON CONFLICT (member_id, lesson_id) DO NOTHING`,
      [ids.sarah, ids.course1, ids.course3, l1_1, l1_2, l1_3, l1_4, l3_1, l3_2, l3_3, l3_4, l3_5]
    );

    // Events
    await client.query(
      `INSERT INTO events (id, title, description, starts_at, ends_at, location, archived, capacity) VALUES
        ($1, 'Worship Night', 'An evening of worship and prayer.', '2025-03-14T18:00:00Z', '2025-03-14T20:00:00Z', 'Main Sanctuary', FALSE, 300),
        ($2, 'Leadership Masterclass', 'A practical workshop for emerging leaders.', '2025-06-08T13:00:00Z', '2025-06-08T15:00:00Z', 'Online', FALSE, 120),
        ($3, 'Community Picnic', 'Connect with the School of Faith family.', '2026-09-02T15:00:00Z', '2026-09-02T18:00:00Z', 'Riverside Park', FALSE, 250)`,
      [ids.event1, ids.event2, ids.event3]
    );

    // Event registrations
    await client.query(
      `INSERT INTO event_registrations (id, member_id, event_id, registration_status, registered_at) VALUES
        ('41000000-0000-0000-0000-000000000001', $1, $2, 'registered', '2025-03-01'),
        ('41000000-0000-0000-0000-000000000002', $1, $3, 'registered', '2025-05-20'),
        ('41000000-0000-0000-0000-000000000003', $1, $4, 'registered', '2026-07-30')`,
      [ids.sarah, ids.event1, ids.event2, ids.event3]
    );

    await client.query(
      `INSERT INTO event_attendance (member_id, event_id, status) VALUES ($1, $2, 'attended'), ($1, $3, 'attended'), ($1, $4, 'registered')`,
      [ids.sarah, ids.event1, ids.event2, ids.event3]
    );

    await client.query(
      `INSERT INTO event_tickets (member_id, event_id, registration_id, ticket_number, attendance_status, ticket_status, issued_at) VALUES
        ($1, $2, '41000000-0000-0000-0000-000000000001', 'TKT-WORSHIP-001', 'attended', 'used', '2025-03-01'),
        ($1, $3, '41000000-0000-0000-0000-000000000002', 'TKT-LEAD-001', 'attended', 'used', '2025-05-20'),
        ($1, $4, '41000000-0000-0000-0000-000000000003', 'TKT-PICNIC-001', 'registered', 'valid', '2026-07-30')`,
      [ids.sarah, ids.event1, ids.event2, ids.event3]
    );

    // Reading plan
    await client.query(
      `INSERT INTO reading_plans (id, name, description, total_days, active, pdf_url, badge_text, is_featured) VALUES 
        ($1, '30-Day Prayer Guide & Scripture Journal', 'A transformative month-long journey exploring intimate prayer, spiritual breakthrough, and biblical victory.', 30, TRUE, 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'New Resource', TRUE)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, pdf_url = EXCLUDED.pdf_url`,
      [ids.plan1]
    );

    const devTitles = [
      'The Power of Secret Prayer', 'Seeking God\'s Kingdom First', 'The Peace That Transcends Understanding',
      'Walking in Supernatural Faith', 'Releasing Offense & Embracing Grace', 'Overcoming Fear with Perfect Love',
      'The Word as a Lamp to Your Feet', 'The Authority of the Believer', 'Entering God\'s Rest', 'Rivers of Living Water',
      'Put on the Whole Armor of God', 'The Joy of the Lord as Strength', 'Praising Through the Storm', 'Hearing God\'s Still Small Voice',
      'Abiding in the True Vine', 'The Ministry of Reconciliation', 'Confidence Before the Throne of Grace', 'Walking Worthy of the Calling',
      'Guardians of the Heart', 'The Faithfulness of God', 'Renewing the Mind Daily', 'Generosity & Cheerful Giving',
      'Fellowship of the Holy Spirit', 'Healed & Made Whole in Christ', 'Wisdom from Above', 'Praying with Endurance & Hope',
      'The Good Shepherd\'s Guidance', 'Steadfast in Times of Trial', 'Proclaiming the Good News', 'More Than Conquerors in Christ'
    ];

    const scriptures = [
      'Matthew 6:5-15', 'Matthew 6:25-34', 'Philippians 4:4-9', 'Hebrews 11:1-6', 'Colossians 3:12-17', '1 John 4:16-19',
      'Psalm 119:105-112', 'Luke 10:17-20', 'Hebrews 4:1-11', 'John 7:37-39', 'Ephesians 6:10-18', 'Nehemiah 8:8-12',
      'Acts 16:22-34', '1 Kings 19:9-13', 'John 15:1-8', '2 Corinthians 5:17-21', 'Hebrews 4:14-16', 'Ephesians 4:1-6',
      'Proverbs 4:20-27', 'Lamentations 3:21-26', 'Romans 12:1-2', '2 Corinthians 9:6-11', '2 Corinthians 13:11-14', 'Isaiah 53:3-5',
      'James 1:2-8', 'Luke 18:1-8', 'Psalm 23:1-6', 'James 1:12-18', 'Romans 10:13-17', 'Romans 8:31-39'
    ];

    const keyVerses = [
      'But when you pray, go into your room, close the door and pray to your Father, who is unseen.',
      'Seek first his kingdom and his righteousness, and all these things will be given to you as well.',
      'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
      'Now faith is confidence in what we hope for and assurance about what we do not see.',
      'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.',
      'There is no fear in love. But perfect love drives out fear.',
      'Your word is a lamp for my feet, a light on my path.',
      'I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy.',
      'There remains, then, a Sabbath-rest for the people of God.',
      'Whoever believes in me, as Scripture has said, rivers of living water will flow from within them.',
      'Put on the full armor of God, so that you can take your stand against the devil\'s schemes.',
      'Do not grieve, for the joy of the Lord is your strength.',
      'About midnight Paul and Silas were praying and singing hymns to God, and the other prisoners were listening to them.',
      'And after the earthquake a fire, but the Lord was not in the fire: and after the fire a still small voice.',
      'I am the vine; you are the branches. If you remain in me and I in you, you will bear much fruit.',
      'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!',
      'Let us then approach God\'s throne of grace with confidence, so that we may receive mercy and find grace to help in our time of need.',
      'I urge you to live a life worthy of the calling you have received.',
      'Above all else, guard your heart, for everything you do flows from it.',
      'Because of the Lord\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
      'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
      'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.',
      'May the grace of the Lord Jesus Christ, and the love of God, and the fellowship of the Holy Spirit be with you all.',
      'By his wounds we are healed.',
      'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
      'Then Jesus told his disciples a parable to show them that they should always pray and not give up.',
      'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters.',
      'Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.',
      'How beautiful are the feet of those who bring good news!',
      'In all these things we are more than conquerors through him who loved us.'
    ];

    for (let day = 1; day <= 30; day++) {
      const idx = day - 1;
      await client.query(
        `INSERT INTO reading_plan_items (id, plan_id, day_number, title, reference, key_verse, devotional, prayer) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (plan_id, day_number) DO UPDATE 
         SET title = EXCLUDED.title, reference = EXCLUDED.reference, key_verse = EXCLUDED.key_verse, devotional = EXCLUDED.devotional, prayer = EXCLUDED.prayer`,
        [
          `51000000-0000-0000-0000-${String(day).padStart(12, "0")}`,
          ids.plan1,
          day,
          devTitles[idx],
          scriptures[idx],
          keyVerses[idx],
          `As we enter into Day ${day}, quiet your spirit and allow the presence of the Holy Spirit to minister to your innermost thoughts. When we fix our gaze upon Christ rather than the turbulence of the world, our perspective is renewed with supernatural hope, clarity, and divine courage.`,
          `Heavenly Father, thank You for Your unwavering love and the living power of Your Word today. Teach me to walk faithfully in Your promises, to abide in Your presence, and to radiate Your light to everyone I meet. In Jesus' mighty name, Amen.`
        ]
      );
    }

    for (let day = 1; day <= 14; day++) {
      await client.query(
        `INSERT INTO member_reading_progress (member_id, plan_id, item_id, completed_at) VALUES ($1, $2, $3, NOW() - ($4 || ' days')::interval)`,
        [ids.sarah, ids.plan1, `51000000-0000-0000-0000-${String(day).padStart(12, "0")}`, 30 - day]
      );
    }

    // Messages (videos)
    await client.query(
      `INSERT INTO messages (id, title, speaker, category, description, original_url, published_at, archived, thumbnail_url, video_url, duration_minutes) VALUES
        ($1, 'Faith in Action (2-Min Word)', 'Pastor Sarah Jenkins', 'Faith', 'A powerful 2-minute devotional encouraging you to stand firm in faith and praise today.', 'https://schooloffaith.test/messages/faith-in-action', '2024-11-01', FALSE, 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80', 'https://www.w3schools.com/html/mov_bbb.mp4', 2),
        ($2, 'The Power of Forgiveness', 'Pastor Michael', 'Teaching', 'Discover the freedom and spiritual breakthrough that comes with releasing offense and walking in grace.', 'https://schooloffaith.test/messages/power-of-forgiveness', '2024-10-15', FALSE, 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80', 'https://vjs.zencdn.net/v/oceans.mp4', 45),
        ($3, 'Finding Peace in Chaos', 'Dr. Robert Smith', 'Hope Restored', 'Anchoring your mind and soul in God''s supernatural peace during life''s storms.', 'https://schooloffaith.test/messages/finding-peace', '2024-10-08', FALSE, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80', 'https://media.w3.org/2010/05/sintel/trailer.mp4', 52),
        ($4, 'The Anchor of the Soul', 'Pastor Sarah Jenkins', 'Hope Restored', 'A study on biblical hope from Hebrews 6:19 that withstands cultural shifting.', 'https://schooloffaith.test/messages/anchor-of-the-soul', '2024-10-01', FALSE, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4', 65),
        ($5, 'Walking in the Spirit', 'Pastor Michael', 'Holy Spirit', 'Cultivating daily sensitivity to the Holy Spirit''s guidance and prompting.', 'https://schooloffaith.test/messages/walking-in-spirit', '2024-09-24', FALSE, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80', 'https://vjs.zencdn.net/v/oceans.mp4', 48),
        ($6, 'Restoring Broken Relationships', 'Dr. Robert Smith', 'Family', 'Biblical principles for reconciliation, healthy communication, and healing family bonds.', 'https://schooloffaith.test/messages/restoring-relationships', '2024-09-17', FALSE, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80', 'https://media.w3.org/2010/05/sintel/trailer.mp4', 55),
        ($7, 'Vision Sunday 2024', 'Pastor Sarah Jenkins', 'Vision', 'Aligning our hearts with God''s strategic purpose for the upcoming ministry year.', 'https://schooloffaith.test/messages/vision-sunday-2024', '2024-09-10', FALSE, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80', 'https://www.w3schools.com/html/mov_bbb.mp4', 70),
        ($8, 'The Grace Revolution', 'Pastor Michael', 'Teaching', 'Understanding the unearned favor and transformative power of Christ''s righteousness.', 'https://schooloffaith.test/messages/grace-revolution', '2024-09-03', FALSE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80', 'https://vjs.zencdn.net/v/oceans.mp4', 60),
        ($9, 'Leading with Purpose', 'Dr. Robert Smith', 'Leadership', 'Servant leadership modeled on the life and teachings of Jesus Christ.', 'https://schooloffaith.test/messages/leading-with-purpose', '2024-08-27', FALSE, 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80', 'https://media.w3.org/2010/05/sintel/trailer.mp4', 50)`,
      [ids.message9, ids.message1, ids.message2, ids.message3, ids.message4, ids.message5, ids.message6, ids.message7, ids.message8]
    );

    // Topics
    await client.query(
      `INSERT INTO topics (id, name, slug, icon, sort_order) VALUES
        ($1, 'Faith', 'faith', 'Cross', 1), ($2, 'Family', 'family', 'Users', 2),
        ($3, 'Purpose', 'purpose', 'Target', 3), ($4, 'Healing', 'healing', 'Heart', 4),
        ($5, 'Holy Spirit', 'holy-spirit', 'Flame', 5), ($6, 'Grace', 'grace', 'Sparkles', 6),
        ($7, 'Leadership', 'leadership', 'Crown', 7), ($8, 'Prayer', 'prayer', 'HandHeart', 8)`,
      [ids.topicFaith, ids.topicFamily, ids.topicPurpose, ids.topicHealing, ids.topicHolySpirit, ids.topicGrace, ids.topicLeadership, ids.topicPrayer]
    );

    // Message-topic mappings
    await client.query(
      `INSERT INTO message_topics (message_id, topic_id) VALUES
        ($1, $10), ($1, $15), ($1, $17),
        ($2, $13), ($2, $15), ($2, $10),
        ($3, $10), ($3, $13), ($3, $17),
        ($4, $10), ($4, $12),
        ($5, $14), ($5, $17), ($5, $10),
        ($6, $11), ($6, $15), ($6, $13),
        ($7, $12), ($7, $16),
        ($8, $15), ($8, $10),
        ($9, $16), ($9, $12)`,
      [
        ids.message9, ids.message1, ids.message2, ids.message3, ids.message4, ids.message5, ids.message6, ids.message7, ids.message8,
        ids.topicFaith, ids.topicFamily, ids.topicPurpose, ids.topicHealing, ids.topicHolySpirit, ids.topicGrace, ids.topicLeadership, ids.topicPrayer,
      ]
    );

    // Saved messages
    await client.query(
      `INSERT INTO saved_messages (member_id, message_id, saved_at) VALUES ($1, $2, '2026-06-05'), ($1, $3, '2026-07-20')`,
      [ids.sarah, ids.message2, ids.message3]
    );

    // Downloads
    await client.query(
      `INSERT INTO downloads (member_id, resource_name, resource_type, file_url, downloaded_at) VALUES
        ($1, '30-Day Prayer Guide', 'PDF', 'https://schooloffaith.test/resources/30-day-prayer-guide.pdf', '2026-07-08T09:24:00Z'),
        ($1, 'Romans Study Notes', 'Workbook', 'https://schooloffaith.test/resources/romans-study-notes.pdf', '2026-07-14T16:48:00Z')`,
      [ids.sarah]
    );

    // Campaigns
    await client.query(
      `INSERT INTO campaigns (id, title, description, image_url, goal_amount, amount_raised, start_date, end_date, is_active, archived) VALUES
        ($1, 'Southeast Asia Outreach', 'Help us establish 5 new ministry hubs and train 500 local leaders across Southeast Asia this year.', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=80', 100000.00, 45000.00, '2026-01-01', '2026-12-31', TRUE, FALSE),
        ($2, 'Student Scholarship Fund', 'Sponsor emerging leaders from developing nations to access full ministry training programs.', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80', 100000.00, 60000.00, '2026-01-01', '2026-12-31', TRUE, FALSE),
        ($3, 'Global Discipleship Media Hub', 'Expanding multi-language video production and digital distribution infrastructure.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', 50000.00, 15000.00, '2026-03-01', '2026-12-31', TRUE, FALSE)`,
      [ids.campaign1, ids.campaign2, ids.campaign3]
    );

    // Donations
    await client.query(
      `INSERT INTO donation_transactions (member_id, campaign_id, amount, currency, donated_at, fund, method, donation_type, campaign, transaction_id, payment_status) VALUES
        ($1, NULL, 120.00, 'USD', '2026-04-07', 'Where needed most', 'card', 'monthly', 'Where needed most', 'TXN-SARAH-001', 'completed'),
        ($1, $2, 45.00, 'USD', '2026-06-15', 'Southeast Asia Outreach', 'ach', 'one_time', 'Southeast Asia Outreach', 'TXN-SARAH-002', 'completed'),
        ($1, $3, 30.00, 'USD', '2026-08-01', 'Student Scholarship Fund', 'card', 'one_time', 'Student Scholarship Fund', 'TXN-SARAH-003', 'pending'),
        ($4, $2, 250.00, 'USD', '2026-08-05', 'Southeast Asia Outreach', 'card', 'monthly', 'Southeast Asia Outreach', 'TXN-MICHAEL-001', 'completed')`,
      [ids.sarah, ids.campaign1, ids.campaign2, ids.michael]
    );

    // Prayer requests (pending, approved, answered)
    const pr1 = '80000000-0000-0000-0000-000000000001';
    const pr2 = '80000000-0000-0000-0000-000000000002';
    const pr3 = '80000000-0000-0000-0000-000000000003';
    const pr4 = '80000000-0000-0000-0000-000000000004';
    const pr5 = '80000000-0000-0000-0000-000000000005';
    const pr6 = '80000000-0000-0000-0000-000000000006';

    await client.query(
      `INSERT INTO prayer_requests (id, member_id, title, description, category, type, status, author_name, is_anonymous, is_private, created_at, updated_at) VALUES
        ($1, $7, 'Healing for my mother', 'Praying for full recovery and supernatural strength after heart surgery.', 'Healing', 'request', 'approved', 'David K.', FALSE, FALSE, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
        ($2, $8, 'Guidance in new career transition', 'Seeking God''s wisdom, clarity, and peace as I step into a new ministry leadership role.', 'Purpose', 'request', 'approved', 'Grace Chen', FALSE, FALSE, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
        ($3, $8, 'Cancer Free! Praise God!', 'After 6 months of chemotherapy, the doctor confirmed the scans came back 100% clear! God is good.', 'Healing', 'praise', 'approved', 'Marcus Johnson', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        ($4, $7, 'Peace during family challenge', 'Asking for peace that surpasses understanding for my family right now.', 'Faith', 'request', 'approved', 'Anonymous', TRUE, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        ($5, $7, 'Family health & unity', 'Please pray for peace, healing, and spiritual breakthrough in our home.', 'Family', 'request', 'pending', 'Sarah Jenkins', FALSE, FALSE, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
        ($6, $7, 'Breakthrough in housing provision', 'God provided the exact home we needed within our budget! Thank you for standing in prayer with us.', 'General', 'praise', 'answered', 'Sarah Jenkins', FALSE, FALSE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day')`,
      [pr1, pr2, pr3, pr4, pr5, pr6, ids.sarah, ids.admin]
    );

    // Prayer actions
    await client.query(
      `INSERT INTO prayer_actions (prayer_request_id, member_id, created_at) VALUES
        ($1, $6, NOW()), ($1, $7, NOW()),
        ($2, $6, NOW()),
        ($3, $6, NOW()), ($3, $7, NOW()),
        ($4, $7, NOW()),
        ($5, $6, NOW()), ($5, $7, NOW())
      ON CONFLICT DO NOTHING`,
      [pr1, pr2, pr3, pr4, pr6, ids.sarah, ids.admin]
    );

    // Daily Prayer Focus
    const focusId = '90000000-0000-0000-0000-000000000001';
    await client.query(
      `INSERT INTO prayer_focuses (id, title, topic, scripture, description, active_date, is_published, archived, created_at, updated_at) VALUES
        ($1, 'Global Missions & Outreach', 'Global Missions', '"Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit." — Matthew 28:19', 'Today we are praying for our missionary teams in South America and Southeast Asia. Pray for open doors, protection, and a harvest of souls.', CURRENT_DATE, TRUE, FALSE, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [focusId]
    );

    await client.query(
      `INSERT INTO prayer_focus_actions (focus_id, member_id, created_at) VALUES
        ($1, $2, NOW())
      ON CONFLICT DO NOTHING`,
      [focusId, ids.admin]
    );

    // Prayer comments / replies
    await client.query(
      `INSERT INTO prayer_comments (prayer_request_id, member_id, content, author_name, created_at) VALUES
        ($1, $4, 'Standing in prayer with you for your mother! May God touch and heal her completely.', 'Sarah Jenkins', NOW() - INTERVAL '2 hours'),
        ($1, $5, 'Praying for peace and strength for your entire family.', 'Pastor Michael', NOW() - INTERVAL '1 hour'),
        ($2, $4, 'Amen! Trust in the Lord with all your heart — He will direct your paths in this new role.', 'Sarah Jenkins', NOW() - INTERVAL '4 hours'),
        ($3, $4, 'Praise the Lord! What an incredible testimony of God''s goodness and healing power!', 'Sarah Jenkins', NOW() - INTERVAL '18 hours'),
        ($3, $5, 'Rejoicing with you! All glory to God!', 'Pastor Michael', NOW() - INTERVAL '12 hours')
      ON CONFLICT DO NOTHING`,
      [pr1, pr2, pr3, ids.sarah, ids.admin]
    );

    // Activity log
    await client.query(
      `INSERT INTO member_activity (member_id, activity_type, description, related_entity_type, related_entity_id, created_at) VALUES
        ($1, 'course_completed', 'Completed The Power of Prayer', 'course', $2, '2024-06-01'),
        ($1, 'certificate_earned', 'Earned a certificate in Biblical Leadership', 'course', $3, '2024-06-01'),
        ($1, 'event_attended', 'Attended Worship Night', 'event', $4, '2025-03-14'),
        ($1, 'donation_made', 'Completed donation to Global Missions', 'donation', NULL, '2026-06-15'),
        ($1, 'reading_completed', 'Completed Day 14 of The Gospels in 30 Days', 'reading_plan', $5, '2026-08-10'),
        ($1, 'message_saved', 'Saved The Anchor of the Soul', 'message', $6, '2026-07-20'),
        ($1, 'download_performed', 'Downloaded Romans Study Notes', 'download', NULL, '2026-07-14')`,
      [ids.sarah, ids.course3, ids.course2, ids.event1, ids.plan1, ids.message3]
    );

    // Community Categories
    const catGeneral = '91000000-0000-0000-0000-000000000001';
    const catPrayer = '91000000-0000-0000-0000-000000000002';
    const catGroups = '91000000-0000-0000-0000-000000000003';

    await client.query(
      `INSERT INTO community_categories (id, name, slug, icon, status, sort_order) VALUES
        ($1, 'General', 'general', 'Globe', 'active', 1),
        ($2, 'Prayer Wall', 'prayer-wall', 'Heart', 'active', 2),
        ($3, 'Local Groups', 'local-groups', 'Users', 'active', 3)
      ON CONFLICT (slug) DO NOTHING`,
      [catGeneral, catPrayer, catGroups]
    );

    // Community Posts
    const post1 = '92000000-0000-0000-0000-000000000001';
    const post2 = '92000000-0000-0000-0000-000000000002';
    const post3 = '92000000-0000-0000-0000-000000000003';

    await client.query(
      `INSERT INTO community_posts (id, member_id, category_id, content, status, created_at) VALUES
        ($1, $4, $7, 'Welcome everyone to The School of Faith community platform! May this space be a fountain of spiritual encouragement, shared wisdom, and genuine fellowship.', 'approved', NOW() - INTERVAL '2 days'),
        ($2, $5, $8, 'Standing in prayer this morning for all families navigating health challenges and seeking direction. The Lord is faithful in every season!', 'approved', NOW() - INTERVAL '1 day'),
        ($3, $6, $9, 'Excited to announce our London Local Group monthly prayer & fellowship breakfast this coming Saturday! Who is planning to join us?', 'approved', NOW() - INTERVAL '5 hours')
      ON CONFLICT (id) DO NOTHING`,
      [post1, post2, post3, ids.admin, ids.sarah, ids.michael, catGeneral, catPrayer, catGroups]
    );

    // Community Post Likes
    await client.query(
      `INSERT INTO community_post_likes (post_id, member_id, created_at) VALUES
        ($1, $4), ($1, $5),
        ($2, $4), ($2, $6),
        ($3, $4), ($3, $5)
      ON CONFLICT DO NOTHING`,
      [post1, post2, post3, ids.admin, ids.sarah, ids.michael]
    );

    // Community Comments
    await client.query(
      `INSERT INTO community_comments (post_id, member_id, content, created_at) VALUES
        ($1, $4, 'Amen! So blessed to connect with brothers and sisters worldwide.', NOW() - INTERVAL '1 day'),
        ($2, $5, 'Amen Pastor, praying alongside you!', NOW() - INTERVAL '12 hours'),
        ($3, $4, 'Looking forward to meeting everyone in person!', NOW() - INTERVAL '2 hours')
      ON CONFLICT DO NOTHING`,
      [post1, post2, post3, ids.sarah, ids.admin]
    );

    console.log("In-memory database seeded successfully.");
  } catch (error) {
    console.error("Memory seed failed:", error);
  } finally {
    client.release();
  }
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
