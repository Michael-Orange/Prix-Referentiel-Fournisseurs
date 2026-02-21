# Référentiel Produits - Filtreplante

## Overview

Centralized multi-app PostgreSQL system for Filtreplante (Senegal). Manages products, suppliers, categories, and pricing in FCFA using two PostgreSQL schemas: `referentiel` (shared product data) and `prix` (supplier pricing). Supports three Senegalese fiscal regimes (TVA 18%, Sans TVA, BRS 5%), intelligent duplicate detection via pg_trgm trigrams, automatic price calculations, price history tracking via PostgreSQL trigger, JWT-based authentication with encrypted passwords, per-app permissions (Stock/Prix), and admin user management interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Filtreplante brand colors (turquoise primary #3AA6B9)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API with dual authentication
- **Authentication**: Password auth (web UI) + API key auth with scopes (external apps)
- **Fiscal Regimes**: TVA 18% (official suppliers), Sans TVA (informal), BRS 5% (simplified profit)

### Data Storage
- **Database**: PostgreSQL with two schemas (referentiel, prix) + pg_trgm extension
- **ORM**: Drizzle ORM with pgSchema for multi-schema support
- **Schema Location**: `shared/schema.ts` contains all table definitions and TypeScript types
- **Price History**: Automatic PostgreSQL trigger on prix.prix_fournisseurs UPDATE
- **Duplicate Detection**: pg_trgm similarity() function with >30% threshold

### Key Data Models (Multi-Schema)

#### Schema `referentiel` (shared product data)
1. **categories**: Product categories with ordering, estStockable
2. **unites**: Units of measure (code, libelle, type)
3. **produits_master**: Master product catalog (nom, nomNormalise, categorie, sous_section (TEXT, dynamic), unite, estStockable, sourceApp)

#### Schema `prix` (supplier pricing)
4. **fournisseurs**: Suppliers with fiscal regime (statutTva: tva_18, sans_tva, brs_5)
5. **prix_fournisseurs**: Supplier prices with auto-calculated HT/TTC/BRS, default supplier flag
6. **historique_prix**: Price change history (populated by PostgreSQL trigger)
7. **api_keys**: API authentication keys with scope-based access control

### Project Structure
```
/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # Reusable UI (DataTable, PageHeader, RegimeBadge, etc.)
│       ├── pages/       # Route pages (dashboard, fournisseurs, categories, produits, historique)
│       ├── hooks/       # Custom React hooks (use-toast, use-mobile)
│       └── lib/         # Utilities (queryClient, utils)
├── server/              # Express backend
│   ├── auth/
│   │   └── users.ts     # Parse AUTH_PASSWORDS secret, DB user lookup & password verify
│   ├── routes.ts        # API routes with scope-based middleware
│   ├── storage.ts       # Data access layer (IStorage interface)
│   ├── seed.ts          # Database seeding (338 products from CSV)
│   ├── setupDb.ts       # Schema creation, pg_trgm, trigger setup
│   └── db.ts            # Database connection (Drizzle + raw pool)
├── shared/              # Shared code
│   └── schema.ts        # Drizzle schema (pgSchema) + types + calculerPrix + normaliserNom
└── migrations/          # Drizzle migrations
```

### Authentication & Authorization
- JWT-based auth: tokens stored in HttpOnly cookies (7-day expiry)
- Login via username dropdown + password at `/api/auth/login`
- Users stored in `referentiel.users` table with AES-encrypted passwords (reversible for admin visibility)
- 4 users seeded at startup: Michael (admin, all access), Cheikh (user, stock only), Fatou (user, all access), Marine (user, all access)
- Roles: admin (full access, user management), user (access per permissions)
- Per-app permissions: `peut_acces_stock` (Stock app), `peut_acces_prix` (Prix app) enforced via `requireApp()` middleware
- Routes use `requireAuth` + `requireApp("prix"|"stock")` middleware chain
- Admin pages protected by `requireAdmin` middleware
- Admin user management page at `/utilisateurs` (create/edit/toggle users, password visibility)

### API Endpoints
- `POST /api/auth/login` - Login with username/password, returns JWT cookie
- `POST /api/auth/logout` - Clear JWT cookie
- `GET /api/auth/me` - Current user info
- `GET /api/auth/usernames` - List active usernames (public, for login dropdown)
- `GET/POST /api/fournisseurs` - CRUD suppliers (requireApp "prix")
- `GET/POST /api/referentiel/categories` - List/create categories
- `GET/POST /api/referentiel/sous-sections` - List/create sous-sections
- `GET /api/referentiel/produits` - List products (filters: categorie, stockable, actif, avec_prix)
- `GET /api/referentiel/produits/search?q=...` - Trigram duplicate search
- `POST /api/prix/produits/:id/fournisseurs` - Add supplier price (requireApp "prix")
- `PATCH /api/prix/fournisseurs/:id` - Update price (triggers history, requireApp "prix")
- `PATCH /api/prix/fournisseurs/:id/defaut` - Set default supplier (requireApp "prix")
- `GET /api/prix/fournisseurs/:id/historique` - Price change history (requireApp "prix")
- `GET/POST /api/admin/users` - Admin user management (requireAdmin)
- `PATCH /api/admin/users/:id` - Update user (requireAdmin)
- `GET /api/admin/users/:id/password` - Reveal decrypted password (requireAdmin)

### Price Calculation Logic (shared/schema.ts)
```
TVA 18%:  prixTtc = prixHt × 1.18, prixBrs = null
Sans TVA: prixTtc = prixHt, prixBrs = null
BRS 5%:   prixTtc = null, prixBrs = prixHt / 0.95
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database with schemas referentiel & prix
- **pg_trgm**: PostgreSQL extension for trigram similarity search

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing key (stored as env var)
- `PASSWORD_SECRET_KEY`: AES encryption key for passwords (stored as env var)

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: Database ORM with pgSchema support
- **@tanstack/react-query**: Server state management
- **express-session**: Session management
- **csv-parse**: CSV import for bulk product loading (338 products)
- **zod** + **drizzle-zod**: Runtime schema validation

## Recent Changes (2026-02-21)
- **JWT Authentication overhaul**: Replaced express-session/email auth with JWT tokens in HttpOnly cookies + username dropdown login
  - New `referentiel.users` table with username, password_encrypted (AES), per-app permissions
  - Middleware: requireAuth (JWT), requireAdmin, requireApp("prix"|"stock")
  - server/middleware/auth.ts: JWT token generation/verification
  - server/utils/password-crypto.ts: AES password encryption/decryption (reversible for admin)
  - server/routes/auth.ts: login, logout, me, usernames endpoints
  - server/routes/users.ts: admin CRUD for user management
  - 4 seeded users: michael (admin), cheikh (stock only), fatou (all), marine (all)
- **Admin Users page**: /utilisateurs route (admin only) with user table, create/edit dialogs, password reveal, activate/deactivate toggle
- **Per-app permissions enforcement**: Fournisseurs and prix endpoints require "prix" app access; reseed requires admin

### Previous Changes (2026-02-21)
- Sous-sections: dynamic product sub-categorization via produits_master.sous_section TEXT column
  - No separate table: sous-sections derived dynamically via DISTINCT query on produits_master
  - GET /api/referentiel/sous-sections?categorie=X returns distinct values from products
  - Categories page: shows existing sous-sections as badges (read from products), simplified creation dialog (category name only)
  - Products creation form: Input with datalist for sous-section (free text + existing suggestions), filtered by category
  - Products table: editable "Sous-section" column between Catégorie and Unité with Input + datalist
  - PATCH produit normalizes sousSection ("Tous"/empty → null)
  - POST /api/referentiel/categories endpoint for category creation
- Category-level stockage control: estStockable column on categories, PATCH toggle endpoint with cascade to products
- Categories page: clickable green/red stockage badges, product count display, confirmation dialogs for toggle
- Inline edit validation: price requires fournisseur + régime fiscal, red borders + toast feedback, disabled save button with tooltip
- Stockage field disabled in inline edit when product's category is non-stockable (shows "Non (catégorie)" badge)
- Cleaned up Neon DB: replaced numeric IDs in creePar with actual user names (1→Marine, 2→Fatou, 3→Michael)
- creePar now accepts body values (creePar/cree_par) from external API calls, with API key name as fallback
- Dernière MAJ logic: shows price modification date if prices exist, otherwise product modification date
- Added inactive products management: desactiver/reactiver endpoints, visual distinction in UI, filter checkbox
- Replaced supplier DELETE with desactiver/reactiver pattern: soft-delete preserving data integrity, checkbox filter, greyed-out styling

## Previous Changes (2026-02-20)
- Replaced single-password auth with email/password auth (3 users: Marine, Fatou, Michael)
- Users stored in AUTH_USERS secret, parsed at startup with robust format handling
- Session stores userEmail/userName/userRole, sidebar shows connected user info
- Complete schema rewrite: public schema → referentiel + prix PostgreSQL schemas
- Added 3 fiscal regimes: TVA 18%, Sans TVA, BRS 5% (replaces simple tvaApplicable boolean)
- Added pg_trgm duplicate detection with normaliserNom() function
- Imported 338 products from CSV with automatic category extraction
- Added price history trigger (PostgreSQL, not application-level)
- Added API key authentication with scopes for multi-app integration
- Rewrote all frontend pages for new data model
- Audit trail: creePar populated from session user on product/price creation
- Audit trail: PostgreSQL trigger records modifiePar via set_config('app.modifier_name') session variable
- Audit trail: UI shows "Créé par" column in product list, audit section in detail sheet, "Par X" in price history
- Removed "Modifier" button from price cards; prices are never edited, only replaced
- Price replacement: adding a price for an existing supplier auto-deactivates old price (actif=false), creates new one, preserves history
- Removed unique constraint uq_produit_fournisseur to allow multiple price entries per product+supplier
- History aggregation: getHistoriquePrix now fetches history across all price entries for same product+supplier
- Added "Dernière MAJ" column in products table showing prixDateModification (from default supplier price)
- Sortable columns: Produit, Catégorie, Prix HT, Prix final, Dernière MAJ, Créé par with 3-state cycle (asc/desc/neutral)
- Renamed "Référentiel Prix" to "Référentiel Produits" across login, sidebar, header, HTML title
- Clickable similar products in creation dialog: click closes dialog and opens product detail Sheet
- Title Case normalization: normalizeProductName() with acronym preservation (EPI, PVC, DN, PN, etc.)
- Normalization applied on product creation/update (server-side) with real-time preview in frontend form
- Migrated 340 existing products to Title Case via scripts/normalize-products.ts
