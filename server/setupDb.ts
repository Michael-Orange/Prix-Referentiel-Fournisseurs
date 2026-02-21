import { pool, db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { encryptPassword } from "./utils/password-crypto";

export async function setupDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO public, referentiel, prix;`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS referentiel;`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS prix;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS referentiel.users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        nom TEXT NOT NULL,
        email TEXT UNIQUE,
        password_encrypted TEXT NOT NULL,
        peut_acces_stock BOOLEAN NOT NULL DEFAULT false,
        peut_acces_prix BOOLEAN NOT NULL DEFAULT false,
        role TEXT NOT NULL DEFAULT 'user',
        actif BOOLEAN NOT NULL DEFAULT true,
        date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
        derniere_connexion TIMESTAMP,
        created_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ref_users_username ON referentiel.users(username);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ref_users_actif ON referentiel.users(actif);`);
    await client.query(`ALTER TABLE referentiel.categories ADD COLUMN IF NOT EXISTS est_stockable BOOLEAN NOT NULL DEFAULT true;`);
    console.log("✅ Schemas referentiel et prix créés, table referentiel.users, pg_trgm activé");
  } finally {
    client.release();
  }
}

const INITIAL_USERS = [
  {
    username: "michael",
    nom: "Michael",
    email: "michael@filtreplante.com",
    password: "Michael@FP2026",
    peutAccesStock: true,
    peutAccesPrix: true,
    role: "admin" as const,
  },
  {
    username: "cheikh",
    nom: "Cheikh",
    email: null,
    password: "Cheikh@FP2026",
    peutAccesStock: true,
    peutAccesPrix: false,
    role: "user" as const,
  },
  {
    username: "fatou",
    nom: "Fatou",
    email: "fatou@filtreplante.com",
    password: "Fatou@FP2026",
    peutAccesStock: true,
    peutAccesPrix: true,
    role: "user" as const,
  },
  {
    username: "marine",
    nom: "Marine",
    email: null,
    password: "Marine@FP2026",
    peutAccesStock: true,
    peutAccesPrix: true,
    role: "user" as const,
  },
];

export async function seedUsers() {
  for (const userData of INITIAL_USERS) {
    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, userData.username))
        .limit(1);

      if (existing) continue;

      await db.insert(users).values({
        username: userData.username,
        nom: userData.nom,
        email: userData.email,
        passwordEncrypted: encryptPassword(userData.password),
        peutAccesStock: userData.peutAccesStock,
        peutAccesPrix: userData.peutAccesPrix,
        role: userData.role,
      });
      console.log(`✅ User créé: ${userData.username}`);
    } catch (error: any) {
      if (error.message?.includes("unique")) {
        console.log(`⚠️ ${userData.username} existe déjà`);
      } else {
        console.error(`❌ ${userData.username}:`, error.message);
      }
    }
  }
}

export async function createTrigger() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION prix.enregistrer_historique_prix()
      RETURNS TRIGGER AS $$
      DECLARE
        current_user_name TEXT;
      BEGIN
        BEGIN
          current_user_name := current_setting('app.modifier_name', true);
        EXCEPTION
          WHEN OTHERS THEN
            current_user_name := 'Système';
        END;

        IF current_user_name IS NULL OR current_user_name = '' THEN
          current_user_name := 'Système';
        END IF;

        IF OLD.prix_ht IS DISTINCT FROM NEW.prix_ht OR OLD.regime_fiscal IS DISTINCT FROM NEW.regime_fiscal THEN
          INSERT INTO prix.historique_prix (
            prix_fournisseur_id,
            prix_ht_ancien,
            prix_ht_nouveau,
            regime_fiscal_ancien,
            regime_fiscal_nouveau,
            modifie_par,
            date_modification
          ) VALUES (
            NEW.id,
            OLD.prix_ht,
            NEW.prix_ht,
            OLD.regime_fiscal,
            NEW.regime_fiscal,
            current_user_name,
            NOW()
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_historique_prix ON prix.prix_fournisseurs;
    `);

    await client.query(`
      CREATE TRIGGER trigger_historique_prix
      AFTER UPDATE ON prix.prix_fournisseurs
      FOR EACH ROW
      EXECUTE FUNCTION prix.enregistrer_historique_prix();
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_produits_nom_normalise_trgm
      ON referentiel.produits_master USING gin (nom_normalise gin_trgm_ops);
    `);

    console.log("✅ Trigger historique_prix et index trigrams créés");
  } finally {
    client.release();
  }
}
