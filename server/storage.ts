import { db } from "./db";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import {
  fournisseurs,
  categories,
  sousSections,
  produits,
  prixFournisseurs,
  modificationsLog,
  type Fournisseur,
  type InsertFournisseur,
  type Categorie,
  type InsertCategorie,
  type SousSection,
  type InsertSousSection,
  type Produit,
  type InsertProduit,
  type PrixFournisseur,
  type InsertPrixFournisseur,
  type ModificationLog,
  type InsertModificationLog,
  type FournisseurWithStats,
  type CategorieWithSousSections,
  type ProduitWithDetails,
} from "@shared/schema";

export interface IStorage {
  // Fournisseurs
  getFournisseurs(): Promise<FournisseurWithStats[]>;
  getFournisseur(id: number): Promise<Fournisseur | undefined>;
  createFournisseur(data: InsertFournisseur): Promise<Fournisseur>;
  updateFournisseur(id: number, data: Partial<InsertFournisseur>): Promise<Fournisseur | undefined>;
  deleteFournisseur(id: number): Promise<boolean>;

  // Categories
  getCategories(): Promise<CategorieWithSousSections[]>;
  getCategoriesList(): Promise<Categorie[]>;
  getCategorie(id: number): Promise<Categorie | undefined>;
  createCategorie(data: InsertCategorie): Promise<Categorie>;
  updateCategorie(id: number, data: Partial<InsertCategorie>): Promise<Categorie | undefined>;
  deleteCategorie(id: number): Promise<boolean>;
  reorderCategorie(id: number, direction: "up" | "down"): Promise<boolean>;

  // Sous-sections
  getSousSections(categorieId?: number): Promise<SousSection[]>;
  getSousSection(id: number): Promise<SousSection | undefined>;
  createSousSection(data: InsertSousSection): Promise<SousSection>;
  updateSousSection(id: number, data: Partial<InsertSousSection>): Promise<SousSection | undefined>;
  deleteSousSection(id: number): Promise<boolean>;
  reorderSousSection(id: number, direction: "up" | "down"): Promise<boolean>;

  // Produits
  getProduits(): Promise<ProduitWithDetails[]>;
  getProduit(id: number): Promise<ProduitWithDetails | undefined>;
  getProduitByReference(reference: string): Promise<ProduitWithDetails | undefined>;
  createProduit(data: InsertProduit): Promise<Produit>;
  updateProduit(id: number, data: Partial<InsertProduit>): Promise<Produit | undefined>;
  deleteProduit(id: number): Promise<boolean>;
  getNextReference(): Promise<string>;

  // Prix
  getPrix(produitId: number): Promise<(PrixFournisseur & { fournisseur: Fournisseur })[]>;
  getPrixById(id: number): Promise<PrixFournisseur | undefined>;
  createPrix(data: InsertPrixFournisseur): Promise<PrixFournisseur>;
  updatePrix(id: number, data: Partial<InsertPrixFournisseur>): Promise<PrixFournisseur | undefined>;
  deletePrix(id: number): Promise<boolean>;

  // Logs
  getLogs(limit?: number): Promise<ModificationLog[]>;
  createLog(data: InsertModificationLog): Promise<ModificationLog>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalProduits: number;
    totalFournisseurs: number;
    totalCategories: number;
    prixMoyenHT: number;
    recentModifications: ModificationLog[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // Fournisseurs
  async getFournisseurs(): Promise<FournisseurWithStats[]> {
    const results = await db
      .select({
        id: fournisseurs.id,
        nom: fournisseurs.nom,
        tvaApplicable: fournisseurs.tvaApplicable,
        actif: fournisseurs.actif,
        dateCreation: fournisseurs.dateCreation,
        produitsCount: sql<number>`COALESCE((
          SELECT COUNT(DISTINCT ${prixFournisseurs.produitId})
          FROM ${prixFournisseurs}
          WHERE ${prixFournisseurs.fournisseurId} = ${fournisseurs.id}
        ), 0)`,
      })
      .from(fournisseurs)
      .orderBy(asc(fournisseurs.nom));

    return results.map((r) => ({
      ...r,
      produitsCount: Number(r.produitsCount),
    }));
  }

  async getFournisseur(id: number): Promise<Fournisseur | undefined> {
    const [result] = await db.select().from(fournisseurs).where(eq(fournisseurs.id, id));
    return result;
  }

  async createFournisseur(data: InsertFournisseur): Promise<Fournisseur> {
    const [result] = await db.insert(fournisseurs).values(data).returning();
    await this.createLog({
      tableName: "fournisseurs",
      recordId: result.id,
      action: "CREATE",
      nouvelleValeur: result.nom,
    });
    return result;
  }

  async updateFournisseur(id: number, data: Partial<InsertFournisseur>): Promise<Fournisseur | undefined> {
    const existing = await this.getFournisseur(id);
    if (!existing) return undefined;

    const [result] = await db.update(fournisseurs).set(data).where(eq(fournisseurs.id, id)).returning();

    for (const [key, value] of Object.entries(data)) {
      const oldValue = existing[key as keyof Fournisseur];
      if (oldValue !== value) {
        await this.createLog({
          tableName: "fournisseurs",
          recordId: id,
          action: "UPDATE",
          champModifie: key,
          ancienneValeur: String(oldValue),
          nouvelleValeur: String(value),
        });
      }
    }
    return result;
  }

  async deleteFournisseur(id: number): Promise<boolean> {
    const existing = await this.getFournisseur(id);
    if (!existing) return false;

    await db.delete(fournisseurs).where(eq(fournisseurs.id, id));
    await this.createLog({
      tableName: "fournisseurs",
      recordId: id,
      action: "DELETE",
      ancienneValeur: existing.nom,
    });
    return true;
  }

  // Categories
  async getCategories(): Promise<CategorieWithSousSections[]> {
    const cats = await db.select().from(categories).orderBy(asc(categories.ordre));
    const subs = await db.select().from(sousSections).orderBy(asc(sousSections.ordre));
    const prods = await db.select().from(produits);

    return cats.map((cat) => ({
      ...cat,
      sousSections: subs.filter((s) => s.categorieId === cat.id),
      produitsCount: prods.filter((p) => p.categorieId === cat.id).length,
    }));
  }

  async getCategoriesList(): Promise<Categorie[]> {
    return await db.select().from(categories).orderBy(asc(categories.ordre));
  }

  async getCategorie(id: number): Promise<Categorie | undefined> {
    const [result] = await db.select().from(categories).where(eq(categories.id, id));
    return result;
  }

  async createCategorie(data: InsertCategorie): Promise<Categorie> {
    const [result] = await db.insert(categories).values(data).returning();
    await this.createLog({
      tableName: "categories",
      recordId: result.id,
      action: "CREATE",
      nouvelleValeur: result.nom,
    });
    return result;
  }

  async updateCategorie(id: number, data: Partial<InsertCategorie>): Promise<Categorie | undefined> {
    const existing = await this.getCategorie(id);
    if (!existing) return undefined;

    const [result] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();

    for (const [key, value] of Object.entries(data)) {
      const oldValue = existing[key as keyof Categorie];
      if (oldValue !== value) {
        await this.createLog({
          tableName: "categories",
          recordId: id,
          action: "UPDATE",
          champModifie: key,
          ancienneValeur: String(oldValue),
          nouvelleValeur: String(value),
        });
      }
    }
    return result;
  }

  async deleteCategorie(id: number): Promise<boolean> {
    const existing = await this.getCategorie(id);
    if (!existing) return false;

    await db.delete(sousSections).where(eq(sousSections.categorieId, id));
    await db.delete(categories).where(eq(categories.id, id));
    await this.createLog({
      tableName: "categories",
      recordId: id,
      action: "DELETE",
      ancienneValeur: existing.nom,
    });
    return true;
  }

  async reorderCategorie(id: number, direction: "up" | "down"): Promise<boolean> {
    const cats = await db.select().from(categories).orderBy(asc(categories.ordre));
    const index = cats.findIndex((c) => c.id === id);
    if (index === -1) return false;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= cats.length) return false;

    const current = cats[index];
    const swap = cats[swapIndex];

    await db.update(categories).set({ ordre: swap.ordre }).where(eq(categories.id, current.id));
    await db.update(categories).set({ ordre: current.ordre }).where(eq(categories.id, swap.id));

    return true;
  }

  // Sous-sections
  async getSousSections(categorieId?: number): Promise<SousSection[]> {
    if (categorieId) {
      return await db
        .select()
        .from(sousSections)
        .where(eq(sousSections.categorieId, categorieId))
        .orderBy(asc(sousSections.ordre));
    }
    return await db.select().from(sousSections).orderBy(asc(sousSections.ordre));
  }

  async getSousSection(id: number): Promise<SousSection | undefined> {
    const [result] = await db.select().from(sousSections).where(eq(sousSections.id, id));
    return result;
  }

  async createSousSection(data: InsertSousSection): Promise<SousSection> {
    const [result] = await db.insert(sousSections).values(data).returning();
    await this.createLog({
      tableName: "sous_sections",
      recordId: result.id,
      action: "CREATE",
      nouvelleValeur: result.nom,
    });
    return result;
  }

  async updateSousSection(id: number, data: Partial<InsertSousSection>): Promise<SousSection | undefined> {
    const existing = await this.getSousSection(id);
    if (!existing) return undefined;

    const [result] = await db.update(sousSections).set(data).where(eq(sousSections.id, id)).returning();

    for (const [key, value] of Object.entries(data)) {
      const oldValue = existing[key as keyof SousSection];
      if (oldValue !== value) {
        await this.createLog({
          tableName: "sous_sections",
          recordId: id,
          action: "UPDATE",
          champModifie: key,
          ancienneValeur: String(oldValue),
          nouvelleValeur: String(value),
        });
      }
    }
    return result;
  }

  async deleteSousSection(id: number): Promise<boolean> {
    const existing = await this.getSousSection(id);
    if (!existing) return false;

    await db.delete(sousSections).where(eq(sousSections.id, id));
    await this.createLog({
      tableName: "sous_sections",
      recordId: id,
      action: "DELETE",
      ancienneValeur: existing.nom,
    });
    return true;
  }

  async reorderSousSection(id: number, direction: "up" | "down"): Promise<boolean> {
    const sub = await this.getSousSection(id);
    if (!sub) return false;

    const subs = await db
      .select()
      .from(sousSections)
      .where(eq(sousSections.categorieId, sub.categorieId))
      .orderBy(asc(sousSections.ordre));

    const index = subs.findIndex((s) => s.id === id);
    if (index === -1) return false;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= subs.length) return false;

    const current = subs[index];
    const swap = subs[swapIndex];

    await db.update(sousSections).set({ ordre: swap.ordre }).where(eq(sousSections.id, current.id));
    await db.update(sousSections).set({ ordre: current.ordre }).where(eq(sousSections.id, swap.id));

    return true;
  }

  // Produits
  async getProduits(): Promise<ProduitWithDetails[]> {
    const prods = await db.select().from(produits).orderBy(asc(produits.reference));
    const cats = await db.select().from(categories);
    const subs = await db.select().from(sousSections);
    const prix = await db.select().from(prixFournisseurs).where(eq(prixFournisseurs.actif, true));

    return prods.map((prod) => {
      const prodPrix = prix.filter((p) => p.produitId === prod.id);
      const minPrix = prodPrix.length > 0 ? Math.min(...prodPrix.map((p) => p.prixHT)) : undefined;
      const minPrixTTC = prodPrix.length > 0 ? Math.min(...prodPrix.map((p) => p.prixTTC)) : undefined;

      return {
        ...prod,
        categorie: cats.find((c) => c.id === prod.categorieId)!,
        sousSection: subs.find((s) => s.id === prod.sousSectionId) || null,
        prixMin: minPrix,
        prixMinTTC: minPrixTTC,
      };
    });
  }

  async getProduit(id: number): Promise<ProduitWithDetails | undefined> {
    const [prod] = await db.select().from(produits).where(eq(produits.id, id));
    if (!prod) return undefined;

    const [cat] = await db.select().from(categories).where(eq(categories.id, prod.categorieId));
    const [sub] = prod.sousSectionId
      ? await db.select().from(sousSections).where(eq(sousSections.id, prod.sousSectionId))
      : [null];

    const prix = await db.select().from(prixFournisseurs).where(eq(prixFournisseurs.produitId, id));
    const fours = await db.select().from(fournisseurs);

    const prixWithFournisseur = prix.map((p) => ({
      ...p,
      fournisseur: fours.find((f) => f.id === p.fournisseurId)!,
    }));

    const activePrix = prixWithFournisseur.filter((p) => p.actif);
    const minPrix = activePrix.length > 0 ? Math.min(...activePrix.map((p) => p.prixHT)) : undefined;
    const minPrixTTC = activePrix.length > 0 ? Math.min(...activePrix.map((p) => p.prixTTC)) : undefined;

    return {
      ...prod,
      categorie: cat,
      sousSection: sub,
      prixMin: minPrix,
      prixMinTTC: minPrixTTC,
      prix: prixWithFournisseur,
    } as any;
  }

  async getProduitByReference(reference: string): Promise<ProduitWithDetails | undefined> {
    const [prod] = await db.select().from(produits).where(eq(produits.reference, reference));
    if (!prod) return undefined;
    return this.getProduit(prod.id);
  }

  async createProduit(data: InsertProduit): Promise<Produit> {
    const reference = await this.getNextReference();
    const [result] = await db
      .insert(produits)
      .values({ ...data, reference })
      .returning();

    await this.createLog({
      tableName: "produits",
      recordId: result.id,
      action: "CREATE",
      nouvelleValeur: `${result.reference} - ${result.nom}`,
    });
    return result;
  }

  async updateProduit(id: number, data: Partial<InsertProduit>): Promise<Produit | undefined> {
    const existing = await db.select().from(produits).where(eq(produits.id, id));
    if (!existing.length) return undefined;

    const [result] = await db
      .update(produits)
      .set({ ...data, dateModification: new Date() })
      .where(eq(produits.id, id))
      .returning();

    for (const [key, value] of Object.entries(data)) {
      const oldValue = existing[0][key as keyof Produit];
      if (oldValue !== value) {
        await this.createLog({
          tableName: "produits",
          recordId: id,
          action: "UPDATE",
          champModifie: key,
          ancienneValeur: String(oldValue),
          nouvelleValeur: String(value),
        });
      }
    }
    return result;
  }

  async deleteProduit(id: number): Promise<boolean> {
    const [existing] = await db.select().from(produits).where(eq(produits.id, id));
    if (!existing) return false;

    await db.delete(prixFournisseurs).where(eq(prixFournisseurs.produitId, id));
    await db.delete(produits).where(eq(produits.id, id));
    await this.createLog({
      tableName: "produits",
      recordId: id,
      action: "DELETE",
      ancienneValeur: `${existing.reference} - ${existing.nom}`,
    });
    return true;
  }

  async getNextReference(): Promise<string> {
    const [result] = await db
      .select({ maxId: sql<number>`COALESCE(MAX(${produits.id}), 0)` })
      .from(produits);
    const nextNumber = (result?.maxId || 0) + 1;
    return `FP-${nextNumber.toString().padStart(3, "0")}`;
  }

  // Prix
  async getPrix(produitId: number): Promise<(PrixFournisseur & { fournisseur: Fournisseur })[]> {
    const prix = await db
      .select()
      .from(prixFournisseurs)
      .where(eq(prixFournisseurs.produitId, produitId))
      .orderBy(desc(prixFournisseurs.dateCreation));

    const fours = await db.select().from(fournisseurs);

    return prix.map((p) => ({
      ...p,
      fournisseur: fours.find((f) => f.id === p.fournisseurId)!,
    }));
  }

  async getPrixById(id: number): Promise<PrixFournisseur | undefined> {
    const [result] = await db.select().from(prixFournisseurs).where(eq(prixFournisseurs.id, id));
    return result;
  }

  async createPrix(data: InsertPrixFournisseur): Promise<PrixFournisseur> {
    const [result] = await db.insert(prixFournisseurs).values(data).returning();
    await this.createLog({
      tableName: "prix_fournisseurs",
      recordId: result.id,
      action: "CREATE",
      nouvelleValeur: `${result.prixHT} FCFA HT`,
    });
    return result;
  }

  async updatePrix(id: number, data: Partial<InsertPrixFournisseur>): Promise<PrixFournisseur | undefined> {
    const existing = await this.getPrixById(id);
    if (!existing) return undefined;

    const [result] = await db
      .update(prixFournisseurs)
      .set(data)
      .where(eq(prixFournisseurs.id, id))
      .returning();

    if (data.prixHT !== undefined && existing.prixHT !== data.prixHT) {
      await this.createLog({
        tableName: "prix_fournisseurs",
        recordId: id,
        action: "UPDATE",
        champModifie: "prixHT",
        ancienneValeur: `${existing.prixHT} FCFA`,
        nouvelleValeur: `${data.prixHT} FCFA`,
      });
    }
    return result;
  }

  async deletePrix(id: number): Promise<boolean> {
    const existing = await this.getPrixById(id);
    if (!existing) return false;

    await db.delete(prixFournisseurs).where(eq(prixFournisseurs.id, id));
    await this.createLog({
      tableName: "prix_fournisseurs",
      recordId: id,
      action: "DELETE",
      ancienneValeur: `${existing.prixHT} FCFA HT`,
    });
    return true;
  }

  // Logs
  async getLogs(limit = 100): Promise<ModificationLog[]> {
    return await db
      .select()
      .from(modificationsLog)
      .orderBy(desc(modificationsLog.dateModification))
      .limit(limit);
  }

  async createLog(data: InsertModificationLog): Promise<ModificationLog> {
    const [result] = await db.insert(modificationsLog).values(data).returning();
    return result;
  }

  // Dashboard
  async getDashboardStats(): Promise<{
    totalProduits: number;
    totalFournisseurs: number;
    totalCategories: number;
    prixMoyenHT: number;
    recentModifications: ModificationLog[];
  }> {
    const [prodCount] = await db.select({ count: sql<number>`count(*)` }).from(produits);
    const [fourCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fournisseurs)
      .where(eq(fournisseurs.actif, true));
    const [catCount] = await db.select({ count: sql<number>`count(*)` }).from(categories);
    const [avgPrix] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${prixFournisseurs.prixHT}), 0)` })
      .from(prixFournisseurs)
      .where(eq(prixFournisseurs.actif, true));

    const recentLogs = await this.getLogs(10);

    return {
      totalProduits: Number(prodCount?.count || 0),
      totalFournisseurs: Number(fourCount?.count || 0),
      totalCategories: Number(catCount?.count || 0),
      prixMoyenHT: Number(avgPrix?.avg || 0),
      recentModifications: recentLogs,
    };
  }
}

export const storage = new DatabaseStorage();
