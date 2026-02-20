interface User {
  email: string;
  password: string;
  role: 'admin' | 'utilisateur';
  nom: string;
}

function parseUsersFromEnv(): User[] {
  const authUsers = process.env.AUTH_USERS || '';

  if (!authUsers) {
    console.warn('AUTH_USERS non défini dans Secrets');
    return [];
  }

  const users: User[] = [];

  for (const userStr of authUsers.split(',')) {
    const parts = userStr.trim().split(':');
    if (parts.length < 3) {
      console.warn(`Format utilisateur invalide (attendu email:password:role): "${userStr.trim()}"`);
      continue;
    }
    const email = parts[0].trim();
    const role = parts[parts.length - 1].trim();
    const password = parts.slice(1, parts.length - 1).join(':').trim();
    const nom = email.split('@')[0];

    users.push({
      email,
      password,
      role: role as 'admin' | 'utilisateur',
      nom: nom.charAt(0).toUpperCase() + nom.slice(1),
    });
  }

  console.log(`${users.length} utilisateur(s) chargé(s) depuis AUTH_USERS`);
  return users;
}

export const USERS = parseUsersFromEnv();

export function findUserByEmail(email: string): User | undefined {
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function verifyPassword(user: User, password: string): boolean {
  return user.password === password;
}
