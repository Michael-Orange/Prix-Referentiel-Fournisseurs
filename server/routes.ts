import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { resetAndReseed } from "./seed";
import { insertFournisseurSchema, insertProduitMasterSchema, REGIMES_FISCAUX } from "@shared/schema";
import { z } from "zod";
import { requireAuth, requireAdmin, requireApp, verifyToken } from "./middleware/auth";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(cookieParser());

  app.use("/api/auth", authRoutes);
  app.use("/api/admin/users", usersRoutes);

  app.post("/api/admin/reseed", requireAuth, requireAdmin, async (_req, res) => {
    try {
      await resetAndReseed();
      res.json({ success: true, message: "Base de données réinitialisée" });
    } catch (error) {
      console.error("Error reseeding:", error);
      res.status(500).json({ error: "Erreur lors de la réinitialisation" });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const includeInactifs = req.query.includeInactifs === "true";
      res.json(await storage.getFournisseurs(includeInactifs));
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs/list", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const includeInactifs = req.query.includeInactifs === "true";
      res.json(await storage.getFournisseurs(includeInactifs));
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs/:id", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const f = await storage.getFournisseur(parseInt(req.params.id));
      if (!f) return res.status(404).json({ error: "Fournisseur non trouvé" });
      res.json(f);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/fournisseurs", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const data = insertFournisseurSchema.parse(req.body);
      res.status(201).json(await storage.createFournisseur(data));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Données invalides", details: error.errors });
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/fournisseurs/:id", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const data = insertFournisseurSchema.partial().parse(req.body);
      const f = await storage.updateFournisseur(parseInt(req.params.id), data);
      if (!f) return res.status(404).json({ error: "Fournisseur non trouvé" });
      res.json(f);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Données invalides", details: error.errors });
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/fournisseurs/:id/desactiver", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const f = await storage.desactiverFournisseur(parseInt(req.params.id));
      if (!f) return res.status(404).json({ error: "Fournisseur non trouvé" });
      res.json({ message: "Fournisseur désactivé", fournisseur: f });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/fournisseurs/:id/reactiver", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const f = await storage.reactiverFournisseur(parseInt(req.params.id));
      if (!f) return res.status(404).json({ error: "Fournisseur non trouvé" });
      res.json({ message: "Fournisseur réactivé", fournisseur: f });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/categories", requireAuth, async (_req, res) => {
    try {
      res.json({ categories: await storage.getCategories() });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/referentiel/categories", requireAuth, async (req, res) => {
    try {
      const { nom } = req.body;
      if (!nom || nom.trim() === "") {
        return res.status(400).json({ error: "Nom de catégorie requis" });
      }
      const existing = (await storage.getCategories()).find(c => c.nom === nom.trim());
      if (existing) {
        return res.status(400).json({ error: "Cette catégorie existe déjà" });
      }
      const allCats = await storage.getCategories();
      const maxOrdre = allCats.reduce((max, c) => Math.max(max, c.ordreAffichage), 0);
      const categorie = await storage.createCategorie({
        nom: nom.trim(),
        ordreAffichage: maxOrdre + 1,
        estStockable: true,
      });
      res.status(201).json(categorie);
    } catch (error: any) {
      console.error("Erreur création catégorie:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/referentiel/sous-sections", requireAuth, async (req, res) => {
    try {
      const categorie = req.query.categorie as string | undefined;
      const rows = await storage.getSousSectionsDynamiques(categorie);
      res.json(rows);
    } catch (error: any) {
      console.error("Erreur récupération sous-sections:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/referentiel/categories/:id/stockable", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { est_stockable } = req.body;
      if (typeof est_stockable !== "boolean") {
        return res.status(400).json({ error: "est_stockable (boolean) requis" });
      }
      const result = await storage.toggleCategorieStockable(id, est_stockable);
      if (!result) return res.status(404).json({ error: "Catégorie non trouvée" });
      res.json({ categorie: result });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/unites", requireAuth, async (_req, res) => {
    try {
      res.json({ unites: await storage.getUnites() });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/produits", requireAuth, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.categorie) filters.categorie = req.query.categorie as string;
      if (req.query.stockable !== undefined) filters.stockable = req.query.stockable === "true";
      if (req.query.includeInactifs === "true") filters.includeInactifs = true;
      else if (req.query.actif !== undefined) filters.actif = req.query.actif === "true";
      if (req.query.avec_prix !== undefined) filters.avecPrix = req.query.avec_prix === "true";
      res.json({ produits: await storage.getProduits(filters) });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/produits/search", requireAuth, async (req, res) => {
    try {
      const q = req.query.q as string;
      const categorie = req.query.categorie as string | undefined;
      if (!q) return res.json({ resultats: [] });
      const resultats = await storage.searchProduitsSimilaires(q, categorie);
      res.json({ resultats });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/produits/:id", requireAuth, async (req, res) => {
    try {
      const produit = await storage.getProduit(parseInt(req.params.id));
      if (!produit) return res.status(404).json({ error: "Produit non trouvé" });
      res.json({ produit });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/referentiel/produits", requireAuth, async (req, res) => {
    try {
      const data = insertProduitMasterSchema.parse({
        ...req.body,
        creePar: (req as any).user?.nom || req.body.creePar || req.body.cree_par || 'Système',
      });
      const produit = await storage.createProduit(data);
      res.status(201).json(produit);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Données invalides", details: error.errors });
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/referentiel/produits/:id", requireAuth, async (req, res) => {
    try {
      const updateData: any = {};
      if (req.body.nom !== undefined) updateData.nom = req.body.nom;
      if (req.body.estStockable !== undefined) updateData.estStockable = req.body.estStockable;
      if (req.body.est_stockable !== undefined) updateData.estStockable = req.body.est_stockable;
      if (req.body.sousSection !== undefined) {
        const val = req.body.sousSection?.trim();
        updateData.sousSection = (!val || val.toLowerCase() === "tous") ? null : val;
      }
      if (req.body.sous_section !== undefined) {
        const val = req.body.sous_section?.trim();
        updateData.sousSection = (!val || val.toLowerCase() === "tous") ? null : val;
      }
      const produit = await storage.updateProduit(parseInt(req.params.id), updateData);
      if (!produit) return res.status(404).json({ error: "Produit non trouvé" });
      res.json(produit);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/referentiel/produits/:id/desactiver", requireAuth, async (req, res) => {
    try {
      const produit = await storage.desactiverProduit(parseInt(req.params.id));
      if (!produit) return res.status(404).json({ error: "Produit introuvable" });
      res.json({ message: "Produit désactivé", produit });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/referentiel/produits/:id/reactiver", requireAuth, async (req, res) => {
    try {
      const produit = await storage.reactiverProduit(parseInt(req.params.id));
      if (!produit) return res.status(404).json({ error: "Produit introuvable" });
      res.json({ message: "Produit réactivé", produit });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/referentiel/produits/:id/stockable", requireAuth, async (req, res) => {
    try {
      const { est_stockable } = req.body;
      if (est_stockable) {
        const existing = await storage.getProduit(parseInt(req.params.id));
        if (existing && !existing.actif) {
          return res.status(400).json({ error: "Un produit inactif ne peut pas être marqué stockable" });
        }
      }
      const produit = await storage.updateProduit(parseInt(req.params.id), { estStockable: est_stockable });
      if (!produit) return res.status(404).json({ error: "Produit non trouvé" });
      res.json(produit);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/prix/produits/:id/fournisseurs", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const produitId = parseInt(req.params.id);
      const { fournisseur_id, prix_ht, regime_fiscal, est_fournisseur_defaut } = req.body;

      if (!fournisseur_id || !prix_ht || prix_ht <= 0) {
        return res.status(400).json({ error: "fournisseur_id et prix_ht (> 0) requis" });
      }
      if (!REGIMES_FISCAUX.includes(regime_fiscal)) {
        return res.status(400).json({ error: "regime_fiscal invalide (tva_18, sans_tva, brs_5)" });
      }

      const prix = await storage.ajouterPrixFournisseur({
        produitMasterId: produitId,
        fournisseurId: fournisseur_id,
        prixHt: prix_ht,
        regimeFiscal: regime_fiscal,
        estFournisseurDefaut: est_fournisseur_defaut,
        creePar: (req as any).user?.nom || req.body.creePar || req.body.cree_par || 'Système',
      });
      res.status(201).json(prix);
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/prix/fournisseurs/:id", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const { prix_ht, regime_fiscal } = req.body;
      const userName = (req as any).user?.nom || req.body.modifiePar || req.body.modifie_par || 'Système';
      const prix = await storage.updatePrix(parseInt(req.params.id), {
        prixHt: prix_ht,
        regimeFiscal: regime_fiscal,
      }, userName);
      if (!prix) return res.status(404).json({ error: "Prix non trouvé" });
      res.json(prix);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/prix/fournisseurs/:id/defaut", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const prixId = parseInt(req.params.id);
      const prixList = await storage.getPrixProduit(0);
      const client = await import("./db").then(m => m.pool.connect());
      try {
        const result = await client.query(
          "SELECT produit_master_id FROM prix.prix_fournisseurs WHERE id = $1",
          [prixId]
        );
        if (!result.rows[0]) {
          client.release();
          return res.status(404).json({ error: "Prix non trouvé" });
        }
        const produitId = result.rows[0].produit_master_id;
        client.release();
        await storage.definirFournisseurDefaut(produitId, prixId);
        res.json({ success: true });
      } catch (e) {
        client.release();
        throw e;
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/prix/fournisseurs/:id/defaut", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      await storage.retirerFournisseurDefaut(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/prix/fournisseurs/:id/historique", requireAuth, requireApp("prix"), async (req, res) => {
    try {
      const historique = await storage.getHistoriquePrix(parseInt(req.params.id));
      res.json({ historique });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/api-keys", requireAuth, async (req, res) => {
    try {
      const { nom, scopes } = req.body;
      if (!nom || !scopes || !Array.isArray(scopes)) {
        return res.status(400).json({ error: "nom et scopes[] requis" });
      }
      const apiKey = await storage.createApiKey(nom, scopes);
      res.status(201).json(apiKey);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/api-keys", requireAuth, async (_req, res) => {
    try {
      res.json(await storage.getApiKeys());
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  return httpServer;
}
