import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-jwt";
const JWT_EXPIRES_IN = "7d";

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET non définie");
}

export interface JWTPayload {
  userId: number;
  username: string;
  nom: string;
  role: "admin" | "user";
  apps: string[];
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Token invalide" });
  }

  (req as any).user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JWTPayload;

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin requis" });
  }

  next();
}

export function requireApp(appName: "stock" | "prix") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JWTPayload;

    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    if (user.role === "admin") {
      return next();
    }

    if (!user.apps.includes(appName)) {
      return res.status(403).json({ error: `Accès refusé à ${appName}` });
    }

    next();
  };
}
