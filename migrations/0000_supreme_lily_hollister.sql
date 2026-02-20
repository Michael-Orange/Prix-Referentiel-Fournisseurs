CREATE SCHEMA IF NOT EXISTS "prix";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "referentiel";
--> statement-breakpoint
CREATE TABLE "prix"."api_keys" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL,
        "nom" text,
        "scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
        "actif" boolean DEFAULT true NOT NULL,
        "date_creation" timestamp DEFAULT now() NOT NULL,
        "date_expiration" timestamp,
        CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "referentiel"."categories" (
        "id" serial PRIMARY KEY NOT NULL,
        "nom" text NOT NULL,
        "ordre_affichage" integer DEFAULT 0 NOT NULL,
        CONSTRAINT "categories_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
CREATE TABLE "prix"."fournisseurs" (
        "id" serial PRIMARY KEY NOT NULL,
        "nom" text NOT NULL,
        "contact" text,
        "telephone" text,
        "email" text,
        "adresse" text,
        "statut_tva" text DEFAULT 'tva_18' NOT NULL,
        "actif" boolean DEFAULT true NOT NULL,
        "date_creation" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "fournisseurs_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
CREATE TABLE "prix"."historique_prix" (
        "id" serial PRIMARY KEY NOT NULL,
        "prix_fournisseur_id" integer NOT NULL,
        "prix_ht_ancien" real,
        "prix_ht_nouveau" real NOT NULL,
        "regime_fiscal_ancien" text,
        "regime_fiscal_nouveau" text NOT NULL,
        "modifie_par" text,
        "date_modification" timestamp DEFAULT now() NOT NULL,
        "raison" text
);
--> statement-breakpoint
CREATE TABLE "prix"."prix_fournisseurs" (
        "id" serial PRIMARY KEY NOT NULL,
        "produit_master_id" integer NOT NULL,
        "fournisseur_id" integer NOT NULL,
        "prix_ht" real NOT NULL,
        "regime_fiscal" text DEFAULT 'tva_18' NOT NULL,
        "prix_ttc" real,
        "prix_brs" real,
        "est_fournisseur_defaut" boolean DEFAULT false NOT NULL,
        "actif" boolean DEFAULT true NOT NULL,
        "date_creation" timestamp DEFAULT now() NOT NULL,
        "date_modification" timestamp DEFAULT now() NOT NULL,
        "cree_par" text,
        CONSTRAINT "uq_produit_fournisseur" UNIQUE("produit_master_id","fournisseur_id")
);
--> statement-breakpoint
CREATE TABLE "referentiel"."produits_master" (
        "id" serial PRIMARY KEY NOT NULL,
        "nom" text NOT NULL,
        "nom_normalise" text NOT NULL,
        "categorie" text NOT NULL,
        "sous_section" text,
        "unite" text NOT NULL,
        "est_stockable" boolean DEFAULT false NOT NULL,
        "source_app" text DEFAULT 'prix' NOT NULL,
        "actif" boolean DEFAULT true NOT NULL,
        "longueur" real,
        "largeur" real,
        "couleur" text,
        "est_template" boolean DEFAULT false NOT NULL,
        "date_creation" timestamp DEFAULT now() NOT NULL,
        "date_modification" timestamp DEFAULT now() NOT NULL,
        "cree_par" text,
        CONSTRAINT "produits_master_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
CREATE TABLE "referentiel"."unites" (
        "id" serial PRIMARY KEY NOT NULL,
        "code" text NOT NULL,
        "libelle" text NOT NULL,
        "type" text,
        CONSTRAINT "unites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "prix"."historique_prix" ADD CONSTRAINT "historique_prix_prix_fournisseur_id_prix_fournisseurs_id_fk" FOREIGN KEY ("prix_fournisseur_id") REFERENCES "prix"."prix_fournisseurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prix"."prix_fournisseurs" ADD CONSTRAINT "prix_fournisseurs_produit_master_id_produits_master_id_fk" FOREIGN KEY ("produit_master_id") REFERENCES "referentiel"."produits_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prix"."prix_fournisseurs" ADD CONSTRAINT "prix_fournisseurs_fournisseur_id_fournisseurs_id_fk" FOREIGN KEY ("fournisseur_id") REFERENCES "prix"."fournisseurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_prix_produit_master" ON "prix"."prix_fournisseurs" USING btree ("produit_master_id");--> statement-breakpoint
CREATE INDEX "idx_prix_fournisseur" ON "prix"."prix_fournisseurs" USING btree ("fournisseur_id");--> statement-breakpoint
CREATE INDEX "idx_prix_defaut" ON "prix"."prix_fournisseurs" USING btree ("est_fournisseur_defaut");--> statement-breakpoint
CREATE INDEX "idx_produits_categorie" ON "referentiel"."produits_master" USING btree ("categorie");--> statement-breakpoint
CREATE INDEX "idx_produits_stockable" ON "referentiel"."produits_master" USING btree ("est_stockable");--> statement-breakpoint
CREATE INDEX "idx_produits_actif" ON "referentiel"."produits_master" USING btree ("actif");