# Référentiel Prix Fournisseurs - Filtreplante

## Overview

Centralized multi-app PostgreSQL system for Filtreplante (Senegal). Manages products, suppliers, categories, and pricing in FCFA using two PostgreSQL schemas: `referentiel` (shared product data) and `prix` (supplier pricing). Supports three Senegalese fiscal regimes (TVA 18%, Sans TVA, BRS 5%), intelligent duplicate detection via pg_trgm trigrams, automatic price calculations, price history tracking via PostgreSQL trigger, and API key authentication with scopes for integration with other Filtreplante applications.

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
1. **categories**: Product categories with ordering
2. **unites**: Units of measure (code, libelle, type)
3. **produits_master**: Master product catalog (nom, nomNormalise, categorie, unite, estStockable, sourceApp)

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
- Web UI: Password auth via `/api/auth/login`, session stored server-side
- External API: `x-api-key` header with scope-based access
- Scopes: `referentiel:read`, `referentiel:write`, `prix:read`, `prix:write`, `stock:write`
- Routes use `authOrScope()` middleware (accepts either session OR valid API key)

### API Endpoints
- `GET/POST /api/fournisseurs` - CRUD suppliers
- `GET /api/referentiel/categories` - List categories
- `GET /api/referentiel/produits` - List products (filters: categorie, stockable, actif, avec_prix)
- `GET /api/referentiel/produits/search?q=...` - Trigram duplicate search
- `POST /api/prix/produits/:id/fournisseurs` - Add supplier price
- `PATCH /api/prix/fournisseurs/:id` - Update price (triggers history)
- `PATCH /api/prix/fournisseurs/:id/defaut` - Set default supplier
- `GET /api/prix/fournisseurs/:id/historique` - Price change history
- `POST /api/admin/api-keys` - Create API key with scopes

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
- `PASSWORD`: Application password (stored as secret)
- `SESSION_SECRET`: Session encryption key (stored as secret)
- `API_KEY`: Default API key for external access

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: Database ORM with pgSchema support
- **@tanstack/react-query**: Server state management
- **express-session**: Session management
- **csv-parse**: CSV import for bulk product loading (338 products)
- **zod** + **drizzle-zod**: Runtime schema validation

## Recent Changes (2026-02-20)
- Complete schema rewrite: public schema → referentiel + prix PostgreSQL schemas
- Added 3 fiscal regimes: TVA 18%, Sans TVA, BRS 5% (replaces simple tvaApplicable boolean)
- Added pg_trgm duplicate detection with normaliserNom() function
- Imported 338 products from CSV with automatic category extraction
- Added price history trigger (PostgreSQL, not application-level)
- Added API key authentication with scopes for multi-app integration
- Rewrote all frontend pages for new data model
