# Configuration Base de Données

## Architecture

Prix-Referentiel et GestionStockFP partagent **LA MÊME** base PostgreSQL Neon.

### Hostname production
```
ep-flat-wave-ai8s9lqh-pooler.c-4.us-east-1.aws.neon.tech
```

### Secret Replit
```
DATABASE_URL=postgresql://...@ep-flat-wave-ai8s9lqh-pooler...
```

⚠️ **Important** : Ce secret doit être **identique** dans les 2 apps (Stock et Prix).

## Schémas

```
neondb
├─ schema: referentiel
│  ├─ produits_master (partagé entre Stock et Prix)
│  ├─ categories
│  └─ fournisseurs
├─ schema: stock
│  ├─ stock_produits
│  ├─ mouvements
│  └─ categories
└─ schema: prix
   └─ prix_fournisseurs
```

## Validation au démarrage

L'application vérifie automatiquement au démarrage qu'elle est connectée à la bonne base.

**Si mauvais hostname** → Crash immédiat avec message d'erreur explicite.

**Log attendu au démarrage** :
```
✅ Connexion validée : ep-flat-wave-ai8s9lqh-pooler.c-4.us-east-1.aws.neon.tech
```

## Bases décommissionnées

- ❌ `ep-dark-forest-afyuubzt` : Ancienne base de dev (NE PLUS UTILISER)
- ❌ Toute autre base : Vérifier avec l'équipe avant utilisation

## Troubleshooting

### Erreur "Base de données incorrecte"

Si au démarrage l'app affiche :
```
❌ ERREUR CRITIQUE : Connexion à une mauvaise base de données !
```

**Solution** :
1. Aller dans Replit Tools → Secrets
2. Vérifier DATABASE_URL pointe vers `ep-flat-wave-ai8s9lqh...`
3. Supprimer tout autre secret DB (NEON_DATABASE_URL, etc.)
4. Redémarrer l'app

### Deux apps voient des données différentes

**Cause** : Une des deux apps est connectée à une base différente.

**Solution** :
1. Vérifier les logs au démarrage des 2 apps
2. Les deux doivent afficher le même hostname
3. Si différent, corriger DATABASE_URL dans Secrets
