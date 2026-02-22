import { db, pool } from "./db";
import { eq, desc, and, sql, asc, count, isNull } from "drizzle-orm";
import {
  fournisseurs,
  categories,
  unites,
  produitsMaster,
  prixFournisseurs,
  historiquePrix,
  apiKeys,
  calculerPrix,
  normaliserNom,
  normalizeProductName,
  type Fournisseur,
  type InsertFournisseur,
  type Categorie,
  type InsertCategorie,
  type Unite,
  type ProduitMaster,
  type InsertProduitMaster,
  type PrixFournisseur,
  type InsertPrixFournisseur,
  type HistoriquePrix,
  type ApiKey,
  type ProduitWithPrixDefaut,
  type ProduitDetail,
  type FournisseurWithStats,
  type SousSectionDynamic,
} from "@shared/schema";

export interface IStorage {
  getFournisseurs(includeInactifs?: boolean): Promise<FournisseurWithStats[]>;
  getFournisseur(id: number): Promise<Fournisseur | undefined>;
  createFournisseur(data: InsertFournisseur): Promise<Fournisseur>;
  updateFournisseur(id: number, data: Partial<InsertFournisseur>): Promise<Fournisseur | undefined>;
  desactiverFournisseur(id: number): Promise<Fournisseur | undefined>;
  reactiverFournisseur(id: number): Promise<Fournisseur | undefined>;

  getCategories(): Promise<(Categorie & { count: number })[]>;
  createCategorie(data: InsertCategorie): Promise<Categorie>;
  toggleCategorieStockable(id: number, estStockable: boolean): Promise<Categorie | undefined>;
  getSousSectionsDynamiques(categorie?: string): Promise<SousSectionDynamic[]>;
  getUnites(): Promise<Unite[]>;

  getProduits(filters?: { categorie?: string; stockable?: boolean; actif?: boolean; includeInactifs?: boolean; avecPrix?: boolean }): Promise<ProduitWithPrixDefaut[]>;
  desactiverProduit(id: number): Promise<ProduitMaster | undefined>;
  reactiverProduit(id: number): Promise<ProduitMaster | undefined>;
  getProduit(id: number): Promise<ProduitDetail | undefined>;
  createProduit(data: InsertProduitMaster): Promise<ProduitMaster>;
  updateProduit(id: number, data: Partial<InsertProduitMaster>): Promise<ProduitMaster | undefined>;
  searchProduitsSimilaires(nom: string, categorie?: string): Promise<{ id: number; nom: string; categorie: string; score: number }[]>;

  getPrixProduit(produitId: number): Promise<(PrixFournisseur & { fournisseur: Fournisseur })[]>;
  ajouterPrixFournisseur(data: { produitMasterId: number; fournisseurId: number; prixHt: number; regimeFiscal: string; estFournisseurDefaut?: boolean; creePar?: string }): Promise<PrixFournisseur>;
  updatePrix(id: number, data: { prixHt?: number; regimeFiscal?: string }, userName?: string): Promise<PrixFournisseur | undefined>;
  definirFournisseurDefaut(produitId: number, prixFournisseurId: number): Promise<void>;
  retirerFournisseurDefaut(prixFournisseurId: number): Promise<void>;

  getHistoriquePrix(prixFournisseurId: number): Promise<HistoriquePrix[]>;

  getApiKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(nom: string, scopes: string[]): Promise<ApiKey>;
  getApiKeys(): Promise<ApiKey[]>;

  getDashboardStats(): Promise<{
    totalProduits: number;
    totalFournisseurs: number;
    totalCategories: number;
    produitsAvecPrix: number;
    produitsSansPrix: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getFournisseurs(includeInactifs?: boolean): Promise<FournisseurWithStats[]> {
    const conditions = [];
    if (!includeInactifs) {
      conditions.push(eq(fournisseurs.actif, true));
    }
    const results = await db
      .select({
        id: fournisseurs.id,
        nom: fournisseurs.nom,
        contact: fournisseurs.contact,
        telephone: fournisseurs.telephone,
        email: fournisseurs.email,
        adresse: fournisseurs.adresse,
        statutTva: fournisseurs.statutTva,
        actif: fournisseurs.actif,
        dateCreation: fournisseurs.dateCreation,
        produitsCount: sql<number>`COALESCE((
          SELECT COUNT(DISTINCT ${prixFournisseurs.produitMasterId})
          FROM ${prixFournisseurs}
          WHERE ${prixFournisseurs.fournisseurId} = ${fournisseurs.id}
          AND ${prixFournisseurs.actif} = true
        ), 0)`,
      })
      .from(fournisseurs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(fournisseurs.nom));
    return results as FournisseurWithStats[];
  }

  async getFournisseur(id: number): Promise<Fournisseur | undefined> {
    const [result] = await db.select().from(fournisseurs).where(eq(fournisseurs.id, id));
    return result;
  }

  async createFournisseur(data: InsertFournisseur): Promise<Fournisseur> {
    const [result] = await db.insert(fournisseurs).values(data).returning();
    return result;
  }

  async updateFournisseur(id: number, data: Partial<InsertFournisseur>): Promise<Fournisseur | undefined> {
    const [result] = await db.update(fournisseurs).set(data).where(eq(fournisseurs.id, id)).returning();
    return result;
  }

  async desactiverFournisseur(id: number): Promise<Fournisseur | undefined> {
    const [result] = await db
      .update(fournisseurs)
      .set({ actif: false })
      .where(eq(fournisseurs.id, id))
      .returning();
    return result;
  }

  async reactiverFournisseur(id: number): Promise<Fournisseur | undefined> {
    const [result] = await db
      .update(fournisseurs)
      .set({ actif: true })
      .where(eq(fournisseurs.id, id))
      .returning();
    return result;
  }

  async getCategories(): Promise<(Categorie & { count: number })[]> {
    const catRows = await db.select().from(categories).orderBy(asc(categories.ordreAffichage));
    const countRows = await db
      .select({
        categorie: produitsMaster.categorie,
        count: sql<number>`count(*)::int`,
      })
      .from(produitsMaster)
      .where(and(eq(produitsMaster.actif, true), isNull(produitsMaster.templateParentId)))
      .groupBy(produitsMaster.categorie);

    const countMap = new Map(countRows.map(r => [r.categorie, r.count]));
    return catRows.map(c => ({ ...c, count: countMap.get(c.nom) || 0 }));
  }

  async createCategorie(data: InsertCategorie): Promise<Categorie> {
    const [result] = await db.insert(categories).values(data).returning();
    return result;
  }

  async toggleCategorieStockable(id: number, estStockable: boolean): Promise<Categorie | undefined> {
    const [result] = await db
      .update(categories)
      .set({ estStockable })
      .where(eq(categories.id, id))
      .returning();
    if (!result) return undefined;

    if (!estStockable) {
      await db
        .update(produitsMaster)
        .set({ estStockable: false })
        .where(eq(produitsMaster.categorie, result.nom));
    }

    return result;
  }

  async getSousSectionsDynamiques(categorie?: string): Promise<SousSectionDynamic[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT DISTINCT sous_section, categorie
        FROM referentiel.produits_master
        WHERE sous_section IS NOT NULL AND sous_section != '' AND actif = true AND template_parent_id IS NULL
      `;
      const params: string[] = [];
      if (categorie) {
        query += ` AND categorie = $1`;
        params.push(categorie);
      }
      query += ` ORDER BY categorie, sous_section`;
      const result = await client.query(query, params);
      return result.rows.map((row: any) => ({
        id: `${row.categorie}_${row.sous_section}`,
        nom: row.sous_section,
        categorie: row.categorie,
      }));
    } finally {
      client.release();
    }
  }

  async getUnites(): Promise<Unite[]> {
    return db.select().from(unites).orderBy(asc(unites.libelle));
  }

  async getProduits(filters?: { categorie?: string; stockable?: boolean; actif?: boolean; includeInactifs?: boolean; avecPrix?: boolean }): Promise<ProduitWithPrixDefaut[]> {
    const conditions = [];
    if (filters?.includeInactifs) {
    } else if (filters?.actif !== undefined) {
      conditions.push(eq(produitsMaster.actif, filters.actif));
    } else {
      conditions.push(eq(produitsMaster.actif, true));
    }
    conditions.push(isNull(produitsMaster.templateParentId));
    if (filters?.categorie) conditions.push(eq(produitsMaster.categorie, filters.categorie));
    if (filters?.stockable !== undefined) conditions.push(eq(produitsMaster.estStockable, filters.stockable));

    const rows = await db
      .select({
        id: produitsMaster.id,
        nom: produitsMaster.nom,
        nomNormalise: produitsMaster.nomNormalise,
        categorie: produitsMaster.categorie,
        sousSection: produitsMaster.sousSection,
        unite: produitsMaster.unite,
        estStockable: produitsMaster.estStockable,
        sourceApp: produitsMaster.sourceApp,
        actif: produitsMaster.actif,
        longueur: produitsMaster.longueur,
        largeur: produitsMaster.largeur,
        couleur: produitsMaster.couleur,
        estTemplate: produitsMaster.estTemplate,
        templateParentId: produitsMaster.templateParentId,
        dateCreation: produitsMaster.dateCreation,
        dateModification: produitsMaster.dateModification,
        creePar: produitsMaster.creePar,
        prixId: prixFournisseurs.id,
        prixHt: prixFournisseurs.prixHt,
        prixTtc: prixFournisseurs.prixTtc,
        prixBrs: prixFournisseurs.prixBrs,
        regimeFiscal: prixFournisseurs.regimeFiscal,
        prixDateModification: prixFournisseurs.dateModification,
        prixDateCreation: prixFournisseurs.dateCreation,
        prixCreePar: prixFournisseurs.creePar,
        fournisseurId: fournisseurs.id,
        fournisseurNom: fournisseurs.nom,
      })
      .from(produitsMaster)
      .leftJoin(
        prixFournisseurs,
        and(
          eq(prixFournisseurs.produitMasterId, produitsMaster.id),
          eq(prixFournisseurs.estFournisseurDefaut, true),
          eq(prixFournisseurs.actif, true)
        )
      )
      .leftJoin(fournisseurs, eq(prixFournisseurs.fournisseurId, fournisseurs.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(produitsMaster.categorie), asc(produitsMaster.nom));

    const result: ProduitWithPrixDefaut[] = rows.map(row => ({
      id: row.id,
      nom: row.nom,
      nomNormalise: row.nomNormalise,
      categorie: row.categorie,
      sousSection: row.sousSection,
      unite: row.unite,
      estStockable: row.estStockable,
      sourceApp: row.sourceApp,
      actif: row.actif,
      longueur: row.longueur,
      largeur: row.largeur,
      couleur: row.couleur,
      estTemplate: row.estTemplate,
      templateParentId: row.templateParentId,
      dateCreation: row.dateCreation,
      dateModification: row.dateModification,
      creePar: row.creePar,
      fournisseurDefaut: row.prixId ? {
        id: row.fournisseurId!,
        nom: row.fournisseurNom!,
        prixHt: row.prixHt!,
        prixTtc: row.prixTtc,
        prixBrs: row.prixBrs,
        regimeFiscal: row.regimeFiscal!,
      } : null,
      prixDateModification: row.prixDateModification || row.prixDateCreation || row.dateModification || row.dateCreation,
      prixModifiePar: row.prixCreePar || null,
    }));

    if (filters?.avecPrix === true) {
      return result.filter(p => p.fournisseurDefaut);
    }
    if (filters?.avecPrix === false) {
      return result.filter(p => !p.fournisseurDefaut);
    }

    return result;
  }

  async getProduit(id: number): Promise<ProduitDetail | undefined> {
    const [product] = await db.select().from(produitsMaster).where(eq(produitsMaster.id, id));
    if (!product) return undefined;

    const prix = await db
      .select()
      .from(prixFournisseurs)
      .innerJoin(fournisseurs, eq(prixFournisseurs.fournisseurId, fournisseurs.id))
      .where(and(eq(prixFournisseurs.produitMasterId, id), eq(prixFournisseurs.actif, true)))
      .orderBy(desc(prixFournisseurs.estFournisseurDefaut), asc(fournisseurs.nom));

    return {
      ...product,
      prixFournisseurs: prix.map(row => ({
        ...row.prix_fournisseurs,
        fournisseur: row.fournisseurs,
      })),
    };
  }

  async createProduit(data: InsertProduitMaster): Promise<ProduitMaster> {
    const nomTitleCase = normalizeProductName(data.nom);
    const nomNormalise = normaliserNom(nomTitleCase);
    const sousSection = data.sousSection?.trim();
    const [result] = await db.insert(produitsMaster).values({
      ...data,
      nom: nomTitleCase,
      nomNormalise,
      sousSection: (!sousSection || sousSection.toLowerCase() === "tous") ? null : sousSection,
    }).returning();
    return result;
  }

  async updateProduit(id: number, data: Partial<InsertProduitMaster>): Promise<ProduitMaster | undefined> {
    const updateData: Record<string, unknown> = { ...data, dateModification: new Date() };
    if (data.nom) {
      const nomTitleCase = normalizeProductName(data.nom);
      updateData.nom = nomTitleCase;
      updateData.nomNormalise = normaliserNom(nomTitleCase);
    }
    const [result] = await db.update(produitsMaster).set(updateData).where(eq(produitsMaster.id, id)).returning();
    return result;
  }

  async desactiverProduit(id: number): Promise<ProduitMaster | undefined> {
    const [result] = await db
      .update(produitsMaster)
      .set({
        actif: false,
        estStockable: false,
        dateModification: new Date(),
      })
      .where(eq(produitsMaster.id, id))
      .returning();
    return result;
  }

  async reactiverProduit(id: number): Promise<ProduitMaster | undefined> {
    const [result] = await db
      .update(produitsMaster)
      .set({
        actif: true,
        dateModification: new Date(),
      })
      .where(eq(produitsMaster.id, id))
      .returning();
    return result;
  }

  async searchProduitsSimilaires(nom: string, categorie?: string): Promise<{ id: number; nom: string; categorie: string; score: number }[]> {
    const nomNorm = normaliserNom(nom);
    if (!nomNorm) return [];

    const client = await pool.connect();
    try {
      let query = `
        SELECT id, nom, categorie, similarity(nom_normalise, $1) AS score
        FROM referentiel.produits_master
        WHERE actif = true
          AND template_parent_id IS NULL
          AND similarity(nom_normalise, $1) > 0.3
      `;
      const params: string[] = [nomNorm];

      if (categorie) {
        query += ` AND categorie = $2`;
        params.push(categorie);
      }

      query += ` ORDER BY score DESC LIMIT 5`;

      const result = await client.query(query, params);
      return result.rows.map(row => ({
        id: row.id,
        nom: row.nom,
        categorie: row.categorie,
        score: parseFloat(row.score),
      }));
    } finally {
      client.release();
    }
  }

  async getPrixProduit(produitId: number): Promise<(PrixFournisseur & { fournisseur: Fournisseur })[]> {
    const rows = await db
      .select()
      .from(prixFournisseurs)
      .innerJoin(fournisseurs, eq(prixFournisseurs.fournisseurId, fournisseurs.id))
      .where(and(eq(prixFournisseurs.produitMasterId, produitId), eq(prixFournisseurs.actif, true)))
      .orderBy(desc(prixFournisseurs.estFournisseurDefaut), asc(fournisseurs.nom));

    return rows.map(row => ({
      ...row.prix_fournisseurs,
      fournisseur: row.fournisseurs,
    }));
  }

  async ajouterPrixFournisseur(data: {
    produitMasterId: number;
    fournisseurId: number;
    prixHt: number;
    regimeFiscal: string;
    estFournisseurDefaut?: boolean;
    creePar?: string;
  }): Promise<PrixFournisseur> {
    const existingForFournisseur = await db
      .select()
      .from(prixFournisseurs)
      .where(and(
        eq(prixFournisseurs.produitMasterId, data.produitMasterId),
        eq(prixFournisseurs.fournisseurId, data.fournisseurId),
        eq(prixFournisseurs.actif, true)
      ));

    const oldPrix = existingForFournisseur[0];
    const wasDefault = oldPrix?.estFournisseurDefaut ?? false;

    if (oldPrix) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (data.creePar) {
          await client.query('SELECT set_config($1, $2, true)', ['app.modifier_name', data.creePar]);
        }
        await client.query(
          `UPDATE prix.prix_fournisseurs SET actif = false, date_modification = NOW() WHERE id = $1`,
          [oldPrix.id]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const existingActiveCount = await db
      .select({ c: count() })
      .from(prixFournisseurs)
      .where(and(
        eq(prixFournisseurs.produitMasterId, data.produitMasterId),
        eq(prixFournisseurs.actif, true)
      ));

    const isFirst = existingActiveCount[0].c === 0;
    const estDefaut = isFirst ? true : (wasDefault || data.estFournisseurDefaut || false);

    if (estDefaut && !isFirst) {
      await db
        .update(prixFournisseurs)
        .set({ estFournisseurDefaut: false, dateModification: new Date() })
        .where(and(
          eq(prixFournisseurs.produitMasterId, data.produitMasterId),
          eq(prixFournisseurs.actif, true)
        ));
    }

    const { prixTtc, prixBrs } = calculerPrix(data.prixHt, data.regimeFiscal);

    const [result] = await db.insert(prixFournisseurs).values({
      produitMasterId: data.produitMasterId,
      fournisseurId: data.fournisseurId,
      prixHt: data.prixHt,
      regimeFiscal: data.regimeFiscal,
      prixTtc,
      prixBrs,
      estFournisseurDefaut: estDefaut,
      actif: true,
      creePar: data.creePar || null,
    }).returning();

    return result;
  }

  async updatePrix(id: number, data: { prixHt?: number; regimeFiscal?: string }, userName?: string): Promise<PrixFournisseur | undefined> {
    const [existing] = await db.select().from(prixFournisseurs).where(eq(prixFournisseurs.id, id));
    if (!existing) return undefined;

    const newPrixHt = data.prixHt ?? existing.prixHt;
    const newRegime = data.regimeFiscal ?? existing.regimeFiscal;
    const { prixTtc, prixBrs } = calculerPrix(newPrixHt, newRegime);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (userName) {
        await client.query('SELECT set_config($1, $2, true)', ['app.modifier_name', userName]);
      }
      const result = await client.query(
        `UPDATE prix.prix_fournisseurs SET prix_ht = $1, regime_fiscal = $2, prix_ttc = $3, prix_brs = $4, date_modification = NOW() WHERE id = $5 RETURNING *`,
        [newPrixHt, newRegime, prixTtc, prixBrs, id]
      );
      await client.query('COMMIT');
      return result.rows[0] ? this.mapPrixRow(result.rows[0]) : undefined;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapPrixRow(row: any): PrixFournisseur {
    return {
      id: row.id,
      produitMasterId: row.produit_master_id,
      fournisseurId: row.fournisseur_id,
      prixHt: row.prix_ht,
      regimeFiscal: row.regime_fiscal,
      prixTtc: row.prix_ttc,
      prixBrs: row.prix_brs,
      estFournisseurDefaut: row.est_fournisseur_defaut,
      actif: row.actif,
      dateCreation: row.date_creation,
      dateModification: row.date_modification,
      creePar: row.cree_par,
    };
  }

  async definirFournisseurDefaut(produitId: number, prixFournisseurId: number): Promise<void> {
    await db
      .update(prixFournisseurs)
      .set({ estFournisseurDefaut: false, dateModification: new Date() })
      .where(eq(prixFournisseurs.produitMasterId, produitId));

    await db
      .update(prixFournisseurs)
      .set({ estFournisseurDefaut: true, dateModification: new Date() })
      .where(eq(prixFournisseurs.id, prixFournisseurId));
  }

  async retirerFournisseurDefaut(prixFournisseurId: number): Promise<void> {
    await db
      .update(prixFournisseurs)
      .set({ estFournisseurDefaut: false, dateModification: new Date() })
      .where(eq(prixFournisseurs.id, prixFournisseurId));
  }

  async getHistoriquePrix(prixFournisseurId: number): Promise<HistoriquePrix[]> {
    const [current] = await db.select().from(prixFournisseurs).where(eq(prixFournisseurs.id, prixFournisseurId));
    if (!current) return [];

    const allPrixIds = await db
      .select({ id: prixFournisseurs.id })
      .from(prixFournisseurs)
      .where(and(
        eq(prixFournisseurs.produitMasterId, current.produitMasterId),
        eq(prixFournisseurs.fournisseurId, current.fournisseurId)
      ));

    const ids = allPrixIds.map(r => r.id);
    if (ids.length === 0) return [];

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM prix.historique_prix WHERE prix_fournisseur_id = ANY($1) ORDER BY date_modification DESC`,
        [ids]
      );
      return result.rows.map((row: any) => ({
        id: row.id,
        prixFournisseurId: row.prix_fournisseur_id,
        prixHtAncien: row.prix_ht_ancien,
        prixHtNouveau: row.prix_ht_nouveau,
        regimeFiscalAncien: row.regime_fiscal_ancien,
        regimeFiscalNouveau: row.regime_fiscal_nouveau,
        modifiePar: row.modifie_par,
        dateModification: row.date_modification,
        raison: row.raison,
      }));
    } finally {
      client.release();
    }
  }

  async getApiKey(key: string): Promise<ApiKey | undefined> {
    const [result] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, key), eq(apiKeys.actif, true)));
    return result;
  }

  async createApiKey(nom: string, scopes: string[]): Promise<ApiKey> {
    const { randomBytes } = await import("crypto");
    const key = `fp-${randomBytes(24).toString("hex")}`;
    const [result] = await db.insert(apiKeys).values({ key, nom, scopes }).returning();
    return result;
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return db.select().from(apiKeys).orderBy(desc(apiKeys.dateCreation));
  }

  async getDashboardStats() {
    const [totalP] = await db.select({ c: count() }).from(produitsMaster).where(and(eq(produitsMaster.actif, true), isNull(produitsMaster.templateParentId)));
    const [totalF] = await db.select({ c: count() }).from(fournisseurs).where(eq(fournisseurs.actif, true));
    const [totalC] = await db.select({ c: count() }).from(categories);

    const [avecPrix] = await db
      .select({ c: sql<number>`COUNT(DISTINCT ${prixFournisseurs.produitMasterId})` })
      .from(prixFournisseurs)
      .innerJoin(produitsMaster, eq(prixFournisseurs.produitMasterId, produitsMaster.id))
      .where(and(eq(prixFournisseurs.actif, true), eq(produitsMaster.actif, true), isNull(produitsMaster.templateParentId)));

    return {
      totalProduits: totalP.c,
      totalFournisseurs: totalF.c,
      totalCategories: totalC.c,
      produitsAvecPrix: Number(avecPrix.c),
      produitsSansPrix: totalP.c - Number(avecPrix.c),
    };
  }
}

export const storage = new DatabaseStorage();
