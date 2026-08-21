import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getPublicCampaigns,
  getCampaignById,
  recordDonation,
} from "../services/donation-service.js";

export const campaignRouter = Router();
export const donationRouter = Router();

// ─── Campaigns Routes (Public) ───────────────────────────────────────────────
campaignRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const campaigns = await getPublicCampaigns();
    res.json(campaigns);
  })
);

campaignRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaign);
  })
);

// ─── Donations Routes (Public / Member) ──────────────────────────────────────
const donationSchema = z.object({
  memberId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1).default("USD"),
  method: z.string().min(1).default("card"),
  donationType: z.string().min(1).default("one_time"),
  fund: z.string().min(1).default("Where needed most"),
  campaignName: z.string().optional().nullable(),
  paymentStatus: z.enum(["pending", "completed", "failed", "refunded"]).default("completed"),
  transactionId: z.string().optional(),
});

donationRouter.post(
  "/",
  validate(donationSchema),
  asyncHandler(async (req, res) => {
    // If authenticated user is attached via token or req.user, use their ID
    const memberId = req.user?.id || req.body.memberId || null;

    const donation = await recordDonation({
      ...req.body,
      memberId,
    });

    res.status(201).json(donation);
  })
);
