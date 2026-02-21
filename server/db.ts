import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('❌ DATABASE_URL manquant dans Replit Secrets');
}

let hostname: string;
try {
  const dbUrl = new URL(connectionString);
  hostname = dbUrl.hostname;
} catch (error) {
  throw new Error('❌ Format DATABASE_URL invalide');
}

const EXPECTED_HOSTNAME = 'ep-flat-wave-ai8s9lqh-pooler.c-4.us-east-1.aws.neon.tech';

if (hostname !== EXPECTED_HOSTNAME) {
  console.error(`\n❌ ERREUR CRITIQUE : Connexion à une mauvaise base de données !`);
  console.error(`   Hostname attendu : ${EXPECTED_HOSTNAME}`);
  console.error(`   Hostname actuel  : ${hostname}`);
  console.error(`\n   Vérifier DATABASE_URL dans Replit Secrets.\n`);
  throw new Error('Base de données incorrecte - arrêt de l\'application');
}

console.log(`✅ Connexion validée : ${hostname}`);

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
