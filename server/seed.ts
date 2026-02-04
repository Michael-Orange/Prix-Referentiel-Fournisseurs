import { db } from "./db";
import {
  fournisseurs,
  categories,
  sousSections,
  produits,
  prixFournisseurs,
  modificationsLog,
} from "@shared/schema";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";

export async function seedDatabase() {
  console.log("🚀 Checking if seed data exists...");

  const existingFournisseurs = await db.select().from(fournisseurs);
  if (existingFournisseurs.length > 0) {
    console.log("✅ Seed data already exists, skipping...");
    return;
  }

  console.log("🔄 Seeding database with Filtreplante data...");

  // 1. Create Fournisseurs (4 total)
  const fournisseursData = [
    { nom: "ABC Matériaux", tvaApplicable: true, actif: true },
    { nom: "Dakar Pro BTP", tvaApplicable: true, actif: true },
    { nom: "Amadou Matériaux", tvaApplicable: false, actif: true },
    { nom: "Marché Sandaga", tvaApplicable: false, actif: true },
  ];

  const insertedFournisseurs = await db.insert(fournisseurs).values(fournisseursData).returning();
  console.log("✅ 4 fournisseurs créés:", insertedFournisseurs.map((f) => f.nom).join(", "));

  // 2. Create Categories (9 total)
  const categoriesData = [
    { nom: "Clôture", description: "Matériel de clôture", ordre: 0 },
    { nom: "EPI", description: "Équipements de protection individuelle", ordre: 1 },
    { nom: "Electricité", description: "Équipement électrique", ordre: 2 },
    { nom: "Equipements lourds", description: "Équipements et machines lourdes", ordre: 3 },
    { nom: "Etanchéité", description: "Matériaux d'étanchéité et géomembranes", ordre: 4 },
    { nom: "Monolyto", description: "Produits Monolyto", ordre: 5 },
    { nom: "Outillage-Autres", description: "Outils et équipements divers", ordre: 6 },
    { nom: "Plomberie et Irrigation", description: "Matériel de plomberie et systèmes d'irrigation", ordre: 7 },
    { nom: "Pompes", description: "Pompes et équipements de pompage", ordre: 8 },
  ];

  const insertedCategories = await db.insert(categories).values(categoriesData).returning();
  console.log("✅ 9 catégories créées:", insertedCategories.map((c) => c.nom).join(", "));

  // Create category lookup map
  const categoriesMap = new Map(insertedCategories.map((c) => [c.nom, c.id]));

  // 3. Create Sous-sections (18 total)
  const sousSectionsData = [
    // Clôture
    { categorieId: categoriesMap.get("Clôture")!, nom: "Tous", ordre: 0 },
    // EPI
    { categorieId: categoriesMap.get("EPI")!, nom: "Tous", ordre: 0 },
    // Electricité
    { categorieId: categoriesMap.get("Electricité")!, nom: "Tous", ordre: 0 },
    // Equipements lourds
    { categorieId: categoriesMap.get("Equipements lourds")!, nom: "Tous", ordre: 0 },
    // Etanchéité
    { categorieId: categoriesMap.get("Etanchéité")!, nom: "Géomembranes", ordre: 0 },
    { categorieId: categoriesMap.get("Etanchéité")!, nom: "Geotextile", ordre: 1 },
    // Monolyto
    { categorieId: categoriesMap.get("Monolyto")!, nom: "Tous", ordre: 0 },
    // Outillage-Autres
    { categorieId: categoriesMap.get("Outillage-Autres")!, nom: "Outils manuels", ordre: 0 },
    { categorieId: categoriesMap.get("Outillage-Autres")!, nom: "Mesure & traçage", ordre: 1 },
    { categorieId: categoriesMap.get("Outillage-Autres")!, nom: "Sécurité & signalisation", ordre: 2 },
    { categorieId: categoriesMap.get("Outillage-Autres")!, nom: "Équipement & mobilier", ordre: 3 },
    // Plomberie et Irrigation
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Tubes & tuyaux", ordre: 0 },
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Coudes", ordre: 1 },
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Raccords & adaptateurs", ordre: 2 },
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Vannes & régulation", ordre: 3 },
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Bouchons & finitions", ordre: 4 },
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Autres", ordre: 5 },
    { categorieId: categoriesMap.get("Plomberie et Irrigation")!, nom: "Irrigation & arrosage", ordre: 6 },
    // Pompes
    { categorieId: categoriesMap.get("Pompes")!, nom: "Tous", ordre: 0 },
  ];

  const insertedSousSections = await db.insert(sousSections).values(sousSectionsData).returning();
  console.log("✅ 19 sous-sections créées");

  // Create sous-section lookup map (categorie|nom -> id)
  const ssMap = new Map<string, number>();
  for (const ss of insertedSousSections) {
    const cat = insertedCategories.find((c) => c.id === ss.categorieId);
    if (cat) {
      ssMap.set(`${cat.nom}|${ss.nom}`, ss.id);
    }
  }

  // 4. Import products from CSV
  const csvPath = join(process.cwd(), "products.csv");
  let csvContent: string;
  
  try {
    csvContent = readFileSync(csvPath, "utf-8");
  } catch (error) {
    console.log("⚠️ products.csv not found, skipping product import");
    console.log("🎉 Seed terminé (sans produits)!");
    return;
  }

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<{ categorie: string; sous_section: string; nom: string; unite: string }>;

  // Sort records alphabetically: category > sous_section > nom
  records.sort((a, b) => {
    const catCompare = a.categorie.localeCompare(b.categorie, "fr");
    if (catCompare !== 0) return catCompare;
    const ssCompare = a.sous_section.localeCompare(b.sous_section, "fr");
    if (ssCompare !== 0) return ssCompare;
    return a.nom.localeCompare(b.nom, "fr");
  });

  const produitsData: Array<{
    reference: string;
    nom: string;
    categorieId: number;
    sousSectionId: number | null;
    uniteMesure: string;
    actif: boolean;
  }> = [];

  let compteur = 1;

  for (const record of records) {
    const categorieId = categoriesMap.get(record.categorie);
    const sousSectionId = ssMap.get(`${record.categorie}|${record.sous_section}`);

    if (!categorieId) {
      console.log(`⚠️ Catégorie non trouvée: ${record.categorie}`);
      continue;
    }

    const reference = `FP-${compteur.toString().padStart(3, "0")}`;

    produitsData.push({
      reference,
      nom: record.nom,
      categorieId,
      sousSectionId: sousSectionId || null,
      uniteMesure: record.unite,
      actif: true,
    });

    compteur++;
  }

  // Insert products in batches
  const batchSize = 50;
  for (let i = 0; i < produitsData.length; i += batchSize) {
    const batch = produitsData.slice(i, i + batchSize);
    await db.insert(produits).values(batch);
  }

  console.log(`✅ ${produitsData.length} produits créés avec références FP-001 à FP-${(produitsData.length).toString().padStart(3, "0")}`);

  // 5. NO prices created (empty table)
  console.log("✅ Table prix_fournisseurs vide (à saisir manuellement)");

  console.log("🎉 Seed terminé avec succès!");
  console.log(`   - 4 fournisseurs`);
  console.log(`   - 9 catégories`);
  console.log(`   - ${insertedSousSections.length} sous-sections`);
  console.log(`   - ${produitsData.length} produits`);
  console.log(`   - 0 prix`);
}

export async function resetAndReseed() {
  console.log("🗑️ Suppression des données existantes...");
  
  await db.delete(modificationsLog);
  await db.delete(prixFournisseurs);
  await db.delete(produits);
  await db.delete(sousSections);
  await db.delete(categories);
  await db.delete(fournisseurs);
  
  console.log("✅ Tables vidées");
  
  await seedDatabase();
}
