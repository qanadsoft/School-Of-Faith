import { Router } from "express";
import { z } from "zod";
import { comparePassword, hashPassword, revokeToken, signToken } from "../auth.js";
import { query } from "../db/pool.js";
import { getTokenFromRequest, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getUserByEmail, getUserById, serializeUser } from "../services/user-service.js";

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `
        INSERT INTO users (first_name, last_name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [firstName, lastName, email, passwordHash]
    );

    const memberRole = await query(`SELECT id FROM roles WHERE name = 'member' LIMIT 1`);
    await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
      result.rows[0].id,
      memberRole.rows[0].id,
    ]);

    const user = await getUserById(result.rows[0].id);
    const token = signToken(user);

    res.status(201).json({ token, user: serializeUser(user) });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user);
    res.json({ token, user: serializeUser(user) });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = getTokenFromRequest(req);
    if (token) {
      revokeToken(token);
    }
    res.status(204).send();
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: serializeUser(req.user) });
  })
);

export default router;
