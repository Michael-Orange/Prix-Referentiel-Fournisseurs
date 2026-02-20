import { pool } from "./db";

export async function setupDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS referentiel;`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS prix;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'utilisateur',
        actif BOOLEAN NOT NULL DEFAULT true,
        derniere_connexion TIMESTAMP,
        date_creation TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Schemas referentiel et prix créés, table users, pg_trgm activé");
  } finally {
    client.release();
  }
}

export async function createTrigger() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION prix.enregistrer_historique_prix()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.prix_ht != NEW.prix_ht OR OLD.regime_fiscal != NEW.regime_fiscal THEN
          INSERT INTO prix.historique_prix (
            prix_fournisseur_id,
            prix_ht_ancien,
            prix_ht_nouveau,
            regime_fiscal_ancien,
            regime_fiscal_nouveau,
            date_modification
          ) VALUES (
            NEW.id,
            OLD.prix_ht,
            NEW.prix_ht,
            OLD.regime_fiscal,
            NEW.regime_fiscal,
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
