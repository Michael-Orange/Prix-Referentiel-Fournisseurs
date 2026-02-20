import { db, pool } from "./db";
import { categories, unites, produitsMaster, fournisseurs, users, normaliserNom } from "@shared/schema";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const UNITE_MAPPING: Record<string, { code: string; libelle: string; type: string }> = {
  "unité(s)": { code: "u", libelle: "unité(s)", type: "quantité" },
  "mètre(s)": { code: "m", libelle: "mètre(s)", type: "longueur" },
  "mètre linéaire(s)": { code: "ml", libelle: "mètre linéaire(s)", type: "longueur" },
  "L": { code: "L", libelle: "litre(s)", type: "volume" },
  "Nb de tuyaux 6m": { code: "tuyaux_6m", libelle: "Nb de tuyaux 6m", type: "quantité" },
  "Rouleau de 100m": { code: "rouleau_100m", libelle: "Rouleau de 100m", type: "longueur" },
  "Rouleau de 50m": { code: "rouleau_50m", libelle: "Rouleau de 50m", type: "longueur" },
  "Chute > 3m (et inf. à 10m)": { code: "chute_3_10m", libelle: "Chute > 3m (et inf. à 10m)", type: "longueur" },
  "Chute > 50cm": { code: "chute_50cm", libelle: "Chute > 50cm", type: "longueur" },
};

export async function seedDatabase() {
  await seedUsers();
  console.log("🚀 Checking if seed data exists...");
  const existing = await db.select().from(produitsMaster).limit(1);
  if (existing.length > 0) {
    console.log("✅ Seed data already exists, skipping...");
    return;
  }
  await runSeed();
}

async function seedUsers() {
  const initialUsers = [
    { nom: "Marine", email: "marine@filtreplante.com", role: "admin" },
    { nom: "Fatou", email: "fatou@filtreplante.com", role: "utilisateur" },
    { nom: "Michael", email: "michael@filtreplante.com", role: "admin" },
  ];
  for (const u of initialUsers) {
    await db.insert(users).values(u).onConflictDoNothing();
  }
  console.log("✅ Utilisateurs initiaux vérifiés");
}

export async function resetAndReseed() {
  console.log("🗑️ Suppression des données existantes...");
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM prix.historique_prix");
    await client.query("DELETE FROM prix.prix_fournisseurs");
    await client.query("DELETE FROM referentiel.produits_master");
    await client.query("DELETE FROM referentiel.categories");
    await client.query("DELETE FROM referentiel.unites");
  } finally {
    client.release();
  }
  console.log("✅ Tables vidées (fournisseurs conservés)");
  await runSeed();
}

async function runSeed() {
  console.log("🔄 Seeding database...");

  const existingF = await db.select().from(fournisseurs).limit(1);
  if (existingF.length === 0) {
    await seedFournisseurs();
  } else {
    console.log("✅ Fournisseurs existants conservés");
  }

  await seedUnites();
  await seedFromCSV();
  console.log("🎉 Seed terminé avec succès!");
}

async function seedFournisseurs() {
  const data = [
    { nom: "ABC Matériaux", statutTva: "tva_18" },
    { nom: "Dakar Pro BTP", statutTva: "tva_18" },
    { nom: "Amadou Matériaux", statutTva: "sans_tva" },
    { nom: "Marché Sandaga", statutTva: "sans_tva" },
  ];
  for (const f of data) {
    await db.insert(fournisseurs).values(f).onConflictDoNothing();
  }
  console.log("✅ 4 fournisseurs créés");
}

async function seedUnites() {
  const defaultUnites = [
    { code: "u", libelle: "unité(s)", type: "quantité" },
    { code: "m", libelle: "mètre(s)", type: "longueur" },
    { code: "ml", libelle: "mètre linéaire(s)", type: "longueur" },
    { code: "m2", libelle: "mètre carré(s)", type: "surface" },
    { code: "kg", libelle: "kilogramme(s)", type: "masse" },
    { code: "L", libelle: "litre(s)", type: "volume" },
    { code: "t", libelle: "tonne(s)", type: "masse" },
  ];
  for (const u of defaultUnites) {
    await db.insert(unites).values(u).onConflictDoNothing();
  }
  console.log("✅ Unités de base créées");
}

async function seedFromCSV() {
  const csvPath = path.join(process.cwd(), "attached_assets", "products_(1)_1771624236062.csv");
  if (!fs.existsSync(csvPath)) {
    console.log("⚠️ CSV non trouvé, seed minimal");
    await seedMinimalCategories();
    return;
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  const uniqueCategories = new Set<string>();
  const uniqueUnites = new Set<string>();

  for (const row of records) {
    uniqueCategories.add(row.categorie);
    uniqueUnites.add(row.unite);
  }

  const sortedCats = Array.from(uniqueCategories).sort();
  for (let i = 0; i < sortedCats.length; i++) {
    await db.insert(categories).values({
      nom: sortedCats[i],
      ordreAffichage: i + 1,
    }).onConflictDoNothing();
  }
  console.log(`✅ ${sortedCats.length} catégories créées`);

  for (const u of uniqueUnites) {
    const mapped = UNITE_MAPPING[u];
    if (mapped) {
      await db.insert(unites).values(mapped).onConflictDoNothing();
    } else {
      const code = u.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").substring(0, 30);
      await db.insert(unites).values({
        code,
        libelle: u,
        type: "autre",
      }).onConflictDoNothing();
    }
  }

  const seenNames = new Set<string>();
  let importCount = 0;

  for (const row of records) {
    const nom = row.nom?.trim();
    if (!nom) continue;
    const key = nom.toUpperCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    const sousSection = (!row.sous_section || row.sous_section === "Tous") ? null : row.sous_section;

    await db.insert(produitsMaster).values({
      nom,
      nomNormalise: normaliserNom(nom),
      categorie: row.categorie,
      sousSection,
      unite: row.unite || "unité(s)",
      estStockable: true,
      sourceApp: "stock",
      actif: row.actif !== "false",
      longueur: row.longueur ? parseFloat(row.longueur) : null,
      largeur: row.largeur ? parseFloat(row.largeur) : null,
      couleur: row.couleur || null,
      estTemplate: row.est_template === "true",
      creePar: "migration_csv",
    }).onConflictDoNothing();
    importCount++;
  }

  console.log(`✅ ${importCount} produits importés depuis CSV`);
}

async function seedMinimalCategories() {
  const cats = [
    "Clotûre", "EPI", "Electricité", "Equipements lourds",
    "Etanchéité", "Monolyto", "Outillage-Autres",
    "Plomberie et Irrigation", "Pompes",
  ];
  for (let i = 0; i < cats.length; i++) {
    await db.insert(categories).values({ nom: cats[i], ordreAffichage: i + 1 }).onConflictDoNothing();
  }
}
