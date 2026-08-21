import { query } from "../db/pool.js";
import { sanitizeText } from "../utils/sanitize.js";

/**
 * Recalculate and update the amount_raised for a campaign from actual completed donations
 */
export async function syncCampaignRaised(campaignId) {
  if (!campaignId) return;
  await query(
    `
      UPDATE campaigns
      SET amount_raised = COALESCE(
        (
          SELECT SUM(amount)::numeric
          FROM donation_transactions
          WHERE campaign_id = $1
            AND payment_status = 'completed'
        ),
        0
      ),
      updated_at = NOW()
      WHERE id = $1
    `,
    [campaignId]
  );
}

/**
 * Public/Member: Get all active campaigns
 */
export async function getPublicCampaigns() {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.description,
        c.image_url,
        c.goal_amount::float AS goal_amount,
        COALESCE(
          (
            SELECT SUM(dt.amount)::float
            FROM donation_transactions dt
            WHERE dt.campaign_id = c.id
              AND dt.payment_status = 'completed'
          ),
          c.amount_raised::float,
          0
        ) AS amount_raised,
        c.start_date,
        c.end_date,
        c.is_active,
        ROUND(
          CASE
            WHEN c.goal_amount > 0 THEN
              LEAST(
                100,
                (
                  COALESCE(
                    (
                      SELECT SUM(dt.amount)::numeric
                      FROM donation_transactions dt
                      WHERE dt.campaign_id = c.id
                        AND dt.payment_status = 'completed'
                    ),
                    c.amount_raised,
                    0
                  ) / c.goal_amount
                ) * 100
              )
            ELSE 0
          END
        )::int AS progress_percentage,
        (
          SELECT COUNT(*)::int
          FROM donation_transactions dt
          WHERE dt.campaign_id = c.id
            AND dt.payment_status = 'completed'
        ) AS total_donations
      FROM campaigns c
      WHERE c.is_active = TRUE
        AND c.archived = FALSE
      ORDER BY c.created_at ASC
    `
  );
  return result.rows;
}

/**
 * Public/Member: Get campaign by ID
 */
export async function getCampaignById(id) {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.description,
        c.image_url,
        c.goal_amount::float AS goal_amount,
        COALESCE(
          (
            SELECT SUM(dt.amount)::float
            FROM donation_transactions dt
            WHERE dt.campaign_id = c.id
              AND dt.payment_status = 'completed'
          ),
          c.amount_raised::float,
          0
        ) AS amount_raised,
        c.start_date,
        c.end_date,
        c.is_active,
        ROUND(
          CASE
            WHEN c.goal_amount > 0 THEN
              LEAST(
                100,
                (
                  COALESCE(
                    (
                      SELECT SUM(dt.amount)::numeric
                      FROM donation_transactions dt
                      WHERE dt.campaign_id = c.id
                        AND dt.payment_status = 'completed'
                    ),
                    c.amount_raised,
                    0
                  ) / c.goal_amount
                ) * 100
              )
            ELSE 0
          END
        )::int AS progress_percentage,
        (
          SELECT COUNT(*)::int
          FROM donation_transactions dt
          WHERE dt.campaign_id = c.id
            AND dt.payment_status = 'completed'
        ) AS total_donations
      FROM campaigns c
      WHERE c.id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}

const isUuid = (val) =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Record a new donation (Member or Guest)
 */
export async function recordDonation(data) {
  const {
    memberId,
    campaignId,
    amount,
    currency = "USD",
    method = "card",
    donationType = "one_time",
    fund = "Where needed most",
    campaignName,
    paymentStatus = "completed",
    transactionId,
  } = data;

  const txnId = transactionId || `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const validMemberId = isUuid(memberId) ? memberId.trim() : null;
  let effectiveCampaignId = isUuid(campaignId) ? campaignId.trim() : null;
  let effectiveFund = fund || "Where needed most";

  if (!effectiveCampaignId && fund && fund !== "Where needed most") {
    const matched = await query(`SELECT id FROM campaigns WHERE title ILIKE $1 LIMIT 1`, [fund.trim()]);
    if (matched.rows[0]) {
      effectiveCampaignId = matched.rows[0].id;
    }
  }

  const result = await query(
    `
      INSERT INTO donation_transactions
        (member_id, campaign_id, amount, currency, method, transaction_id, donation_type, fund, campaign, payment_status, donated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `,
    [
      validMemberId,
      effectiveCampaignId,
      amount,
      currency,
      sanitizeText(method),
      txnId,
      sanitizeText(donationType),
      sanitizeText(effectiveFund),
      campaignName ? sanitizeText(campaignName) : sanitizeText(effectiveFund),
      paymentStatus,
    ]
  );

  const donation = result.rows[0];

  // Sync campaign amount raised if completed
  if (effectiveCampaignId && paymentStatus === "completed") {
    await syncCampaignRaised(effectiveCampaignId);
  }

  // Log member activity if logged in
  if (validMemberId && paymentStatus === "completed") {
    await query(
      `
        INSERT INTO member_activity (member_id, activity_type, description, metadata)
        VALUES ($1, 'donation_made', $2, $3)
      `,
      [
        validMemberId,
        `Donated $${amount} to ${sanitizeText(effectiveFund)}`,
        JSON.stringify({ transactionId: txnId, amount, fund: effectiveFund, donationType }),
      ]
    );
  }

  return donation;
}

/**
 * Admin: Get all campaigns with analytics
 */
export async function getAdminCampaigns() {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.description,
        c.image_url,
        c.goal_amount::float AS goal_amount,
        COALESCE(
          (
            SELECT SUM(dt.amount)::float
            FROM donation_transactions dt
            WHERE dt.campaign_id = c.id
              AND dt.payment_status = 'completed'
          ),
          c.amount_raised::float,
          0
        ) AS amount_raised,
        GREATEST(
          0,
          c.goal_amount::float - COALESCE(
            (
              SELECT SUM(dt.amount)::float
              FROM donation_transactions dt
              WHERE dt.campaign_id = c.id
                AND dt.payment_status = 'completed'
            ),
            c.amount_raised::float,
            0
          )
        ) AS remaining_amount,
        ROUND(
          CASE
            WHEN c.goal_amount > 0 THEN
              LEAST(
                100,
                (
                  COALESCE(
                    (
                      SELECT SUM(dt.amount)::numeric
                      FROM donation_transactions dt
                      WHERE dt.campaign_id = c.id
                        AND dt.payment_status = 'completed'
                    ),
                    c.amount_raised,
                    0
                  ) / c.goal_amount
                ) * 100
              )
            ELSE 0
          END
        )::int AS progress_percentage,
        (
          SELECT COUNT(*)::int
          FROM donation_transactions dt
          WHERE dt.campaign_id = c.id
            AND dt.payment_status = 'completed'
        ) AS total_donations,
        c.start_date,
        c.end_date,
        c.is_active,
        c.archived,
        c.created_at,
        c.updated_at
      FROM campaigns c
      WHERE c.archived = FALSE
      ORDER BY c.created_at DESC
    `
  );
  return result.rows;
}

/**
 * Admin: Create a campaign
 */
export async function createCampaign(data) {
  const { title, description, imageUrl, goalAmount, startDate, endDate, isActive } = data;
  const result = await query(
    `
      INSERT INTO campaigns (title, description, image_url, goal_amount, amount_raised, start_date, end_date, is_active, archived)
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7, FALSE)
      RETURNING *
    `,
    [
      sanitizeText(title),
      sanitizeText(description ?? ""),
      imageUrl || null,
      goalAmount || 0,
      startDate || new Date().toISOString().split("T")[0],
      endDate || null,
      isActive !== undefined ? isActive : true,
    ]
  );
  return result.rows[0];
}

/**
 * Admin: Update a campaign
 */
export async function updateCampaign(id, data) {
  const { title, description, imageUrl, goalAmount, startDate, endDate, isActive, archived } = data;
  const result = await query(
    `
      UPDATE campaigns
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        goal_amount = COALESCE($4, goal_amount),
        start_date = COALESCE($5, start_date),
        end_date = $6,
        is_active = COALESCE($7, is_active),
        archived = COALESCE($8, archived),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `,
    [
      title ? sanitizeText(title) : null,
      description !== undefined ? sanitizeText(description) : null,
      imageUrl !== undefined ? imageUrl : null,
      goalAmount !== undefined ? goalAmount : null,
      startDate || null,
      endDate || null,
      isActive !== undefined ? isActive : null,
      archived !== undefined ? archived : null,
      id,
    ]
  );
  return result.rows[0] || null;
}

/**
 * Admin: Delete / archive a campaign
 */
export async function deleteCampaign(id) {
  await query(`UPDATE campaigns SET archived = TRUE, is_active = FALSE WHERE id = $1`, [id]);
}

/**
 * Admin: Comprehensive donation stats
 */
export async function getAdminDonationStats() {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total_donations,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0)::float AS total_raised,
        COUNT(*) FILTER (WHERE donation_type ILIKE '%monthly%' OR donation_type ILIKE '%partner%')::int AS monthly_count,
        COALESCE(SUM(amount) FILTER (WHERE (donation_type ILIKE '%monthly%' OR donation_type ILIKE '%partner%') AND payment_status = 'completed'), 0)::float AS monthly_raised,
        COUNT(*) FILTER (WHERE donation_type NOT ILIKE '%monthly%' AND donation_type NOT ILIKE '%partner%')::int AS onetime_count,
        COALESCE(SUM(amount) FILTER (WHERE donation_type NOT ILIKE '%monthly%' AND donation_type NOT ILIKE '%partner%' AND payment_status = 'completed'), 0)::float AS onetime_raised,
        COUNT(*) FILTER (WHERE payment_status = 'completed')::int AS completed_count,
        COUNT(*) FILTER (WHERE payment_status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE payment_status IN ('failed', 'refunded'))::int AS failed_count
      FROM donation_transactions
    `
  );
  return result.rows[0] || {
    total_donations: 0,
    total_raised: 0,
    monthly_count: 0,
    monthly_raised: 0,
    onetime_count: 0,
    onetime_raised: 0,
    completed_count: 0,
    pending_count: 0,
    failed_count: 0,
  };
}

/**
 * Admin: List all donation transactions with filters
 */
export async function getAdminDonationsList(filters = {}) {
  const { search, fund, status, donationType } = filters;
  const conditions = [];
  const params = [];

  if (fund) {
    params.push(fund);
    conditions.push(`dt.fund = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`dt.payment_status = $${params.length}`);
  }

  if (donationType) {
    params.push(donationType);
    conditions.push(`dt.donation_type ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        dt.id,
        dt.member_id,
        dt.campaign_id,
        dt.amount::float AS amount,
        dt.currency,
        dt.fund,
        dt.method,
        dt.donation_type,
        dt.campaign,
        dt.transaction_id,
        dt.payment_status,
        dt.donated_at,
        JSON_BUILD_OBJECT('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email) AS member,
        JSON_BUILD_OBJECT('id', c.id, 'title', c.title) AS campaign_detail
      FROM donation_transactions dt
      LEFT JOIN users u ON u.id = dt.member_id
      LEFT JOIN campaigns c ON c.id = dt.campaign_id
      ${whereClause}
      ORDER BY dt.donated_at DESC
    `,
    params
  );

  return result.rows;
}
