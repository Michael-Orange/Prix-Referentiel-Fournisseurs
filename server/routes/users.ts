import express from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { encryptPassword, decryptPassword } from "../utils/password-crypto";

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/", async (_req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(users.username);
    res.json({ users: allUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/password", async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(req.params.id))).limit(1);
    if (!user) return res.status(404).json({ error: "User non trouvé" });
    res.json({ password: decryptPassword(user.passwordEncrypted) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { username, nom, email, password, peutAccesStock, peutAccesPrix, role } = req.body;

    if (!username || !nom || !password) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing) {
      return res.status(400).json({ error: "Username déjà utilisé" });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        nom,
        email: email || null,
        passwordEncrypted: encryptPassword(password),
        peutAccesStock: peutAccesStock ?? false,
        peutAccesPrix: peutAccesPrix ?? false,
        role: role || "user",
        createdBy: (req as any).user.nom,
      })
      .returning();

    res.json({ user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, password, peutAccesStock, peutAccesPrix, role } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (nom !== undefined) updateData.nom = nom;
    if (email !== undefined) updateData.email = email || null;
    if (peutAccesStock !== undefined) updateData.peutAccesStock = peutAccesStock;
    if (peutAccesPrix !== undefined) updateData.peutAccesPrix = peutAccesPrix;
    if (role !== undefined) updateData.role = role;

    if (password && password.trim() !== "") {
      updateData.passwordEncrypted = encryptPassword(password);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "User non trouvé" });
    }

    res.json({ user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/desactiver", async (req, res) => {
  try {
    const [updated] = await db
      .update(users)
      .set({ actif: false, updatedAt: new Date() })
      .where(eq(users.id, parseInt(req.params.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "User non trouvé" });
    res.json({ user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/reactiver", async (req, res) => {
  try {
    const [updated] = await db
      .update(users)
      .set({ actif: true, updatedAt: new Date() })
      .where(eq(users.id, parseInt(req.params.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "User non trouvé" });
    res.json({ user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
