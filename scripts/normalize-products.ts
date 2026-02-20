import { db } from "../server/db";
import { eq } from "drizzle-orm";
import { produitsMaster, normaliserNom, normalizeProductName } from "../shared/schema";

async function migrateProducts() {
  const produits = await db.select({ id: produitsMaster.id, nom: produitsMaster.nom }).from(produitsMaster);
  console.log(`Found ${produits.length} products to normalize`);
  
  let updated = 0;
  let unchanged = 0;
  
  for (const p of produits) {
    const normalized = normalizeProductName(p.nom);
    if (normalized !== p.nom) {
      await db.update(produitsMaster).set({
        nom: normalized,
        nomNormalise: normaliserNom(normalized),
      }).where(eq(produitsMaster.id, p.id));
      console.log(`  "${p.nom}" -> "${normalized}"`);
      updated++;
    } else {
      unchanged++;
    }
  }
  
  console.log(`\nDone: ${updated} updated, ${unchanged} unchanged`);
  process.exit(0);
}

migrateProducts().catch(e => { console.error(e); process.exit(1); });
