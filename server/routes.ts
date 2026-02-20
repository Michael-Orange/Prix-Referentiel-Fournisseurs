import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { resetAndReseed } from "./seed";
import { insertFournisseurSchema, insertProduitMasterSchema, REGIMES_FISCAUX } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

const PASSWORD = process.env.PASSWORD || "filtreplante2024";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: "Non authentifié" });
  }
}

function requireScope(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
    if (!apiKeyHeader) {
      return res.status(401).json({ error: "API key manquante" });
    }
    const keyData = await storage.getApiKey(apiKeyHeader);
    if (!keyData) {
      return res.status(401).json({ error: "API key invalide" });
    }
    if (!keyData.scopes.includes(scope)) {
      return res.status(403).json({ error: `Scope requis: ${scope}` });
    }
    (req as any).apiKeyData = keyData;
    next();
  };
}

function authOrScope(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.authenticated) {
      return next();
    }
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
    if (apiKeyHeader) {
      const keyData = await storage.getApiKey(apiKeyHeader);
      if (keyData && keyData.scopes.includes(scope)) {
        (req as any).apiKeyData = keyData;
        return next();
      }
    }
    res.status(401).json({ error: "Authentification requise" });
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "filtreplante-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.get("/api/auth/check", (req, res) => {
    if (req.session?.authenticated) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
      req.session.authenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Mot de passe incorrect" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.post("/api/admin/reseed", requireAuth, async (_req, res) => {
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

  app.get("/api/fournisseurs", authOrScope("prix:read"), async (_req, res) => {
    try {
      res.json(await storage.getFournisseurs());
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs/list", authOrScope("prix:read"), async (_req, res) => {
    try {
      res.json(await storage.getFournisseurs());
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs/:id", authOrScope("prix:read"), async (req, res) => {
    try {
      const f = await storage.getFournisseur(parseInt(req.params.id));
      if (!f) return res.status(404).json({ error: "Fournisseur non trouvé" });
      res.json(f);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/fournisseurs", authOrScope("prix:write"), async (req, res) => {
    try {
      const data = insertFournisseurSchema.parse(req.body);
      res.status(201).json(await storage.createFournisseur(data));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Données invalides", details: error.errors });
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/fournisseurs/:id", authOrScope("prix:write"), async (req, res) => {
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

  app.delete("/api/fournisseurs/:id", authOrScope("prix:write"), async (req, res) => {
    try {
      const ok = await storage.deleteFournisseur(parseInt(req.params.id));
      if (!ok) return res.status(404).json({ error: "Fournisseur non trouvé" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/categories", authOrScope("referentiel:read"), async (_req, res) => {
    try {
      res.json({ categories: await storage.getCategories() });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/unites", authOrScope("referentiel:read"), async (_req, res) => {
    try {
      res.json({ unites: await storage.getUnites() });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/produits", authOrScope("referentiel:read"), async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.categorie) filters.categorie = req.query.categorie as string;
      if (req.query.stockable !== undefined) filters.stockable = req.query.stockable === "true";
      if (req.query.actif !== undefined) filters.actif = req.query.actif === "true";
      if (req.query.avec_prix !== undefined) filters.avecPrix = req.query.avec_prix === "true";
      res.json({ produits: await storage.getProduits(filters) });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/referentiel/produits/search", authOrScope("referentiel:read"), async (req, res) => {
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

  app.get("/api/referentiel/produits/:id", authOrScope("referentiel:read"), async (req, res) => {
    try {
      const produit = await storage.getProduit(parseInt(req.params.id));
      if (!produit) return res.status(404).json({ error: "Produit non trouvé" });
      res.json({ produit });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/referentiel/produits", authOrScope("referentiel:write"), async (req, res) => {
    try {
      const data = insertProduitMasterSchema.parse(req.body);
      const produit = await storage.createProduit(data);
      res.status(201).json(produit);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Données invalides", details: error.errors });
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/referentiel/produits/:id", authOrScope("referentiel:write"), async (req, res) => {
    try {
      const produit = await storage.updateProduit(parseInt(req.params.id), req.body);
      if (!produit) return res.status(404).json({ error: "Produit non trouvé" });
      res.json(produit);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/referentiel/produits/:id/stockable", authOrScope("stock:write"), async (req, res) => {
    try {
      const { est_stockable } = req.body;
      const produit = await storage.updateProduit(parseInt(req.params.id), { estStockable: est_stockable });
      if (!produit) return res.status(404).json({ error: "Produit non trouvé" });
      res.json(produit);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/prix/produits/:id/fournisseurs", authOrScope("prix:write"), async (req, res) => {
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
      });
      res.status(201).json(prix);
    } catch (error: any) {
      if (error?.constraint === "uq_produit_fournisseur") {
        return res.status(409).json({ error: "Ce fournisseur a déjà un prix pour ce produit" });
      }
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/prix/fournisseurs/:id", authOrScope("prix:write"), async (req, res) => {
    try {
      const { prix_ht, regime_fiscal } = req.body;
      const prix = await storage.updatePrix(parseInt(req.params.id), {
        prixHt: prix_ht,
        regimeFiscal: regime_fiscal,
      });
      if (!prix) return res.status(404).json({ error: "Prix non trouvé" });
      res.json(prix);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/prix/fournisseurs/:id/defaut", authOrScope("prix:write"), async (req, res) => {
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

  app.delete("/api/prix/fournisseurs/:id/defaut", authOrScope("prix:write"), async (req, res) => {
    try {
      await storage.retirerFournisseurDefaut(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/prix/fournisseurs/:id/historique", authOrScope("prix:read"), async (req, res) => {
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
