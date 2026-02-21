import { sql } from "drizzle-orm";
import { pgSchema, pgTable, text, varchar, serial, integer, boolean, timestamp, real, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const referentielSchema = pgSchema("referentiel");
export const prixSchema = pgSchema("prix");

export const categories = referentielSchema.table("categories", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  ordreAffichage: integer("ordre_affichage").notNull().default(0),
  estStockable: boolean("est_stockable").notNull().default(true),
});

export const insertCategorieSchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategorie = z.infer<typeof insertCategorieSchema>;
export type Categorie = typeof categories.$inferSelect;

export type SousSectionDynamic = {
  id: string;
  nom: string;
  categorie: string;
};

export const unites = referentielSchema.table("unites", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  libelle: text("libelle").notNull(),
  type: text("type"),
});

export const insertUniteSchema = createInsertSchema(unites).omit({ id: true });
export type InsertUnite = z.infer<typeof insertUniteSchema>;
export type Unite = typeof unites.$inferSelect;

export const produitsMaster = referentielSchema.table("produits_master", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  nomNormalise: text("nom_normalise").notNull(),
  categorie: text("categorie").notNull(),
  sousSection: text("sous_section"),
  unite: text("unite").notNull(),
  estStockable: boolean("est_stockable").notNull().default(false),
  sourceApp: text("source_app").notNull().default("prix"),
  actif: boolean("actif").notNull().default(true),
  longueur: real("longueur"),
  largeur: real("largeur"),
  couleur: text("couleur"),
  estTemplate: boolean("est_template").notNull().default(false),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
  dateModification: timestamp("date_modification").notNull().defaultNow(),
  creePar: text("cree_par"),
}, (table) => [
  index("idx_produits_categorie").on(table.categorie),
  index("idx_produits_stockable").on(table.estStockable),
  index("idx_produits_actif").on(table.actif),
]);

export const insertProduitMasterSchema = createInsertSchema(produitsMaster).omit({
  id: true,
  dateCreation: true,
  dateModification: true,
});
export type InsertProduitMaster = z.infer<typeof insertProduitMasterSchema>;
export type ProduitMaster = typeof produitsMaster.$inferSelect;

export const fournisseurs = prixSchema.table("fournisseurs", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  contact: text("contact"),
  telephone: text("telephone"),
  email: text("email"),
  adresse: text("adresse"),
  statutTva: text("statut_tva").notNull().default("tva_18"),
  actif: boolean("actif").notNull().default(true),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
});

export const insertFournisseurSchema = createInsertSchema(fournisseurs).omit({
  id: true,
  dateCreation: true,
});
export type InsertFournisseur = z.infer<typeof insertFournisseurSchema>;
export type Fournisseur = typeof fournisseurs.$inferSelect;

export const prixFournisseurs = prixSchema.table("prix_fournisseurs", {
  id: serial("id").primaryKey(),
  produitMasterId: integer("produit_master_id").notNull().references(() => produitsMaster.id),
  fournisseurId: integer("fournisseur_id").notNull().references(() => fournisseurs.id),
  prixHt: real("prix_ht").notNull(),
  regimeFiscal: text("regime_fiscal").notNull().default("tva_18"),
  prixTtc: real("prix_ttc"),
  prixBrs: real("prix_brs"),
  estFournisseurDefaut: boolean("est_fournisseur_defaut").notNull().default(false),
  actif: boolean("actif").notNull().default(true),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
  dateModification: timestamp("date_modification").notNull().defaultNow(),
  creePar: text("cree_par"),
}, (table) => [
  index("idx_prix_produit_master").on(table.produitMasterId),
  index("idx_prix_fournisseur").on(table.fournisseurId),
  index("idx_prix_defaut").on(table.estFournisseurDefaut),
]);

export const insertPrixFournisseurSchema = createInsertSchema(prixFournisseurs).omit({
  id: true,
  dateCreation: true,
  dateModification: true,
});
export type InsertPrixFournisseur = z.infer<typeof insertPrixFournisseurSchema>;
export type PrixFournisseur = typeof prixFournisseurs.$inferSelect;

export const historiquePrix = prixSchema.table("historique_prix", {
  id: serial("id").primaryKey(),
  prixFournisseurId: integer("prix_fournisseur_id").notNull().references(() => prixFournisseurs.id),
  prixHtAncien: real("prix_ht_ancien"),
  prixHtNouveau: real("prix_ht_nouveau").notNull(),
  regimeFiscalAncien: text("regime_fiscal_ancien"),
  regimeFiscalNouveau: text("regime_fiscal_nouveau").notNull(),
  modifiePar: text("modifie_par"),
  dateModification: timestamp("date_modification").notNull().defaultNow(),
  raison: text("raison"),
});

export type HistoriquePrix = typeof historiquePrix.$inferSelect;

export const apiKeys = prixSchema.table("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  nom: text("nom"),
  scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`),
  actif: boolean("actif").notNull().default(true),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
  dateExpiration: timestamp("date_expiration"),
});

export type ApiKey = typeof apiKeys.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("utilisateur"),
  actif: boolean("actif").notNull().default(true),
  derniereConnexion: timestamp("derniere_connexion"),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, dateCreation: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type ProduitWithPrixDefaut = ProduitMaster & {
  fournisseurDefaut?: {
    id: number;
    nom: string;
    prixHt: number;
    prixTtc: number | null;
    prixBrs: number | null;
    regimeFiscal: string;
  } | null;
  prixDateModification?: Date | string | null;
};

export type ProduitDetail = ProduitMaster & {
  prixFournisseurs: (PrixFournisseur & {
    fournisseur: Fournisseur;
  })[];
};

export type FournisseurWithStats = Fournisseur & {
  produitsCount: number;
};

export const REGIMES_FISCAUX = ["tva_18", "sans_tva", "brs_5"] as const;
export type RegimeFiscal = typeof REGIMES_FISCAUX[number];

export function calculerPrix(prixHt: number, regimeFiscal: string) {
  switch (regimeFiscal) {
    case "tva_18":
      return { prixHt, prixTtc: Math.round(prixHt * 1.18), prixBrs: null };
    case "sans_tva":
      return { prixHt, prixTtc: prixHt, prixBrs: null };
    case "brs_5":
      return { prixHt, prixTtc: null, prixBrs: Math.round(prixHt / 0.95) };
    default:
      throw new Error(`Régime fiscal inconnu: ${regimeFiscal}`);
  }
}

export function normaliserNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .sort()
    .join(" ");
}

const ACRONYMES = [
  "EPI", "PVC", "DN", "PN", "PM", "GM", "HP", "BP", "HT", "BT",
  "LED", "IP", "UV", "PE", "PP", "HD", "BD", "AC", "DC",
  "CEM", "NF", "ISO", "HDPE", "PPN", "PPR", "PEHD",
  "GE", "TN", "TP", "BTP", "VRD", "PV",
];

export function normalizeProductName(name: string): string {
  if (!name) return "";

  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      const stripped = word.replace(/[^a-zA-Z0-9]/g, "");
      const upper = stripped.toUpperCase();
      if (ACRONYMES.includes(upper)) {
        return word.replace(stripped, upper);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
