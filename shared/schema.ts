import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Fournisseurs
export const fournisseurs = pgTable("fournisseurs", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  tvaApplicable: boolean("tva_applicable").notNull().default(true),
  actif: boolean("actif").notNull().default(true),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
});

export const insertFournisseurSchema = createInsertSchema(fournisseurs).omit({
  id: true,
  dateCreation: true,
});

export type InsertFournisseur = z.infer<typeof insertFournisseurSchema>;
export type Fournisseur = typeof fournisseurs.$inferSelect;

// Catégories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull().unique(),
  description: text("description"),
  ordre: integer("ordre").notNull().default(0),
});

export const insertCategorieSchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertCategorie = z.infer<typeof insertCategorieSchema>;
export type Categorie = typeof categories.$inferSelect;

// Sous-sections
export const sousSections = pgTable("sous_sections", {
  id: serial("id").primaryKey(),
  categorieId: integer("categorie_id").notNull().references(() => categories.id),
  nom: text("nom").notNull(),
  description: text("description"),
  ordre: integer("ordre").notNull().default(0),
});

export const insertSousSectionSchema = createInsertSchema(sousSections).omit({
  id: true,
});

export type InsertSousSection = z.infer<typeof insertSousSectionSchema>;
export type SousSection = typeof sousSections.$inferSelect;

// Produits
export const produits = pgTable("produits", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  nom: text("nom").notNull(),
  description: text("description"),
  categorieId: integer("categorie_id").notNull().references(() => categories.id),
  sousSectionId: integer("sous_section_id").references(() => sousSections.id),
  uniteMesure: text("unite_mesure").notNull(),
  actif: boolean("actif").notNull().default(true),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
  dateModification: timestamp("date_modification").notNull().defaultNow(),
});

export const insertProduitSchema = createInsertSchema(produits).omit({
  id: true,
  reference: true,
  dateCreation: true,
  dateModification: true,
});

export type InsertProduit = z.infer<typeof insertProduitSchema>;
export type Produit = typeof produits.$inferSelect;

// Prix Fournisseurs
export const prixFournisseurs = pgTable("prix_fournisseurs", {
  id: serial("id").primaryKey(),
  produitId: integer("produit_id").notNull().references(() => produits.id),
  fournisseurId: integer("fournisseur_id").notNull().references(() => fournisseurs.id),
  prixHT: real("prix_ht").notNull(),
  tauxTVA: real("taux_tva").notNull(),
  prixTTC: real("prix_ttc").notNull(),
  dateDebutValidite: timestamp("date_debut_validite").notNull().defaultNow(),
  dateFinValidite: timestamp("date_fin_validite"),
  actif: boolean("actif").notNull().default(true),
  remarques: text("remarques"),
  tvaOverride: boolean("tva_override").notNull().default(false),
  dateCreation: timestamp("date_creation").notNull().defaultNow(),
}, (table) => [
  index("idx_prix_produit").on(table.produitId),
  index("idx_prix_fournisseur").on(table.fournisseurId),
]);

export const insertPrixFournisseurSchema = createInsertSchema(prixFournisseurs).omit({
  id: true,
  dateCreation: true,
});

export type InsertPrixFournisseur = z.infer<typeof insertPrixFournisseurSchema>;
export type PrixFournisseur = typeof prixFournisseurs.$inferSelect;

// Modifications Log
export const modificationsLog = pgTable("modifications_log", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  action: text("action").notNull(),
  champModifie: text("champ_modifie"),
  ancienneValeur: text("ancienne_valeur"),
  nouvelleValeur: text("nouvelle_valeur"),
  dateModification: timestamp("date_modification").notNull().defaultNow(),
});

export const insertModificationLogSchema = createInsertSchema(modificationsLog).omit({
  id: true,
  dateModification: true,
});

export type InsertModificationLog = z.infer<typeof insertModificationLogSchema>;
export type ModificationLog = typeof modificationsLog.$inferSelect;

// Types étendus pour les vues
export type ProduitWithDetails = Produit & {
  categorie: Categorie;
  sousSection: SousSection | null;
  prixMin?: number;
  prixMinTTC?: number;
};

export type PrixFournisseurWithDetails = PrixFournisseur & {
  fournisseur: Fournisseur;
  produit: Produit;
};

export type CategorieWithSousSections = Categorie & {
  sousSections: SousSection[];
  produitsCount: number;
};

export type FournisseurWithStats = Fournisseur & {
  produitsCount: number;
};

// Unités de mesure disponibles
export const unitesMesure = [
  "u",
  "m",
  "ml",
  "m²",
  "tonne",
  "m³",
  "kg",
  "L",
  "Nb de tuyaux 6m",
  "Chute de moins de 6m",
  "Rouleau de 100m",
  "Rouleau de 50m",
  "Moins d'un rouleau entier",
] as const;

export type UniteMesure = typeof unitesMesure[number];

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
