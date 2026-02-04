import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import {
  insertFournisseurSchema,
  insertCategorieSchema,
  insertSousSectionSchema,
  insertProduitSchema,
  insertPrixFournisseurSchema,
} from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

const PASSWORD = process.env.PASSWORD || "filtreplante2024";
const API_KEY = process.env.API_KEY || "fp-api-key-secret";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: "Non authentifié" });
  }
}

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey === API_KEY) {
    next();
  } else {
    res.status(401).json({ error: "API Key invalide" });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "filtreplante-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Auth routes
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

  // Dashboard
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Fournisseurs
  app.get("/api/fournisseurs", requireAuth, async (req, res) => {
    try {
      const fournisseurs = await storage.getFournisseurs();
      res.json(fournisseurs);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs/list", requireAuth, async (req, res) => {
    try {
      const fournisseurs = await storage.getFournisseurs();
      res.json(fournisseurs);
    } catch (error) {
      console.error("Error fetching fournisseurs list:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/fournisseurs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fournisseur = await storage.getFournisseur(id);
      if (!fournisseur) {
        return res.status(404).json({ error: "Fournisseur non trouvé" });
      }
      res.json(fournisseur);
    } catch (error) {
      console.error("Error fetching fournisseur:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/fournisseurs", requireAuth, async (req, res) => {
    try {
      const data = insertFournisseurSchema.parse(req.body);
      const fournisseur = await storage.createFournisseur(data);
      res.status(201).json(fournisseur);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error creating fournisseur:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/fournisseurs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertFournisseurSchema.partial().parse(req.body);
      const fournisseur = await storage.updateFournisseur(id, data);
      if (!fournisseur) {
        return res.status(404).json({ error: "Fournisseur non trouvé" });
      }
      res.json(fournisseur);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error updating fournisseur:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/fournisseurs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFournisseur(id);
      if (!success) {
        return res.status(404).json({ error: "Fournisseur non trouvé" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting fournisseur:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Categories
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/categories/list", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategoriesList();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories list:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const data = insertCategorieSchema.parse(req.body);
      const categorie = await storage.createCategorie(data);
      res.status(201).json(categorie);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error creating categorie:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertCategorieSchema.partial().parse(req.body);
      const categorie = await storage.updateCategorie(id, data);
      if (!categorie) {
        return res.status(404).json({ error: "Catégorie non trouvée" });
      }
      res.json(categorie);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error updating categorie:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCategorie(id);
      if (!success) {
        return res.status(404).json({ error: "Catégorie non trouvée" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting categorie:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/categories/:id/reorder", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { direction } = req.body;
      const success = await storage.reorderCategorie(id, direction);
      res.json({ success });
    } catch (error) {
      console.error("Error reordering categorie:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Sous-sections
  app.get("/api/sous-sections", requireAuth, async (req, res) => {
    try {
      const categorieId = req.query.categorieId ? parseInt(req.query.categorieId as string) : undefined;
      const sousSections = await storage.getSousSections(categorieId);
      res.json(sousSections);
    } catch (error) {
      console.error("Error fetching sous-sections:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/sous-sections", requireAuth, async (req, res) => {
    try {
      const data = insertSousSectionSchema.parse(req.body);
      const sousSection = await storage.createSousSection(data);
      res.status(201).json(sousSection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error creating sous-section:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/sous-sections/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertSousSectionSchema.partial().parse(req.body);
      const sousSection = await storage.updateSousSection(id, data);
      if (!sousSection) {
        return res.status(404).json({ error: "Sous-section non trouvée" });
      }
      res.json(sousSection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error updating sous-section:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/sous-sections/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSousSection(id);
      if (!success) {
        return res.status(404).json({ error: "Sous-section non trouvée" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting sous-section:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/sous-sections/:id/reorder", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { direction } = req.body;
      const success = await storage.reorderSousSection(id, direction);
      res.json({ success });
    } catch (error) {
      console.error("Error reordering sous-section:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Produits
  app.get("/api/produits", requireAuth, async (req, res) => {
    try {
      const produits = await storage.getProduits();
      res.json(produits);
    } catch (error) {
      console.error("Error fetching produits:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const produit = await storage.getProduit(id);
      if (!produit) {
        return res.status(404).json({ error: "Produit non trouvé" });
      }
      res.json(produit);
    } catch (error) {
      console.error("Error fetching produit:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/produits", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.parse(req.body);
      const produit = await storage.createProduit(data);
      res.status(201).json(produit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error creating produit:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertProduitSchema.partial().parse(req.body);
      const produit = await storage.updateProduit(id, data);
      if (!produit) {
        return res.status(404).json({ error: "Produit non trouvé" });
      }
      res.json(produit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error updating produit:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProduit(id);
      if (!success) {
        return res.status(404).json({ error: "Produit non trouvé" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting produit:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Prix
  app.get("/api/prix/:produitId", requireAuth, async (req, res) => {
    try {
      const produitId = parseInt(req.params.produitId);
      const prix = await storage.getPrix(produitId);
      res.json(prix);
    } catch (error) {
      console.error("Error fetching prix:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/prix", requireAuth, async (req, res) => {
    try {
      const data = insertPrixFournisseurSchema.parse(req.body);
      const prix = await storage.createPrix(data);
      res.status(201).json(prix);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error creating prix:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/prix/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertPrixFournisseurSchema.partial().parse(req.body);
      const prix = await storage.updatePrix(id, data);
      if (!prix) {
        return res.status(404).json({ error: "Prix non trouvé" });
      }
      res.json(prix);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Error updating prix:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/prix/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePrix(id);
      if (!success) {
        return res.status(404).json({ error: "Prix non trouvé" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting prix:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Logs
  app.get("/api/logs", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ===== PUBLIC API ROUTES (with API Key) =====
  app.get("/api/public/produits", requireApiKey, async (req, res) => {
    try {
      const produits = await storage.getProduits();
      res.json({
        success: true,
        data: produits.filter((p) => p.actif),
        meta: {
          total: produits.filter((p) => p.actif).length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching public produits:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/public/produits/:id", requireApiKey, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const produit = await storage.getProduit(id);
      if (!produit || !produit.actif) {
        return res.status(404).json({ success: false, error: "Produit non trouvé" });
      }
      res.json({
        success: true,
        data: produit,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error fetching public produit:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/public/produits/reference/:reference", requireApiKey, async (req, res) => {
    try {
      const produit = await storage.getProduitByReference(req.params.reference);
      if (!produit || !produit.actif) {
        return res.status(404).json({ success: false, error: "Produit non trouvé" });
      }
      res.json({
        success: true,
        data: produit,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error fetching public produit by reference:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/public/categories", requireApiKey, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json({
        success: true,
        data: categories,
        meta: {
          total: categories.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching public categories:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  app.get("/api/public/fournisseurs", requireApiKey, async (req, res) => {
    try {
      const fournisseurs = await storage.getFournisseurs();
      res.json({
        success: true,
        data: fournisseurs.filter((f) => f.actif),
        meta: {
          total: fournisseurs.filter((f) => f.actif).length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching public fournisseurs:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  return httpServer;
}
