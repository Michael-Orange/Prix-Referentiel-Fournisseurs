# Référentiel Prix Fournisseurs - Filtreplante

## Overview

This is a supplier price reference management application for Filtreplante (Senegal). It allows centralized management of products, suppliers, categories, and pricing in FCFA (West African CFA franc). The application provides a complete CRUD interface for managing supplier relationships, product catalogs with hierarchical categories/subcategories, and price tracking with VAT handling (18% for official suppliers, 0% for informal suppliers).

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
- **API Pattern**: RESTful JSON API with session-based authentication
- **Authentication**: Simple password authentication with express-session
- **API Protection**: Both session auth (for web) and API key auth (for external access)

### Data Storage
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **ORM**: Drizzle ORM with Zod schema validation (drizzle-zod)
- **Schema Location**: `shared/schema.ts` contains all table definitions and TypeScript types
- **Migrations**: Managed via `drizzle-kit push` command

### Key Data Models
1. **Fournisseurs** (Suppliers): Name, TVA status (18% or 0%), active status
2. **Categories**: Product categories with ordering support
3. **SousSections**: Subcategories linked to parent categories
4. **Produits**: Products with category/subcategory assignment, unit of measure
5. **PrixFournisseurs**: Supplier prices with HT/TTC/TVA tracking, validity dates
6. **ModificationsLog**: Audit trail for all data changes

### Project Structure
```
/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route pages (dashboard, fournisseurs, categories, produits, historique)
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities (queryClient, utils)
├── server/              # Express backend
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Data access layer
│   ├── seed.ts          # Database seeding
│   └── db.ts            # Database connection
├── shared/              # Shared code
│   └── schema.ts        # Drizzle schema + Zod types
└── migrations/          # Database migrations
```

### Authentication Flow
- Web users authenticate with password via `/api/auth/login`
- Session stored server-side with express-session
- Protected routes check `req.session.authenticated`
- External API access via `x-api-key` header

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session store for express-session

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `PASSWORD`: Application password (default: "filtreplante2024")
- `API_KEY`: External API key (default: "fp-api-key-secret")
- `SESSION_SECRET`: Session encryption key

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: Database ORM and migration tools
- **@tanstack/react-query**: Server state management
- **express-session**: Session management
- **csv-parse**: CSV import functionality for bulk data loading
- **zod**: Runtime schema validation (shared between frontend/backend)

### UI Component Dependencies
- **@radix-ui/***: Accessible UI primitives (dialog, select, tabs, etc.)
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **date-fns**: Date formatting utilities