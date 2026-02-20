import { db } from "../db";
import { users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function parsePasswordsFromEnv(): Map<string, string> {
  const raw = process.env.AUTH_PASSWORDS || process.env.AUTH_USERS || '';

  if (!raw) {
    console.warn('AUTH_PASSWORDS non défini dans Secrets');
    return new Map();
  }

  const cleaned = raw.replace(/\\n/g, '\n');
  const passwordMap = new Map<string, string>();

  for (const entry of cleaned.split(/[,\n]+/)) {
    const trimmed = entry.replace(/^[:\s]+/, '').trim();
    if (!trimmed || !trimmed.includes('@')) continue;

    const parts = trimmed.split(':');
    if (parts.length < 2) continue;

    const email = parts[0].trim().toLowerCase();
    let password: string;
    if (parts.length === 2) {
      password = parts[1].trim();
    } else if (parts.length === 3) {
      const lastPart = parts[2].trim().toLowerCase();
      if (lastPart === 'admin' || lastPart === 'utilisateur') {
        password = parts[1].trim();
      } else {
        password = parts.slice(1).join(':').trim();
      }
    } else {
      password = parts.slice(1, parts.length - 1).join(':').trim();
    }

    if (email && password) {
      passwordMap.set(email, password);
    }
  }

  console.log(`${passwordMap.size} mot(s) de passe chargé(s) depuis Secrets`);
  return passwordMap;
}

export const PASSWORDS = parsePasswordsFromEnv();

export function verifyPassword(email: string, password: string): boolean {
  const stored = PASSWORDS.get(email.toLowerCase());
  return stored === password;
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email.toLowerCase()),
        eq(users.actif, true)
      )
    )
    .limit(1);
  return user || null;
}

export async function updateLastLogin(userId: number) {
  await db
    .update(users)
    .set({ derniereConnexion: new Date() })
    .where(eq(users.id, userId));
}
