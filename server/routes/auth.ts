import express from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateToken, verifyToken } from "../middleware/auth";
import { decryptPassword } from "../utils/password-crypto";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username et password requis" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !user.actif) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const storedPassword = decryptPassword(user.passwordEncrypted);

    if (password !== storedPassword) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const apps: string[] = [];
    if (user.peutAccesPrix) {
      apps.push("prix", "stock");
    } else if (user.peutAccesStock) {
      apps.push("stock");
    }

    if (apps.length === 0) {
      return res.status(403).json({ error: "Aucune permission" });
    }

    await db
      .update(users)
      .set({ derniereConnexion: new Date() })
      .where(eq(users.id, user.id));

    const token = generateToken({
      userId: user.id,
      username: user.username,
      nom: user.nom,
      role: user.role as "admin" | "user",
      apps,
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        nom: user.nom,
        role: user.role,
        peutAccesStock: user.peutAccesStock,
        peutAccesPrix: user.peutAccesPrix,
      },
    });
  } catch (error: any) {
    console.error("Erreur login:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("auth_token");
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.clearCookie("auth_token");
    return res.status(401).json({ error: "Token invalide" });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.actif) {
    res.clearCookie("auth_token");
    return res.status(401).json({ error: "Compte désactivé" });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      nom: user.nom,
      role: user.role,
      peutAccesStock: user.peutAccesStock,
      peutAccesPrix: user.peutAccesPrix,
    },
  });
});

router.get("/usernames", async (_req, res) => {
  try {
    const activeUsers = await db
      .select({ username: users.username, peutAccesPrix: users.peutAccesPrix })
      .from(users)
      .where(eq(users.actif, true))
      .orderBy(users.username);

    const prixUsers = activeUsers.filter((u) => u.peutAccesPrix);
    res.json({ usernames: prixUsers.map((u) => u.username) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
