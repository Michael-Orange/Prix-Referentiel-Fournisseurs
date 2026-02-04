import { db } from "./db";
import {
  fournisseurs,
  categories,
  sousSections,
  produits,
  prixFournisseurs,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  console.log("Checking if seed data exists...");

  // Check if data already exists
  const existingFournisseurs = await db.select().from(fournisseurs);
  if (existingFournisseurs.length > 0) {
    console.log("Seed data already exists, skipping...");
    return;
  }

  console.log("Seeding database with initial data...");

  // Seed Fournisseurs
  const [f1, f2, f3, f4] = await db
    .insert(fournisseurs)
    .values([
      { nom: "ABC Matériaux", tvaApplicable: true, actif: true },
      { nom: "Dakar Pro BTP", tvaApplicable: true, actif: true },
      { nom: "Amadou Matériaux", tvaApplicable: false, actif: true },
      { nom: "Marché Sandaga", tvaApplicable: false, actif: true },
    ])
    .returning();

  console.log("Fournisseurs created:", [f1, f2, f3, f4].map((f) => f.nom));

  // Seed Categories
  const [c1, c2, c3, c4] = await db
    .insert(categories)
    .values([
      { nom: "Outillage-Autres", ordre: 0 },
      { nom: "Plomberie et Irrigation", ordre: 1 },
      { nom: "Electricité", ordre: 2 },
      { nom: "EPI", ordre: 3 },
    ])
    .returning();

  console.log("Categories created:", [c1, c2, c3, c4].map((c) => c.nom));

  // Seed Sous-sections
  const subSectionsData = [
    // Outillage-Autres
    { categorieId: c1.id, nom: "Tous", ordre: 0 },
    { categorieId: c1.id, nom: "Outils manuels", ordre: 1 },
    { categorieId: c1.id, nom: "Mesure & traçage", ordre: 2 },
    { categorieId: c1.id, nom: "Sécurité & signalisation", ordre: 3 },
    { categorieId: c1.id, nom: "Équipement & mobilier", ordre: 4 },
    // Plomberie et Irrigation
    { categorieId: c2.id, nom: "Tous", ordre: 0 },
    { categorieId: c2.id, nom: "Tubes & tuyaux", ordre: 1 },
    { categorieId: c2.id, nom: "Coudes", ordre: 2 },
    { categorieId: c2.id, nom: "Raccords & adaptateurs", ordre: 3 },
    { categorieId: c2.id, nom: "Vannes & régulation", ordre: 4 },
    { categorieId: c2.id, nom: "Bouchons & finitions", ordre: 5 },
    { categorieId: c2.id, nom: "Irrigation & arrosage", ordre: 6 },
    // Electricité
    { categorieId: c3.id, nom: "Tous", ordre: 0 },
    // EPI
    { categorieId: c4.id, nom: "Tous", ordre: 0 },
  ];

  const insertedSubs = await db.insert(sousSections).values(subSectionsData).returning();
  console.log("Sous-sections created:", insertedSubs.length);

  // Get sub-section IDs for products
  const outilsManuels = insertedSubs.find((s) => s.nom === "Outils manuels" && s.categorieId === c1.id);
  const mesureTracage = insertedSubs.find((s) => s.nom === "Mesure & traçage" && s.categorieId === c1.id);
  const tubesTuyaux = insertedSubs.find((s) => s.nom === "Tubes & tuyaux" && s.categorieId === c2.id);
  const coudes = insertedSubs.find((s) => s.nom === "Coudes" && s.categorieId === c2.id);
  const bouchonsFinitions = insertedSubs.find((s) => s.nom === "Bouchons & finitions" && s.categorieId === c2.id);
  const vannesRegulation = insertedSubs.find((s) => s.nom === "Vannes & régulation" && s.categorieId === c2.id);
  const irrigationArrosage = insertedSubs.find((s) => s.nom === "Irrigation & arrosage" && s.categorieId === c2.id);
  const electriciteTous = insertedSubs.find((s) => s.nom === "Tous" && s.categorieId === c3.id);
  const epiTous = insertedSubs.find((s) => s.nom === "Tous" && s.categorieId === c4.id);

  // Seed Products
  const produitsData = [
    // Outillage-Autres > Outils manuels
    { reference: "FP-001", nom: "PELLE", categorieId: c1.id, sousSectionId: outilsManuels?.id, uniteMesure: "u", actif: true },
    { reference: "FP-002", nom: "PIOCHE", categorieId: c1.id, sousSectionId: outilsManuels?.id, uniteMesure: "u", actif: true },
    { reference: "FP-003", nom: "BROUETTE", categorieId: c1.id, sousSectionId: outilsManuels?.id, uniteMesure: "u", actif: true },
    { reference: "FP-004", nom: "MARTEAU", categorieId: c1.id, sousSectionId: outilsManuels?.id, uniteMesure: "u", actif: true },
    { reference: "FP-005", nom: "SEAUX", categorieId: c1.id, sousSectionId: outilsManuels?.id, uniteMesure: "u", actif: true },
    // Outillage-Autres > Mesure & traçage
    { reference: "FP-006", nom: "DECAMETRE 20m", categorieId: c1.id, sousSectionId: mesureTracage?.id, uniteMesure: "u", actif: true },
    { reference: "FP-007", nom: "NIVEAU A BULLE - PM", categorieId: c1.id, sousSectionId: mesureTracage?.id, uniteMesure: "u", actif: true },
    // Plomberie et Irrigation > Tubes & tuyaux
    { reference: "FP-008", nom: "PRESSION - DN 50", categorieId: c2.id, sousSectionId: tubesTuyaux?.id, uniteMesure: "Nb de tuyaux 6m", actif: true },
    { reference: "FP-009", nom: "JR - DN 32 - PN 6", categorieId: c2.id, sousSectionId: tubesTuyaux?.id, uniteMesure: "Rouleau de 100m", actif: true },
    { reference: "FP-010", nom: "EVAC - DN 110", categorieId: c2.id, sousSectionId: tubesTuyaux?.id, uniteMesure: "Nb de tuyaux 6m", actif: true },
    // Plomberie et Irrigation > Coudes
    { reference: "FP-011", nom: "COUDE PRESSION 90° - DN 63", categorieId: c2.id, sousSectionId: coudes?.id, uniteMesure: "u", actif: true },
    { reference: "FP-012", nom: "COUDE JR - DN 32", categorieId: c2.id, sousSectionId: coudes?.id, uniteMesure: "u", actif: true },
    // Plomberie et Irrigation > Bouchons & finitions
    { reference: "FP-013", nom: "COLLE PVC 1L", categorieId: c2.id, sousSectionId: bouchonsFinitions?.id, uniteMesure: "u", actif: true },
    { reference: "FP-014", nom: "BOUCHON PRESSION - DN 110", categorieId: c2.id, sousSectionId: bouchonsFinitions?.id, uniteMesure: "u", actif: true },
    // Plomberie et Irrigation > Vannes & régulation
    { reference: "FP-015", nom: "VANNE PRESSION - DN 50", categorieId: c2.id, sousSectionId: vannesRegulation?.id, uniteMesure: "u", actif: true },
    // Plomberie et Irrigation > Irrigation & arrosage
    { reference: "FP-016", nom: "GOUTTEURS - 8L / H", categorieId: c2.id, sousSectionId: irrigationArrosage?.id, uniteMesure: "u", actif: true },
    { reference: "FP-017", nom: "ASPERSEUR - 32L / H", categorieId: c2.id, sousSectionId: irrigationArrosage?.id, uniteMesure: "u", actif: true },
    // Electricité
    { reference: "FP-018", nom: "CABLE A05VVF 3 x 1.5mm", categorieId: c3.id, sousSectionId: electriciteTous?.id, uniteMesure: "m", actif: true },
    { reference: "FP-019", nom: "DISJONCTEUR MODULAIRE 16A", categorieId: c3.id, sousSectionId: electriciteTous?.id, uniteMesure: "u", actif: true },
    { reference: "FP-020", nom: "GAINE ANNELE - D 32", categorieId: c3.id, sousSectionId: electriciteTous?.id, uniteMesure: "m", actif: true },
    // EPI
    { reference: "FP-021", nom: "CASQUE BLANC", categorieId: c4.id, sousSectionId: epiTous?.id, uniteMesure: "u", actif: true },
    { reference: "FP-022", nom: "PAIRE GANTS", categorieId: c4.id, sousSectionId: epiTous?.id, uniteMesure: "u", actif: true },
    { reference: "FP-023", nom: "GILET JAUNE", categorieId: c4.id, sousSectionId: epiTous?.id, uniteMesure: "u", actif: true },
  ];

  const insertedProduits = await db.insert(produits).values(produitsData).returning();
  console.log("Produits created:", insertedProduits.length);

  // Create a map for quick product lookup
  const produitMap = new Map(insertedProduits.map((p) => [p.reference, p.id]));

  // Seed Prix
  const prixData = [
    // FP-001 PELLE
    { produitId: produitMap.get("FP-001")!, fournisseurId: f1.id, prixHT: 8000, tauxTVA: 18, prixTTC: 9440, actif: true, tvaOverride: false },
    { produitId: produitMap.get("FP-001")!, fournisseurId: f3.id, prixHT: 7000, tauxTVA: 0, prixTTC: 7000, actif: true, tvaOverride: false },
    // FP-002 PIOCHE
    { produitId: produitMap.get("FP-002")!, fournisseurId: f1.id, prixHT: 6500, tauxTVA: 18, prixTTC: 7670, actif: true, tvaOverride: false },
    { produitId: produitMap.get("FP-002")!, fournisseurId: f4.id, prixHT: 6000, tauxTVA: 0, prixTTC: 6000, actif: true, tvaOverride: false },
    // FP-003 BROUETTE
    { produitId: produitMap.get("FP-003")!, fournisseurId: f2.id, prixHT: 35000, tauxTVA: 18, prixTTC: 41300, actif: true, tvaOverride: false },
    // FP-004 MARTEAU
    { produitId: produitMap.get("FP-004")!, fournisseurId: f1.id, prixHT: 2500, tauxTVA: 18, prixTTC: 2950, actif: true, tvaOverride: false },
    // FP-005 SEAUX
    { produitId: produitMap.get("FP-005")!, fournisseurId: f3.id, prixHT: 1000, tauxTVA: 0, prixTTC: 1000, actif: true, tvaOverride: false },
    // FP-006 DECAMETRE
    { produitId: produitMap.get("FP-006")!, fournisseurId: f1.id, prixHT: 4000, tauxTVA: 18, prixTTC: 4720, actif: true, tvaOverride: false },
    // FP-007 NIVEAU A BULLE
    { produitId: produitMap.get("FP-007")!, fournisseurId: f2.id, prixHT: 3500, tauxTVA: 18, prixTTC: 4130, actif: true, tvaOverride: false },
    // FP-008 PRESSION DN 50
    { produitId: produitMap.get("FP-008")!, fournisseurId: f2.id, prixHT: 12000, tauxTVA: 18, prixTTC: 14160, actif: true, tvaOverride: false },
    // FP-009 JR DN 32
    { produitId: produitMap.get("FP-009")!, fournisseurId: f1.id, prixHT: 85000, tauxTVA: 18, prixTTC: 100300, actif: true, tvaOverride: false },
    // FP-010 EVAC DN 110
    { produitId: produitMap.get("FP-010")!, fournisseurId: f2.id, prixHT: 8500, tauxTVA: 18, prixTTC: 10030, actif: true, tvaOverride: false },
    // FP-011 COUDE PRESSION 90
    { produitId: produitMap.get("FP-011")!, fournisseurId: f1.id, prixHT: 800, tauxTVA: 18, prixTTC: 944, actif: true, tvaOverride: false },
    // FP-012 COUDE JR
    { produitId: produitMap.get("FP-012")!, fournisseurId: f1.id, prixHT: 350, tauxTVA: 18, prixTTC: 413, actif: true, tvaOverride: false },
    // FP-013 COLLE PVC
    { produitId: produitMap.get("FP-013")!, fournisseurId: f1.id, prixHT: 6000, tauxTVA: 18, prixTTC: 7080, actif: true, tvaOverride: false },
    { produitId: produitMap.get("FP-013")!, fournisseurId: f3.id, prixHT: 5500, tauxTVA: 0, prixTTC: 5500, actif: true, tvaOverride: false },
    // FP-014 BOUCHON PRESSION
    { produitId: produitMap.get("FP-014")!, fournisseurId: f1.id, prixHT: 450, tauxTVA: 18, prixTTC: 531, actif: true, tvaOverride: false },
    // FP-015 VANNE PRESSION
    { produitId: produitMap.get("FP-015")!, fournisseurId: f2.id, prixHT: 4500, tauxTVA: 18, prixTTC: 5310, actif: true, tvaOverride: false },
    // FP-016 GOUTTEURS
    { produitId: produitMap.get("FP-016")!, fournisseurId: f1.id, prixHT: 150, tauxTVA: 18, prixTTC: 177, actif: true, tvaOverride: false },
    // FP-017 ASPERSEUR
    { produitId: produitMap.get("FP-017")!, fournisseurId: f2.id, prixHT: 2500, tauxTVA: 18, prixTTC: 2950, actif: true, tvaOverride: false },
    // FP-018 CABLE
    { produitId: produitMap.get("FP-018")!, fournisseurId: f1.id, prixHT: 800, tauxTVA: 18, prixTTC: 944, actif: true, tvaOverride: false },
    // FP-019 DISJONCTEUR
    { produitId: produitMap.get("FP-019")!, fournisseurId: f2.id, prixHT: 3200, tauxTVA: 18, prixTTC: 3776, actif: true, tvaOverride: false },
    // FP-020 GAINE
    { produitId: produitMap.get("FP-020")!, fournisseurId: f1.id, prixHT: 500, tauxTVA: 18, prixTTC: 590, actif: true, tvaOverride: false },
    // FP-021 CASQUE
    { produitId: produitMap.get("FP-021")!, fournisseurId: f1.id, prixHT: 3000, tauxTVA: 18, prixTTC: 3540, actif: true, tvaOverride: false },
    // FP-022 GANTS
    { produitId: produitMap.get("FP-022")!, fournisseurId: f4.id, prixHT: 800, tauxTVA: 0, prixTTC: 800, actif: true, tvaOverride: false },
    // FP-023 GILET
    { produitId: produitMap.get("FP-023")!, fournisseurId: f1.id, prixHT: 2000, tauxTVA: 18, prixTTC: 2360, actif: true, tvaOverride: false },
  ];

  await db.insert(prixFournisseurs).values(prixData);
  console.log("Prix created:", prixData.length);

  console.log("Database seeding completed successfully!");
}
