import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "./config.js";

const revokedTokens = new Set();

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      jti: crypto.randomUUID(),
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function revokeToken(token) {
  revokedTokens.add(token);
}

export function isTokenRevoked(token) {
  return revokedTokens.has(token);
}
