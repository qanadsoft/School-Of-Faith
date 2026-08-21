import { isTokenRevoked, verifyToken } from "../auth.js";
import { getUserById } from "../services/user-service.js";

export function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7);
}

export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (isTokenRevoked(token)) {
      return res.status(401).json({ message: "Token has been revoked." });
    }

    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token || isTokenRevoked(token)) {
      req.user = null;
      return next();
    }
    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.roles?.includes(role)) {
      return res.status(403).json({ message: "Forbidden." });
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");
