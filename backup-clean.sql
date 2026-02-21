--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: prix; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA prix;


--
-- Name: referentiel; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA referentiel;


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: enregistrer_historique_prix(); Type: FUNCTION; Schema: prix; Owner: -
--

CREATE FUNCTION prix.enregistrer_historique_prix() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
        current_user_name TEXT;
      BEGIN
        BEGIN
          current_user_name := current_setting('app.modifier_name', true);
        EXCEPTION
          WHEN OTHERS THEN
            current_user_name := 'Système';
        END;

        IF current_user_name IS NULL OR current_user_name = '' THEN
          current_user_name := 'Système';
        END IF;

        IF OLD.prix_ht IS DISTINCT FROM NEW.prix_ht OR OLD.regime_fiscal IS DISTINCT FROM NEW.regime_fiscal THEN
          INSERT INTO prix.historique_prix (
            prix_fournisseur_id,
            prix_ht_ancien,
            prix_ht_nouveau,
            regime_fiscal_ancien,
            regime_fiscal_nouveau,
            modifie_par,
            date_modification
          ) VALUES (
            NEW.id,
            OLD.prix_ht,
            NEW.prix_ht,
            OLD.regime_fiscal,
            NEW.regime_fiscal,
            current_user_name,
            NOW()
          );
        END IF;
        RETURN NEW;
      END;
      $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: api_keys; Type: TABLE; Schema: prix; Owner: -
--

CREATE TABLE prix.api_keys (
    id integer NOT NULL,
    key text NOT NULL,
    nom text,
    scopes text[] DEFAULT ARRAY[]::text[] NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    date_creation timestamp without time zone DEFAULT now() NOT NULL,
    date_expiration timestamp without time zone
);


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: prix; Owner: -
--

CREATE SEQUENCE prix.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: prix; Owner: -
--

ALTER SEQUENCE prix.api_keys_id_seq OWNED BY prix.api_keys.id;


--
-- Name: fournisseurs; Type: TABLE; Schema: prix; Owner: -
--

CREATE TABLE prix.fournisseurs (
    id integer NOT NULL,
    nom text NOT NULL,
    contact text,
    telephone text,
    email text,
    adresse text,
    statut_tva text DEFAULT 'tva_18'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    date_creation timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fournisseurs_id_seq; Type: SEQUENCE; Schema: prix; Owner: -
--

CREATE SEQUENCE prix.fournisseurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fournisseurs_id_seq; Type: SEQUENCE OWNED BY; Schema: prix; Owner: -
--

ALTER SEQUENCE prix.fournisseurs_id_seq OWNED BY prix.fournisseurs.id;


--
-- Name: historique_prix; Type: TABLE; Schema: prix; Owner: -
--

CREATE TABLE prix.historique_prix (
    id integer NOT NULL,
    prix_fournisseur_id integer NOT NULL,
    prix_ht_ancien real,
    prix_ht_nouveau real NOT NULL,
    regime_fiscal_ancien text,
    regime_fiscal_nouveau text NOT NULL,
    modifie_par text,
    date_modification timestamp without time zone DEFAULT now() NOT NULL,
    raison text
);


--
-- Name: historique_prix_id_seq; Type: SEQUENCE; Schema: prix; Owner: -
--

CREATE SEQUENCE prix.historique_prix_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historique_prix_id_seq; Type: SEQUENCE OWNED BY; Schema: prix; Owner: -
--

ALTER SEQUENCE prix.historique_prix_id_seq OWNED BY prix.historique_prix.id;


--
-- Name: prix_fournisseurs; Type: TABLE; Schema: prix; Owner: -
--

CREATE TABLE prix.prix_fournisseurs (
    id integer NOT NULL,
    produit_master_id integer NOT NULL,
    fournisseur_id integer NOT NULL,
    prix_ht real NOT NULL,
    regime_fiscal text DEFAULT 'tva_18'::text NOT NULL,
    prix_ttc real,
    prix_brs real,
    est_fournisseur_defaut boolean DEFAULT false NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    date_creation timestamp without time zone DEFAULT now() NOT NULL,
    date_modification timestamp without time zone DEFAULT now() NOT NULL,
    cree_par text
);


--
-- Name: prix_fournisseurs_id_seq; Type: SEQUENCE; Schema: prix; Owner: -
--

CREATE SEQUENCE prix.prix_fournisseurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prix_fournisseurs_id_seq; Type: SEQUENCE OWNED BY; Schema: prix; Owner: -
--

ALTER SEQUENCE prix.prix_fournisseurs_id_seq OWNED BY prix.prix_fournisseurs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    nom text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'utilisateur'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    derniere_connexion timestamp without time zone,
    date_creation timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: categories; Type: TABLE; Schema: referentiel; Owner: -
--

CREATE TABLE referentiel.categories (
    id integer NOT NULL,
    nom text NOT NULL,
    ordre_affichage integer DEFAULT 0 NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: referentiel; Owner: -
--

CREATE SEQUENCE referentiel.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: referentiel; Owner: -
--

ALTER SEQUENCE referentiel.categories_id_seq OWNED BY referentiel.categories.id;


--
-- Name: produits_master; Type: TABLE; Schema: referentiel; Owner: -
--

CREATE TABLE referentiel.produits_master (
    id integer NOT NULL,
    nom text NOT NULL,
    nom_normalise text NOT NULL,
    categorie text NOT NULL,
    sous_section text,
    unite text NOT NULL,
    est_stockable boolean DEFAULT false NOT NULL,
    source_app text DEFAULT 'prix'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    longueur real,
    largeur real,
    couleur text,
    est_template boolean DEFAULT false NOT NULL,
    date_creation timestamp without time zone DEFAULT now() NOT NULL,
    date_modification timestamp without time zone DEFAULT now() NOT NULL,
    cree_par text
);


--
-- Name: produits_master_id_seq; Type: SEQUENCE; Schema: referentiel; Owner: -
--

CREATE SEQUENCE referentiel.produits_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: produits_master_id_seq; Type: SEQUENCE OWNED BY; Schema: referentiel; Owner: -
--

ALTER SEQUENCE referentiel.produits_master_id_seq OWNED BY referentiel.produits_master.id;


--
-- Name: unites; Type: TABLE; Schema: referentiel; Owner: -
--

CREATE TABLE referentiel.unites (
    id integer NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    type text
);


--
-- Name: unites_id_seq; Type: SEQUENCE; Schema: referentiel; Owner: -
--

CREATE SEQUENCE referentiel.unites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unites_id_seq; Type: SEQUENCE OWNED BY; Schema: referentiel; Owner: -
--

ALTER SEQUENCE referentiel.unites_id_seq OWNED BY referentiel.unites.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.api_keys ALTER COLUMN id SET DEFAULT nextval('prix.api_keys_id_seq'::regclass);


--
-- Name: fournisseurs id; Type: DEFAULT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.fournisseurs ALTER COLUMN id SET DEFAULT nextval('prix.fournisseurs_id_seq'::regclass);


--
-- Name: historique_prix id; Type: DEFAULT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.historique_prix ALTER COLUMN id SET DEFAULT nextval('prix.historique_prix_id_seq'::regclass);


--
-- Name: prix_fournisseurs id; Type: DEFAULT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.prix_fournisseurs ALTER COLUMN id SET DEFAULT nextval('prix.prix_fournisseurs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.categories ALTER COLUMN id SET DEFAULT nextval('referentiel.categories_id_seq'::regclass);


--
-- Name: produits_master id; Type: DEFAULT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.produits_master ALTER COLUMN id SET DEFAULT nextval('referentiel.produits_master_id_seq'::regclass);


--
-- Name: unites id; Type: DEFAULT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.unites ALTER COLUMN id SET DEFAULT nextval('referentiel.unites_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: prix; Owner: -
--

COPY prix.api_keys (id, key, nom, scopes, actif, date_creation, date_expiration) FROM stdin;
\.


--
-- Data for Name: fournisseurs; Type: TABLE DATA; Schema: prix; Owner: -
--

COPY prix.fournisseurs (id, nom, contact, telephone, email, adresse, statut_tva, actif, date_creation) FROM stdin;
1	ABC Matériaux	\N	\N	\N	\N	tva_18	t	2026-02-20 22:02:13.78483
2	Dakar Pro BTP	\N	\N	\N	\N	tva_18	t	2026-02-20 22:02:13.788986
3	Amadou Matériaux	\N	\N	\N	\N	sans_tva	t	2026-02-20 22:02:13.792729
4	Marché Sandaga	\N	\N	\N	\N	sans_tva	t	2026-02-20 22:02:13.796085
\.


--
-- Data for Name: historique_prix; Type: TABLE DATA; Schema: prix; Owner: -
--

COPY prix.historique_prix (id, prix_fournisseur_id, prix_ht_ancien, prix_ht_nouveau, regime_fiscal_ancien, regime_fiscal_nouveau, modifie_par, date_modification, raison) FROM stdin;
1	1	10000	150000	tva_18	tva_18	\N	2026-02-20 22:32:41.77	\N
2	1	150000	2e+06	tva_18	tva_18	\N	2026-02-20 22:33:04.388099	\N
3	1	2e+06	15000	tva_18	tva_18	\N	2026-02-20 22:34:58.153518	\N
4	7	5000	6000	tva_18	tva_18	Michael	2026-02-20 23:15:42.789714	\N
5	1	15000	20000	tva_18	tva_18	Michael	2026-02-20 23:17:02.63363	\N
6	8	10000	12000	tva_18	tva_18	Michael	2026-02-20 23:19:34.214884	\N
7	7	6000	7500	tva_18	tva_18	Michael	2026-02-20 23:20:52.788163	\N
8	1	20000	5000	tva_18	tva_18	Michael	2026-02-20 23:22:11.880862	\N
\.


--
-- Data for Name: prix_fournisseurs; Type: TABLE DATA; Schema: prix; Owner: -
--

COPY prix.prix_fournisseurs (id, produit_master_id, fournisseur_id, prix_ht, regime_fiscal, prix_ttc, prix_brs, est_fournisseur_defaut, actif, date_creation, date_modification, cree_par) FROM stdin;
8	340	1	12000	tva_18	14160	\N	t	t	2026-02-20 23:19:19.546655	2026-02-20 23:19:34.214884	Michael
7	339	1	7500	tva_18	8850	\N	t	f	2026-02-20 23:15:05.764111	2026-02-20 23:27:48.558341	Michael
10	339	1	8000	tva_18	9440	\N	t	t	2026-02-20 23:27:48.576338	2026-02-20 23:27:48.576338	Michael
1	312	1	5000	tva_18	5900	\N	f	f	2026-02-20 22:15:32.036584	2026-02-20 23:40:33.477	\N
12	312	3	50000	tva_18	59000	\N	f	t	2026-02-20 23:40:07.802874	2026-02-20 23:40:33.477	Michael
11	312	1	25000	tva_18	29500	\N	t	t	2026-02-20 23:39:01.838395	2026-02-20 23:40:33.481	Michael
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, nom, email, role, actif, derniere_connexion, date_creation) FROM stdin;
1	Marine	marine@filtreplante.com	admin	t	2026-02-20 23:08:51.297	2026-02-20 23:00:23.105339
2	Fatou	fatou@filtreplante.com	utilisateur	t	2026-02-20 23:08:51.343	2026-02-20 23:00:23.111803
3	Michael	michael@filtreplante.com	admin	t	2026-02-20 23:51:14.421	2026-02-20 23:00:23.117432
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: referentiel; Owner: -
--

COPY referentiel.categories (id, nom, ordre_affichage) FROM stdin;
1	Clotûre	1
2	EPI	2
3	Electricité	3
4	Equipements lourds	4
5	Etanchéité	5
6	Monolyto	6
7	Outillage-Autres	7
8	Plomberie et Irrigation	8
9	Pompes	9
\.


--
-- Data for Name: produits_master; Type: TABLE DATA; Schema: referentiel; Owner: -
--

COPY referentiel.produits_master (id, nom, nom_normalise, categorie, sous_section, unite, est_stockable, source_app, actif, longueur, largeur, couleur, est_template, date_creation, date_modification, cree_par) FROM stdin;
13	Lame De Scie (PVC)	de lame pvc scie	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.976122	2026-02-20 22:02:13.976122	migration_csv
25	Porte Lame (PVC)	lame porte pvc	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.014528	2026-02-20 22:02:14.014528	migration_csv
2	Brouette	brouette	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.942456	2026-02-20 22:02:13.942456	migration_csv
3	Burin	burin	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.945192	2026-02-20 22:02:13.945192	migration_csv
4	Cisaille De Ferrailleur	cisaille de ferrailleur	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.947469	2026-02-20 22:02:13.947469	migration_csv
5	Cle De Serrage	cle de serrage	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.950819	2026-02-20 22:02:13.950819	migration_csv
6	Dameuse	dameuse	Outillage-Autres	Outils manuels	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.953695	2026-02-20 22:02:13.953695	migration_csv
7	Grattoir	grattoir	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.956413	2026-02-20 22:02:13.956413	migration_csv
8	Griffe 14-12	12 14 griffe	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.959555	2026-02-20 22:02:13.959555	migration_csv
9	Griffe 8-10	10 8 griffe	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.962001	2026-02-20 22:02:13.962001	migration_csv
10	Griffe 8-6	6 8 griffe	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.964819	2026-02-20 22:02:13.964819	migration_csv
11	Kit Cles A Laine	a cles kit laine	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.96879	2026-02-20 22:02:13.96879	migration_csv
12	Kit Tournevis	kit tournevis	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.97217	2026-02-20 22:02:13.97217	migration_csv
14	Manche Pelle	manche pelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.978942	2026-02-20 22:02:13.978942	migration_csv
15	Manche Pioche	manche pioche	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.981562	2026-02-20 22:02:13.981562	migration_csv
16	Marteau	marteau	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.985802	2026-02-20 22:02:13.985802	migration_csv
17	Pelle	pelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.988458	2026-02-20 22:02:13.988458	migration_csv
18	Pelle A Ciment	a ciment pelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.99128	2026-02-20 22:02:13.99128	migration_csv
19	Pelle A Poussiere	a pelle poussiere	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.994248	2026-02-20 22:02:13.994248	migration_csv
20	Pelle Beche	beche pelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.997231	2026-02-20 22:02:13.997231	migration_csv
21	Pelle Jardinage	jardinage pelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.000017	2026-02-20 22:02:14.000017	migration_csv
22	Pince A Gaz	a gaz pince	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.003074	2026-02-20 22:02:14.003074	migration_csv
24	Pioche	pioche	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.011543	2026-02-20 22:02:14.011543	migration_csv
26	Rateau	rateau	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.017519	2026-02-20 22:02:14.017519	migration_csv
27	Scie A Bois	a bois scie	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.020588	2026-02-20 22:02:14.020588	migration_csv
28	Seaux	seaux	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.034462	2026-02-20 22:02:14.034462	migration_csv
29	Serre-joint	joint serre	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.037775	2026-02-20 22:02:14.037775	migration_csv
30	Taloche	taloche	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.047572	2026-02-20 22:02:14.047572	migration_csv
31	Tenailles	tenailles	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.053301	2026-02-20 22:02:14.053301	migration_csv
32	Cordeau	cordeau	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.057203	2026-02-20 22:02:14.057203	migration_csv
33	Decametre 20m	20m decametre	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.064335	2026-02-20 22:02:14.064335	migration_csv
34	Decametre 30m	30m decametre	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.068822	2026-02-20 22:02:14.068822	migration_csv
35	Equerre	equerre	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.071362	2026-02-20 22:02:14.071362	migration_csv
36	Metre 3m	3m metre	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.073758	2026-02-20 22:02:14.073758	migration_csv
37	Metre 5m	5m metre	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.076472	2026-02-20 22:02:14.076472	migration_csv
38	Niveau A Bulle - GM	a bulle gm niveau	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.079361	2026-02-20 22:02:14.079361	migration_csv
39	Niveau A Bulle - Mini	a bulle mini niveau	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.08379	2026-02-20 22:02:14.08379	migration_csv
40	Niveau A Bulle - PM	a bulle niveau pm	Outillage-Autres	Mesure & traçage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.086961	2026-02-20 22:02:14.086961	migration_csv
41	Filet Avertisseur Bleu	avertisseur bleu filet	Outillage-Autres	Sécurité & signalisation	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.089914	2026-02-20 22:02:14.089914	migration_csv
42	Filet Avertisseur Rouge	avertisseur filet rouge	Outillage-Autres	Sécurité & signalisation	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.092639	2026-02-20 22:02:14.092639	migration_csv
43	Regard De Visite GM	de gm regard visite	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.09535	2026-02-20 22:02:14.09535	migration_csv
44	Regard De Visite PM	de pm regard visite	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.098163	2026-02-20 22:02:14.098163	migration_csv
45	Balai	balai	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.100805	2026-02-20 22:02:14.100805	migration_csv
46	Glaciere	glaciere	Outillage-Autres	Équipement & mobilier	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.103654	2026-02-20 22:02:14.103654	migration_csv
47	Matelas	matelas	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.105855	2026-02-20 22:02:14.105855	migration_csv
48	Table Pliante	pliante table	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.108595	2026-02-20 22:02:14.108595	migration_csv
49	Tabouret	tabouret	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.111252	2026-02-20 22:02:14.111252	migration_csv
50	Evac - DN 110	110 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.114071	2026-02-20 22:02:14.114071	migration_csv
51	Evac - DN 40	40 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.116785	2026-02-20 22:02:14.116785	migration_csv
52	Evac - DN 50	50 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.11948	2026-02-20 22:02:14.11948	migration_csv
54	Evac - DN 75	75 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.124889	2026-02-20 22:02:14.124889	migration_csv
55	Evac - DN 90	90 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.127464	2026-02-20 22:02:14.127464	migration_csv
56	Evac - DN 160	160 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.130154	2026-02-20 22:02:14.130154	migration_csv
57	Evac - DN 125	125 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.132874	2026-02-20 22:02:14.132874	migration_csv
58	Jr - DN 16 - PN 6 (rouleau De 100m)	100m 16 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.135653	2026-02-20 22:02:14.135653	migration_csv
59	Jr - DN 25 - PN 6 (rouleau De 100m)	100m 25 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.138473	2026-02-20 22:02:14.138473	migration_csv
60	Jr - DN 32 - PN 10 (rouleau De 100m)	10 100m 32 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.142756	2026-02-20 22:02:14.142756	migration_csv
61	Jr - DN 32 - PN 6 (rouleau De 100m)	100m 32 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.145707	2026-02-20 22:02:14.145707	migration_csv
62	Jr - DN 40 - PN 6 (rouleau De 100m)	100m 40 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.148614	2026-02-20 22:02:14.148614	migration_csv
64	Pression - DN 110	110 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.154342	2026-02-20 22:02:14.154342	migration_csv
65	Pression - DN 125	125 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.157262	2026-02-20 22:02:14.157262	migration_csv
66	Pression - DN 40	40 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.160674	2026-02-20 22:02:14.160674	migration_csv
67	Pression - DN 50	50 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.163438	2026-02-20 22:02:14.163438	migration_csv
68	Pression - DN 63	63 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.166302	2026-02-20 22:02:14.166302	migration_csv
69	Pression - DN 75	75 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.169114	2026-02-20 22:02:14.169114	migration_csv
70	Pression - DN 90	90 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.171978	2026-02-20 22:02:14.171978	migration_csv
71	Coude Evac 45° - DN 125	125 45 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.174832	2026-02-20 22:02:14.174832	migration_csv
72	Coude Evac 45° - DN 160	160 45 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.177851	2026-02-20 22:02:14.177851	migration_csv
73	Coude Evac 45° - DN 50	45 50 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.180649	2026-02-20 22:02:14.180649	migration_csv
74	Coude Evac 90° - DN 32	32 90 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.183446	2026-02-20 22:02:14.183446	migration_csv
75	Coude Evac 90° - DN 50	50 90 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.18604	2026-02-20 22:02:14.18604	migration_csv
76	Coude Evac 90° - DN 63	63 90 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.189587	2026-02-20 22:02:14.189587	migration_csv
77	Coude Evac 90° - DN 75	75 90 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.192572	2026-02-20 22:02:14.192572	migration_csv
78	Coude Jr - DN 25	25 coude dn jr	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.195181	2026-02-20 22:02:14.195181	migration_csv
79	Coude Jr - DN 32	32 coude dn jr	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.197907	2026-02-20 22:02:14.197907	migration_csv
80	Coude Jr - DN 40	40 coude dn jr	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.200957	2026-02-20 22:02:14.200957	migration_csv
81	Coude Jr - DN 50	50 coude dn jr	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.204381	2026-02-20 22:02:14.204381	migration_csv
82	Coude Pression 45° - DN 110	110 45 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.209155	2026-02-20 22:02:14.209155	migration_csv
83	Coude Pression 45° - DN 32	32 45 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.21209	2026-02-20 22:02:14.21209	migration_csv
84	Coude Pression 45° - DN 50	45 50 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.217873	2026-02-20 22:02:14.217873	migration_csv
85	Coude Pression 45° - DN 63	45 63 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.222227	2026-02-20 22:02:14.222227	migration_csv
86	Coude Pression 45° - DN 75	45 75 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.225374	2026-02-20 22:02:14.225374	migration_csv
87	Coude Pression 90° - 3'	3 90 coude pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.230968	2026-02-20 22:02:14.230968	migration_csv
88	Coude Pression 90° - DN 40	40 90 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.233658	2026-02-20 22:02:14.233658	migration_csv
89	Coude Pression 90° - DN 63	63 90 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.238817	2026-02-20 22:02:14.238817	migration_csv
90	Coude Pression 90° - DN 75	75 90 coude dn pression	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.241671	2026-02-20 22:02:14.241671	migration_csv
91	Embout Mix Jr 1''- DN 32	1 32 dn embout jr mix	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.244461	2026-02-20 22:02:14.244461	migration_csv
92	Embout Mix Jr 1'1/2 - DN 50	1 1 2 50 dn embout jr mix	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.247641	2026-02-20 22:02:14.247641	migration_csv
93	Embout Mix Jr 1'1/4 - DN 32	1 1 32 4 dn embout jr mix	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.250433	2026-02-20 22:02:14.250433	migration_csv
94	Embout Mix Jr 1'1/4 - DN 40	1 1 4 40 dn embout jr mix	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.253327	2026-02-20 22:02:14.253327	migration_csv
95	Embout Mix Pression - 1'- DN 25	1 25 dn embout mix pression	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.256593	2026-02-20 22:02:14.256593	migration_csv
96	Embout Mix Pression - 1'1/2 - DN 50	1 1 2 50 dn embout mix pression	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.259293	2026-02-20 22:02:14.259293	migration_csv
97	Embout Mix Pression - 1'1/2 - DN 63	1 1 2 63 dn embout mix pression	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.262137	2026-02-20 22:02:14.262137	migration_csv
99	Embout Mix Pression - 1'1/4 - DN 40	1 1 4 40 dn embout mix pression	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.26911	2026-02-20 22:02:14.26911	migration_csv
100	Embout Mix Pression - 1'1/4 - DN 50	1 1 4 50 dn embout mix pression	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.272002	2026-02-20 22:02:14.272002	migration_csv
101	Raccord Pression 1'	1 pression raccord	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.274912	2026-02-20 22:02:14.274912	migration_csv
102	Raccord Pression 1'1/4	1 1 4 pression raccord	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.277916	2026-02-20 22:02:14.277916	migration_csv
103	Raccord Union Pression DN 50	50 dn pression raccord union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.280653	2026-02-20 22:02:14.280653	migration_csv
104	Raccord Union Pression DN 75	75 dn pression raccord union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.283295	2026-02-20 22:02:14.283295	migration_csv
105	Reduc Jr - DN 40/32	32 40 dn jr reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.286057	2026-02-20 22:02:14.286057	migration_csv
106	Reduc Jr - DN 50/32	32 50 dn jr reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.28888	2026-02-20 22:02:14.28888	migration_csv
107	Reduc Pression - DN 110/75	110 75 dn pression reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.291421	2026-02-20 22:02:14.291421	migration_csv
108	Reduc Pression - DN 40/25	25 40 dn pression reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.294083	2026-02-20 22:02:14.294083	migration_csv
109	Reduc Pression - DN 75/63	63 75 dn pression reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.296905	2026-02-20 22:02:14.296905	migration_csv
110	Te Evac - DN 110	110 dn evac te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.30012	2026-02-20 22:02:14.30012	migration_csv
111	Te Jr - DN 25	25 dn jr te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.302807	2026-02-20 22:02:14.302807	migration_csv
112	Te Jr - DN 32	32 dn jr te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.305713	2026-02-20 22:02:14.305713	migration_csv
113	Te Jr - DN 40	40 dn jr te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.307989	2026-02-20 22:02:14.307989	migration_csv
114	Te Jr - DN 50	50 dn jr te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.311447	2026-02-20 22:02:14.311447	migration_csv
115	Te Pression - DN 110	110 dn pression te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.314725	2026-02-20 22:02:14.314725	migration_csv
116	Te Pression - DN 25	25 dn pression te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.317671	2026-02-20 22:02:14.317671	migration_csv
117	Te Pression - DN 32	32 dn pression te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.320484	2026-02-20 22:02:14.320484	migration_csv
118	Te Pression - DN 50	50 dn pression te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.323364	2026-02-20 22:02:14.323364	migration_csv
119	Te Pression - DN 75	75 dn pression te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.328947	2026-02-20 22:02:14.328947	migration_csv
120	Te Reduc Jr - DN 32/25/32	25 32 32 dn jr reduc te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.333391	2026-02-20 22:02:14.333391	migration_csv
121	Te Reduc Jr - DN 40/1'´/40	1 40 40 dn jr reduc te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.3368	2026-02-20 22:02:14.3368	migration_csv
122	Union Jr - DN 32	32 dn jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.339178	2026-02-20 22:02:14.339178	migration_csv
123	Union Jr - DN 40	40 dn jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.342132	2026-02-20 22:02:14.342132	migration_csv
124	Union Jr - DN 50	50 dn jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.348299	2026-02-20 22:02:14.348299	migration_csv
125	Union Pression 3'1/2	1 2 3 pression union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.351713	2026-02-20 22:02:14.351713	migration_csv
126	Vanne Jr - DN 40	40 dn jr vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.354459	2026-02-20 22:02:14.354459	migration_csv
127	Vanne Jr - DN 50	50 dn jr vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.35736	2026-02-20 22:02:14.35736	migration_csv
128	Vanne Pression - DN 110	110 dn pression vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.361145	2026-02-20 22:02:14.361145	migration_csv
129	Vanne Pression - DN 32	32 dn pression vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.363191	2026-02-20 22:02:14.363191	migration_csv
130	Vanne Pression - DN 75	75 dn pression vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.365914	2026-02-20 22:02:14.365914	migration_csv
132	Vanne Reduc Jr - DN 32f / 40m	32f 40m dn jr reduc vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.370801	2026-02-20 22:02:14.370801	migration_csv
133	Bouchon Jr - DN 25	25 bouchon dn jr	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.373637	2026-02-20 22:02:14.373637	migration_csv
134	Bouchon Jr - DN 32	32 bouchon dn jr	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.376399	2026-02-20 22:02:14.376399	migration_csv
135	Bouchon Pression - DN 110	110 bouchon dn pression	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.378807	2026-02-20 22:02:14.378807	migration_csv
136	Bouchon Pression - DN 63	63 bouchon dn pression	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.384264	2026-02-20 22:02:14.384264	migration_csv
137	Bouchon Pression - DN 75	75 bouchon dn pression	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.389443	2026-02-20 22:02:14.389443	migration_csv
138	Colle PVC 1l	1l colle pvc	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.399101	2026-02-20 22:02:14.399101	migration_csv
139	Asperseur - 32l / H	32l asperseur h	Plomberie et Irrigation	Irrigation & arrosage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.407242	2026-02-20 22:02:14.407242	migration_csv
140	Filtre A Disque 130 Microns - 1"1/2	1 1 130 2 a disque filtre microns	Plomberie et Irrigation	Irrigation & arrosage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.432304	2026-02-20 22:02:14.432304	migration_csv
141	Goutteurs - 6l / H	6l goutteurs h	Plomberie et Irrigation	Irrigation & arrosage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.436467	2026-02-20 22:02:14.436467	migration_csv
163	Membrane PVC	membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.504837	2026-02-20 22:02:14.504837	migration_csv
185	Membrane PVC 8mx20m	8mx20m membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	f	8	20	\N	f	2026-02-20 22:02:14.631971	2026-02-20 22:02:14.631971	migration_csv
186	Membrane PVC 10mx20m	10mx20m membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	f	10	20	\N	f	2026-02-20 22:02:14.63711	2026-02-20 22:02:14.63711	migration_csv
187	Membrane PVC 10mx50m	10mx50m membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	f	10	50	\N	f	2026-02-20 22:02:14.639789	2026-02-20 22:02:14.639789	migration_csv
143	Piquet Asperseur	asperseur piquet	Plomberie et Irrigation	Irrigation & arrosage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.442813	2026-02-20 22:02:14.442813	migration_csv
144	Boite De Liaison Etanche	boite de etanche liaison	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.445775	2026-02-20 22:02:14.445775	migration_csv
145	Cable A05vvf 3 X 1.5mm	1 3 5mm a05vvf cable x	Electricité	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.448636	2026-02-20 22:02:14.448636	migration_csv
146	Disjoncteur Modulaire 10a	10a disjoncteur modulaire	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.451585	2026-02-20 22:02:14.451585	migration_csv
147	Disjoncteur Modulaire 16a	16a disjoncteur modulaire	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.454467	2026-02-20 22:02:14.454467	migration_csv
148	Gaine Annele - D 13	13 annele d gaine	Electricité	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.456783	2026-02-20 22:02:14.456783	migration_csv
149	Gaine Annele - D 32	32 annele d gaine	Electricité	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.459797	2026-02-20 22:02:14.459797	migration_csv
150	Horloge Modulaire Analogique	analogique horloge modulaire	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.46338	2026-02-20 22:02:14.46338	migration_csv
151	Horloge Modulaire Numerique	horloge modulaire numerique	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.469188	2026-02-20 22:02:14.469188	migration_csv
152	Casque Blanc	blanc casque	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.473065	2026-02-20 22:02:14.473065	migration_csv
153	Casque Bleu	bleu casque	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.47596	2026-02-20 22:02:14.47596	migration_csv
154	Foulard	foulard	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.478728	2026-02-20 22:02:14.478728	migration_csv
155	Gilet Jaune	gilet jaune	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.482083	2026-02-20 22:02:14.482083	migration_csv
156	Paire Chaussures - 41	41 chaussures paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.486424	2026-02-20 22:02:14.486424	migration_csv
157	Paire Chaussures - 42	42 chaussures paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.489143	2026-02-20 22:02:14.489143	migration_csv
158	Paire Chaussures - 44	44 chaussures paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.491959	2026-02-20 22:02:14.491959	migration_csv
159	Paire Chaussures - 45	45 chaussures paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.49472	2026-02-20 22:02:14.49472	migration_csv
160	Paire Chaussures - 46	46 chaussures paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.497285	2026-02-20 22:02:14.497285	migration_csv
161	Paire Gants	gants paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.499831	2026-02-20 22:02:14.499831	migration_csv
162	T-shirt	shirt t	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.502327	2026-02-20 22:02:14.502327	migration_csv
165	Evac - DN 50 (chute)	50 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.511039	2026-02-20 22:02:14.511039	migration_csv
166	Evac - DN 63 (chute)	63 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.513569	2026-02-20 22:02:14.513569	migration_csv
167	Evac - DN 75 (chute)	75 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.51618	2026-02-20 22:02:14.51618	migration_csv
168	Evac - DN 90 (chute)	90 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.521171	2026-02-20 22:02:14.521171	migration_csv
169	Evac - DN 160 (chute)	160 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.524604	2026-02-20 22:02:14.524604	migration_csv
170	Evac - DN 125 (chute)	125 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.527534	2026-02-20 22:02:14.527534	migration_csv
171	Jr - DN 16 - PN 6 (chute)	16 6 chute dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	Chute > 3m (et inf. à 10m)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.530232	2026-02-20 22:02:14.530232	migration_csv
172	Jr - DN 25 - PN 6 (chute)	25 6 chute dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	Chute > 3m (et inf. à 10m)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.532917	2026-02-20 22:02:14.532917	migration_csv
173	Jr - DN 32 - PN 10 (chute)	10 32 chute dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	Chute > 3m (et inf. à 10m)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.536086	2026-02-20 22:02:14.536086	migration_csv
174	Jr - DN 32 - PN 6 (chute)	32 6 chute dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	Chute > 3m (et inf. à 10m)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.540358	2026-02-20 22:02:14.540358	migration_csv
175	Jr - DN 40 - PN 6 (chute)	40 6 chute dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	Chute > 3m (et inf. à 10m)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.543141	2026-02-20 22:02:14.543141	migration_csv
176	Jr - DN 50 - PN 6 (chute)	50 6 chute dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	Chute > 3m (et inf. à 10m)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.545993	2026-02-20 22:02:14.545993	migration_csv
177	Pression - DN 40 (chute)	40 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.548427	2026-02-20 22:02:14.548427	migration_csv
178	Pression - DN 50 (chute)	50 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.551123	2026-02-20 22:02:14.551123	migration_csv
179	Pression - DN 63 (chute)	63 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.553743	2026-02-20 22:02:14.553743	migration_csv
180	Pression - DN 75 (chute)	75 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.556743	2026-02-20 22:02:14.556743	migration_csv
181	Pression - DN 90 (chute)	90 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.55964	2026-02-20 22:02:14.55964	migration_csv
182	Pression - DN 110 (chute)	110 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.562693	2026-02-20 22:02:14.562693	migration_csv
183	Pression - DN 125 (chute)	125 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.583404	2026-02-20 22:02:14.583404	migration_csv
184	Evac - DN 40 (chute)	40 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.629336	2026-02-20 22:02:14.629336	migration_csv
188	Pompe Bcm 10/50 St 0,75kw	0 10 50 75kw bcm pompe st	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.642678	2026-02-20 22:02:14.642678	migration_csv
189	Pompe Dm8 0,55kw	0 55kw dm8 pompe	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.644935	2026-02-20 22:02:14.644935	migration_csv
190	Pompe Top Vortex 0,37kw	0 37kw pompe top vortex	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.648484	2026-02-20 22:02:14.648484	migration_csv
191	Pompe Upm2/4-ge	4 ge pompe upm2	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.651778	2026-02-20 22:02:14.651778	migration_csv
193	Pompe Vxm 10/35 0,75kw	0 10 35 75kw pompe vxm	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.656792	2026-02-20 22:02:14.656792	migration_csv
194	Groupe Électrogène	electrogene groupe	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.659673	2026-02-20 22:02:14.659673	migration_csv
195	Pression - DN 160	160 dn pression	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.661987	2026-02-20 22:02:14.661987	migration_csv
196	Pression - DN 160 (chute)	160 chute dn pression	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.665169	2026-02-20 22:02:14.665169	migration_csv
197	Monolyto 15 Central	15 central monolyto	Monolyto	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.66756	2026-02-20 22:02:14.66756	migration_csv
198	Monolyto 15 Angle	15 angle monolyto	Monolyto	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.670166	2026-02-20 22:02:14.670166	migration_csv
199	Monolyto 15 Demi	15 demi monolyto	Monolyto	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.673376	2026-02-20 22:02:14.673376	migration_csv
200	Geotextile (rouleau De 5.9m X 150m)	150m 5 9m de geotextile rouleau x	Etanchéité	Geotextile	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.675673	2026-02-20 22:02:14.675673	migration_csv
201	Jr - DN 16 - PN 6 (rouleau De 50m)	16 50m 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.67848	2026-02-20 22:02:14.67848	migration_csv
203	Jr - DN 32 - PN 10 (rouleau De 50m)	10 32 50m de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.683788	2026-02-20 22:02:14.683788	migration_csv
204	Jr - DN 32 - PN 6 (rouleau De 50m)	32 50m 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.686663	2026-02-20 22:02:14.686663	migration_csv
205	Jr - DN 40 - PN 6 (rouleau De 50m)	40 50m 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.689381	2026-02-20 22:02:14.689381	migration_csv
206	Jr - DN 50 - PN 6 (rouleau De 50m)	50 50m 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.691492	2026-02-20 22:02:14.691492	migration_csv
207	Jr - DN 16 - PN 6 (rouleau Partiellement Utilisé)	16 6 dn jr partiellement pn rouleau utilise	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.694244	2026-02-20 22:02:14.694244	migration_csv
208	Jr - DN 25 - PN 6 (rouleau Partiellement Utilisé)	25 6 dn jr partiellement pn rouleau utilise	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.696976	2026-02-20 22:02:14.696976	migration_csv
209	Jr - DN 32 - PN 10 (rouleau Partiellement Utilisé)	10 32 dn jr partiellement pn rouleau utilise	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.700163	2026-02-20 22:02:14.700163	migration_csv
210	Jr - DN 32 - PN 6 (rouleau Partiellement Utilisé)	32 6 dn jr partiellement pn rouleau utilise	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.703272	2026-02-20 22:02:14.703272	migration_csv
211	Jr - DN 40 - PN 6 (rouleau Partiellement Utilisé)	40 6 dn jr partiellement pn rouleau utilise	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.70612	2026-02-20 22:02:14.70612	migration_csv
212	Jr - DN 50 - PN 6 (rouleau Partiellement Utilisé)	50 6 dn jr partiellement pn rouleau utilise	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	\N	\N	\N	t	2026-02-20 22:02:14.709015	2026-02-20 22:02:14.709015	migration_csv
213	Jr - DN 16 - PN 6 (87m)	16 6 87m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	f	87	\N	\N	f	2026-02-20 22:02:14.71345	2026-02-20 22:02:14.71345	migration_csv
214	Pompe Upm8/4-ge	4 ge pompe upm8	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.716536	2026-02-20 22:02:14.716536	migration_csv
215	Jr - DN 25 - PN 6 (23.8m)	23 25 6 8m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	23.8	\N	\N	f	2026-02-20 22:02:14.720981	2026-02-20 22:02:14.720981	migration_csv
216	Jr - DN 25 - PN 6 (49.75m)	25 49 6 75m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	f	49.75	\N	\N	f	2026-02-20 22:02:14.723649	2026-02-20 22:02:14.723649	migration_csv
217	Jr - DN 25 - PN 6 (19.49m)	19 25 49m 6 dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	19.49	\N	\N	f	2026-02-20 22:02:14.726844	2026-02-20 22:02:14.726844	migration_csv
218	Jr - DN 40 - PN 6 (13.9m)	13 40 6 9m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	f	13.9	\N	\N	f	2026-02-20 22:02:14.729507	2026-02-20 22:02:14.729507	migration_csv
219	Jr - DN 40 - PN 6 (12.6m)	12 40 6 6m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	12.6	\N	\N	f	2026-02-20 22:02:14.732664	2026-02-20 22:02:14.732664	migration_csv
220	Jr - DN 40 - PN 6 (14.6m)	14 40 6 6m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	f	14.6	\N	\N	f	2026-02-20 22:02:14.735286	2026-02-20 22:02:14.735286	migration_csv
221	Jr - DN 40 - PN 6 (48.7m)	40 48 6 7m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	48.7	\N	\N	f	2026-02-20 22:02:14.738974	2026-02-20 22:02:14.738974	migration_csv
222	Jr - DN 32 - PN 10 (15.9m)	10 15 32 9m dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	15.9	\N	\N	f	2026-02-20 22:02:14.742541	2026-02-20 22:02:14.742541	migration_csv
223	Jr - DN 32 - PN 6 (33m)	32 33m 6 dn jr pn	Plomberie et Irrigation	Tubes & tuyaux	unité(s)	t	stock	t	33	\N	\N	f	2026-02-20 22:02:14.745598	2026-02-20 22:02:14.745598	migration_csv
224	Couvercle Regard 60 X 60	60 60 couvercle regard x	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.748497	2026-02-20 22:02:14.748497	migration_csv
225	Couvercle Regard 40 X 40	40 40 couvercle regard x	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.751884	2026-02-20 22:02:14.751884	migration_csv
226	Câble H05vvf 3x2.5 Mm	3x2 5 cable h05vvf mm	Electricité	\N	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.754301	2026-02-20 22:02:14.754301	migration_csv
227	Gaine Annelée - D32	annelee d32 gaine	Electricité	\N	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.757328	2026-02-20 22:02:14.757328	migration_csv
228	Gaine Annelée - D25	annelee d25 gaine	Electricité	\N	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.760537	2026-02-20 22:02:14.760537	migration_csv
229	Coffret Électrique PM	coffret electrique pm	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.764022	2026-02-20 22:02:14.764022	migration_csv
230	Gaine Annelée - D20	annelee d20 gaine	Electricité	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.767023	2026-02-20 22:02:14.767023	migration_csv
231	Gaine Annelée - D15	annelee d15 gaine	Electricité	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.769987	2026-02-20 22:02:14.769987	migration_csv
232	Couvercle En Bois	bois couvercle en	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.772353	2026-02-20 22:02:14.772353	migration_csv
233	Gilets Sécurité (orange)	gilets orange securite	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.77526	2026-02-20 22:02:14.77526	migration_csv
234	Casques Vert	casques vert	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.778992	2026-02-20 22:02:14.778992	migration_csv
235	Bottes Maintenance (paire)	bottes maintenance paire	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.781415	2026-02-20 22:02:14.781415	migration_csv
236	Cisaille D'entretien Paysager	cisaille d entretien paysager	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.784189	2026-02-20 22:02:14.784189	migration_csv
237	Scie PVC	pvc scie	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.786855	2026-02-20 22:02:14.786855	migration_csv
252	Meule Électrique (AC)	ac electrique meule	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.83607	2026-02-20 22:02:14.83607	migration_csv
242	Membrane PVC 2.5mx7m - Blanc	2 5mx7m blanc membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	f	2.5	7	Blanc	f	2026-02-20 22:02:14.806287	2026-02-20 22:02:14.806287	migration_csv
247	Truelle	truelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.821854	2026-02-20 22:02:14.821854	migration_csv
248	Échelle	echelle	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.82485	2026-02-20 22:02:14.82485	migration_csv
264	Membrane PVC 2.85mx4.7m - Blanc	2 7m 85mx4 blanc membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	f	2.85	4.7	Blanc	f	2026-02-20 22:02:14.871805	2026-02-20 22:02:14.871805	migration_csv
267	Membrane PVC 11mx17m - Blanc	11mx17m blanc membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	f	11	17	Blanc	f	2026-02-20 22:02:14.879825	2026-02-20 22:02:14.879825	migration_csv
268	Théière	theiere	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.882415	2026-02-20 22:02:14.882415	migration_csv
269	Gaz PM	gaz pm	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.884916	2026-02-20 22:02:14.884916	migration_csv
271	Ciseaux	ciseaux	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.891236	2026-02-20 22:02:14.891236	migration_csv
275	Echelle	echelle	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.903804	2026-02-20 22:02:14.903804	migration_csv
239	Embout Pioche	embout pioche	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.791833	2026-02-20 22:02:14.791833	migration_csv
240	Niveau À Eau	a eau niveau	Outillage-Autres	Mesure & traçage	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.794735	2026-02-20 22:02:14.794735	migration_csv
243	Tuyau Pour Coudage	coudage pour tuyau	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.810204	2026-02-20 22:02:14.810204	migration_csv
244	Pince Multiprise	multiprise pince	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.813812	2026-02-20 22:02:14.813812	migration_csv
245	Pince Serrage	pince serrage	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.81666	2026-02-20 22:02:14.81666	migration_csv
246	Pistolet À Mastic	a mastic pistolet	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.819467	2026-02-20 22:02:14.819467	migration_csv
249	Combinaison Maintenance	combinaison maintenance	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.827047	2026-02-20 22:02:14.827047	migration_csv
250	Lampe Torche	lampe torche	Outillage-Autres	Équipement & mobilier	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.829982	2026-02-20 22:02:14.829982	migration_csv
251	Pompe Maintenance Et Équipements	equipements et maintenance pompe	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.83297	2026-02-20 22:02:14.83297	migration_csv
253	Reduc Pression - DN 110/50	110 50 dn pression reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.839107	2026-02-20 22:02:14.839107	migration_csv
254	Raccord Union Pression DN 110	110 dn pression raccord union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.84184	2026-02-20 22:02:14.84184	migration_csv
255	Teflon	teflon	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.844335	2026-02-20 22:02:14.844335	migration_csv
256	Te Pression DN - 63	63 dn pression te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.847402	2026-02-20 22:02:14.847402	migration_csv
257	Raccord Union Pression DN 63	63 dn pression raccord union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.851453	2026-02-20 22:02:14.851453	migration_csv
258	Traversée Paroi DN 110	110 dn paroi traversee	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.854876	2026-02-20 22:02:14.854876	migration_csv
259	Traversée Paroi DN 75	75 dn paroi traversee	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.857864	2026-02-20 22:02:14.857864	migration_csv
260	Traversée Paroi DN 50	50 dn paroi traversee	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.860741	2026-02-20 22:02:14.860741	migration_csv
261	Traversée Paroi DN 63	63 dn paroi traversee	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.863549	2026-02-20 22:02:14.863549	migration_csv
262	Meule Avec Batterie	avec batterie meule	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.866608	2026-02-20 22:02:14.866608	migration_csv
263	Rallonge Électrique	electrique rallonge	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.868937	2026-02-20 22:02:14.868937	migration_csv
265	Membrane PVC 3mx4m - Gris	3mx4m gris membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	t	3	4	gris	f	2026-02-20 22:02:14.87456	2026-02-20 22:02:14.87456	migration_csv
266	Membrane PVC 4mx5m - Bache À Eau	4mx5m a bache eau membrane pvc	Etanchéité	Géomembranes	unité(s)	t	stock	t	4	5	bache à eau	f	2026-02-20 22:02:14.877181	2026-02-20 22:02:14.877181	migration_csv
270	Coupe Coupe	coupe coupe	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.888345	2026-02-20 22:02:14.888345	migration_csv
272	Ciseaux Baches	baches ciseaux	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.895006	2026-02-20 22:02:14.895006	migration_csv
273	Table Ferrailleur	ferrailleur table	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.898209	2026-02-20 22:02:14.898209	migration_csv
274	Attache / Collier	attache collier	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.900822	2026-02-20 22:02:14.900822	migration_csv
276	Combinaison Maintenance Xxl	combinaison maintenance xxl	EPI	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.906641	2026-02-20 22:02:14.906641	migration_csv
277	Multimètre Numérique	multimetre numerique	Electricité	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.909283	2026-02-20 22:02:14.909283	migration_csv
278	Kit Embout Perceuse GM	embout gm kit perceuse	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.912621	2026-02-20 22:02:14.912621	migration_csv
279	Bouchon Evac 110	110 bouchon evac	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.915469	2026-02-20 22:02:14.915469	migration_csv
280	Coude Evac 45 - Dn40	45 coude dn40 evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.918505	2026-02-20 22:02:14.918505	migration_csv
281	Coude Evac 45 - Dn32	45 coude dn32 evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.921223	2026-02-20 22:02:14.921223	migration_csv
282	Coude Evac 87 - Dn63	87 coude dn63 evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.924153	2026-02-20 22:02:14.924153	migration_csv
283	Reduc Pression - DN 63/50	50 63 dn pression reduc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.926476	2026-02-20 22:02:14.926476	migration_csv
284	Perceuse Tuyau Irrigation	irrigation perceuse tuyau	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.929107	2026-02-20 22:02:14.929107	migration_csv
285	Bouchon Jr - Dn40	bouchon dn40 jr	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.93142	2026-02-20 22:02:14.93142	migration_csv
294	Colle Mastic	colle mastic	Plomberie et Irrigation	Autres	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.958268	2026-02-20 22:02:14.958268	migration_csv
297	Clotûre 120	120 cloture	Clotûre	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.970122	2026-02-20 22:02:14.970122	migration_csv
300	Piquets 120	120 piquets	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.978097	2026-02-20 22:02:14.978097	migration_csv
301	Portail Cloture 120 (piéton)	120 cloture pieton portail	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.980871	2026-02-20 22:02:14.980871	migration_csv
302	Portail Cloture 120 (camion)	120 camion cloture portail	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.983997	2026-02-20 22:02:14.983997	migration_csv
303	Clôture 150	150 cloture	Clotûre	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.989362	2026-02-20 22:02:14.989362	migration_csv
304	Piquets 150	150 piquets	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.991954	2026-02-20 22:02:14.991954	migration_csv
305	Portail Clôture 150 (piéton)	150 cloture pieton portail	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.994303	2026-02-20 22:02:14.994303	migration_csv
324	Compacteur	compacteur	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.049449	2026-02-20 22:02:15.049449	migration_csv
325	Marteau-piqueur	marteau piqueur	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.052092	2026-02-20 22:02:15.052092	migration_csv
327	Huile Moteurs	huile moteurs	Equipements lourds	\N	L	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.057403	2026-02-20 22:02:15.057403	migration_csv
287	Vanne Jr - Dn25	dn25 jr vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.936668	2026-02-20 22:02:14.936668	migration_csv
288	Union Jr - Dn50/40	40 dn50 jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.939618	2026-02-20 22:02:14.939618	migration_csv
289	Te Reduc Jr - DN 40/ 32/40	32 40 40 dn jr reduc te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.941732	2026-02-20 22:02:14.941732	migration_csv
290	Union Jr - DN 25	25 dn jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.944473	2026-02-20 22:02:14.944473	migration_csv
291	Vanne Guillotine DN 110	110 dn guillotine vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.947779	2026-02-20 22:02:14.947779	migration_csv
292	Vanne Pression DN 100	100 dn pression vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.952583	2026-02-20 22:02:14.952583	migration_csv
293	Tuyaux Arrosage	arrosage tuyaux	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.955228	2026-02-20 22:02:14.955228	migration_csv
295	Clapet Anti Retour Pression DN 50	50 anti clapet dn pression retour	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.962405	2026-02-20 22:02:14.962405	migration_csv
296	Coude Evac 45 - DN 110	110 45 coude dn evac	Plomberie et Irrigation	Coudes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.967241	2026-02-20 22:02:14.967241	migration_csv
298	Poteaux De Tension 120	120 de poteaux tension	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.972872	2026-02-20 22:02:14.972872	migration_csv
299	Poteaux De Tension 120 (angle)	120 angle de poteaux tension	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.97552	2026-02-20 22:02:14.97552	migration_csv
306	Poteaux De Tension 150	150 de poteaux tension	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.9972	2026-02-20 22:02:14.9972	migration_csv
307	Poteaux De Tension 150 (angle)	150 angle de poteaux tension	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.000008	2026-02-20 22:02:15.000008	migration_csv
308	Union Jr - Dn40/32	32 dn40 jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.004344	2026-02-20 22:02:15.004344	migration_csv
309	Union Jr - Dn50/32	32 dn50 jr union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.006698	2026-02-20 22:02:15.006698	migration_csv
310	Enfonce-piquet Grillage	enfonce grillage piquet	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.01161	2026-02-20 22:02:15.01161	migration_csv
311	Tendeur Clôture	cloture tendeur	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.014551	2026-02-20 22:02:15.014551	migration_csv
313	Peinture Anti-rouille	anti peinture rouille	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.020602	2026-02-20 22:02:15.020602	migration_csv
314	Pinceau Peinture	peinture pinceau	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.023235	2026-02-20 22:02:15.023235	migration_csv
315	Raccord Union Pression DN 32	32 dn pression raccord union	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.025991	2026-02-20 22:02:15.025991	migration_csv
316	Clapet Laiton 1''1/2 F	1 1 2 clapet f laiton	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.028509	2026-02-20 22:02:15.028509	migration_csv
317	Kit Topo	kit topo	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.03181	2026-02-20 22:02:15.03181	migration_csv
318	Machine A Soudure	a machine soudure	Equipements lourds	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.034768	2026-02-20 22:02:15.034768	migration_csv
319	Embout Mix Jr 1''- DN 25	1 25 dn embout jr mix	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.037035	2026-02-20 22:02:15.037035	migration_csv
320	Embout Mix PVC F63xm75 - M2'	embout f63xm75 m2 mix pvc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.039732	2026-02-20 22:02:15.039732	migration_csv
321	Embout Mix PVC F50xm63 - 1'1/2	1 1 2 embout f50xm63 mix pvc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.041974	2026-02-20 22:02:15.041974	migration_csv
322	Embout Mix PVC F40xm50 - 1'1/2	1 1 2 embout f40xm50 mix pvc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.044533	2026-02-20 22:02:15.044533	migration_csv
323	Embout Mix PVC F25xm32 - 1'	1 embout f25xm32 mix pvc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.04669	2026-02-20 22:02:15.04669	migration_csv
326	Huile Pompes	huile pompes	Pompes	\N	L	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.054635	2026-02-20 22:02:15.054635	migration_csv
328	Bâche Verte 14 X 1.80	1 14 80 bache verte x	Etanchéité	Géomembranes	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.060107	2026-02-20 22:02:15.060107	migration_csv
329	Bache Verte 2.80 X 1.17	1 17 2 80 bache verte x	Etanchéité	Géomembranes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.062542	2026-02-20 22:02:15.062542	migration_csv
330	Bâche Verte 4 X 2.29	2 29 4 bache verte x	Etanchéité	Géomembranes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.065672	2026-02-20 22:02:15.065672	migration_csv
331	Bâche Verte 2.18 X 1	1 18 2 bache verte x	Etanchéité	Géomembranes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.067833	2026-02-20 22:02:15.067833	migration_csv
332	Bâche Verte 3.60 X 2.14	14 2 3 60 bache verte x	Etanchéité	Géomembranes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.070941	2026-02-20 22:02:15.070941	migration_csv
333	Bâche Verte 80 X 0.75	0 75 80 bache verte x	Etanchéité	Géomembranes	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.073116	2026-02-20 22:02:15.073116	migration_csv
334	Cable H05vvf 3x2.5mm	3x2 5mm cable h05vvf	Electricité	\N	mètre(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.075605	2026-02-20 22:02:15.075605	migration_csv
312	Bouteille Dilluant	bouteille dilluant	Clotûre	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.017744	2026-02-20 22:50:47.279	migration_csv
339	Test Audit Trail Produit	audit produit test trail	Plomberie	\N	u	f	prix	t	\N	\N	\N	f	2026-02-20 23:14:52.879773	2026-02-20 23:14:52.879773	Michael
1	Arrache Clous	arrache clous	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:13.938865	2026-02-20 22:02:13.938865	migration_csv
23	Pince Universelle	pince universelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.007763	2026-02-20 22:02:14.007763	migration_csv
53	Evac - DN 63	63 dn evac	Plomberie et Irrigation	Tubes & tuyaux	Nb de tuyaux 6m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.122138	2026-02-20 22:02:14.122138	migration_csv
63	Jr - DN 50 - PN 6 (rouleau De 100m)	100m 50 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 100m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.151404	2026-02-20 22:02:14.151404	migration_csv
98	Embout Mix Pression - 1'1/4 - DN 32	1 1 32 4 dn embout mix pression	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.265655	2026-02-20 22:02:14.265655	migration_csv
131	Vanne Pression-jr - Pression Dn50 - Jr DN 50	50 dn dn50 jr jr pression pression vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.368619	2026-02-20 22:02:14.368619	migration_csv
142	Goutteurs - 8l / H	8l goutteurs h	Plomberie et Irrigation	Irrigation & arrosage	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.440285	2026-02-20 22:02:14.440285	migration_csv
164	Evac - DN 110 (chute)	110 chute dn evac	Plomberie et Irrigation	Tubes & tuyaux	Chute > 50cm	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.507688	2026-02-20 22:02:14.507688	migration_csv
192	Pompe Vxcm 15/35 1,1kw	1 15 1kw 35 pompe vxcm	Pompes	\N	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.654561	2026-02-20 22:02:14.654561	migration_csv
202	Jr - DN 25 - PN 6 (rouleau De 50m)	25 50m 6 de dn jr pn rouleau	Plomberie et Irrigation	Tubes & tuyaux	Rouleau de 50m	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.680825	2026-02-20 22:02:14.680825	migration_csv
238	Embout Pelle	embout pelle	Outillage-Autres	Outils manuels	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.789138	2026-02-20 22:02:14.789138	migration_csv
241	Rouleau Signalisation	rouleau signalisation	Outillage-Autres	Sécurité & signalisation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.798795	2026-02-20 22:02:14.798795	migration_csv
286	Te Reduc Jr - DN 50/ 1''/50	1 50 50 dn jr reduc te	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:14.93402	2026-02-20 22:02:14.93402	migration_csv
335	Bouchon Pression - DN 50	50 bouchon dn pression	Plomberie et Irrigation	Bouchons & finitions	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.077753	2026-02-20 22:02:15.077753	migration_csv
336	Vanne Pression - DN 50	50 dn pression vanne	Plomberie et Irrigation	Vannes & régulation	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.080344	2026-02-20 22:02:15.080344	migration_csv
337	Clapet PVC Dn63	clapet dn63 pvc	Plomberie et Irrigation	Raccords & adaptateurs	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.082383	2026-02-20 22:02:15.082383	migration_csv
338	Geotextile ( Rouleau De 1.2 X 50 M)	1 2 50 de geotextile m rouleau x	Etanchéité	Geotextile	unité(s)	t	stock	t	\N	\N	\N	f	2026-02-20 22:02:15.084893	2026-02-20 22:02:15.084893	migration_csv
340	Audit Test Produit W3kjw4	audit produit test w3kjw4	Plomberie et Irrigation		u	f	prix	t	\N	\N	\N	f	2026-02-20 23:18:17.983625	2026-02-20 23:18:17.983625	Michael
\.


--
-- Data for Name: unites; Type: TABLE DATA; Schema: referentiel; Owner: -
--

COPY referentiel.unites (id, code, libelle, type) FROM stdin;
1	u	unité(s)	quantité
2	m	mètre(s)	longueur
3	ml	mètre linéaire(s)	longueur
4	m2	mètre carré(s)	surface
5	kg	kilogramme(s)	masse
6	L	litre(s)	volume
7	t	tonne(s)	masse
10	tuyaux_6m	Nb de tuyaux 6m	quantité
11	rouleau_100m	Rouleau de 100m	longueur
12	chute_50cm	Chute > 50cm	longueur
13	chute_3_10m	Chute > 3m (et inf. à 10m)	longueur
14	rouleau_50m	Rouleau de 50m	longueur
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: prix; Owner: -
--

SELECT pg_catalog.setval('prix.api_keys_id_seq', 1, false);


--
-- Name: fournisseurs_id_seq; Type: SEQUENCE SET; Schema: prix; Owner: -
--

SELECT pg_catalog.setval('prix.fournisseurs_id_seq', 4, true);


--
-- Name: historique_prix_id_seq; Type: SEQUENCE SET; Schema: prix; Owner: -
--

SELECT pg_catalog.setval('prix.historique_prix_id_seq', 8, true);


--
-- Name: prix_fournisseurs_id_seq; Type: SEQUENCE SET; Schema: prix; Owner: -
--

SELECT pg_catalog.setval('prix.prix_fournisseurs_id_seq', 12, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 99, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: referentiel; Owner: -
--

SELECT pg_catalog.setval('referentiel.categories_id_seq', 9, true);


--
-- Name: produits_master_id_seq; Type: SEQUENCE SET; Schema: referentiel; Owner: -
--

SELECT pg_catalog.setval('referentiel.produits_master_id_seq', 340, true);


--
-- Name: unites_id_seq; Type: SEQUENCE SET; Schema: referentiel; Owner: -
--

SELECT pg_catalog.setval('referentiel.unites_id_seq', 15, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_unique; Type: CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.api_keys
    ADD CONSTRAINT api_keys_key_unique UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: fournisseurs fournisseurs_nom_unique; Type: CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.fournisseurs
    ADD CONSTRAINT fournisseurs_nom_unique UNIQUE (nom);


--
-- Name: fournisseurs fournisseurs_pkey; Type: CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.fournisseurs
    ADD CONSTRAINT fournisseurs_pkey PRIMARY KEY (id);


--
-- Name: historique_prix historique_prix_pkey; Type: CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.historique_prix
    ADD CONSTRAINT historique_prix_pkey PRIMARY KEY (id);


--
-- Name: prix_fournisseurs prix_fournisseurs_pkey; Type: CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.prix_fournisseurs
    ADD CONSTRAINT prix_fournisseurs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: categories categories_nom_unique; Type: CONSTRAINT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.categories
    ADD CONSTRAINT categories_nom_unique UNIQUE (nom);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: produits_master produits_master_nom_unique; Type: CONSTRAINT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.produits_master
    ADD CONSTRAINT produits_master_nom_unique UNIQUE (nom);


--
-- Name: produits_master produits_master_pkey; Type: CONSTRAINT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.produits_master
    ADD CONSTRAINT produits_master_pkey PRIMARY KEY (id);


--
-- Name: unites unites_code_unique; Type: CONSTRAINT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.unites
    ADD CONSTRAINT unites_code_unique UNIQUE (code);


--
-- Name: unites unites_pkey; Type: CONSTRAINT; Schema: referentiel; Owner: -
--

ALTER TABLE ONLY referentiel.unites
    ADD CONSTRAINT unites_pkey PRIMARY KEY (id);


--
-- Name: idx_prix_defaut; Type: INDEX; Schema: prix; Owner: -
--

CREATE INDEX idx_prix_defaut ON prix.prix_fournisseurs USING btree (est_fournisseur_defaut);


--
-- Name: idx_prix_fournisseur; Type: INDEX; Schema: prix; Owner: -
--

CREATE INDEX idx_prix_fournisseur ON prix.prix_fournisseurs USING btree (fournisseur_id);


--
-- Name: idx_prix_produit_master; Type: INDEX; Schema: prix; Owner: -
--

CREATE INDEX idx_prix_produit_master ON prix.prix_fournisseurs USING btree (produit_master_id);


--
-- Name: idx_produits_actif; Type: INDEX; Schema: referentiel; Owner: -
--

CREATE INDEX idx_produits_actif ON referentiel.produits_master USING btree (actif);


--
-- Name: idx_produits_categorie; Type: INDEX; Schema: referentiel; Owner: -
--

CREATE INDEX idx_produits_categorie ON referentiel.produits_master USING btree (categorie);


--
-- Name: idx_produits_nom_normalise_trgm; Type: INDEX; Schema: referentiel; Owner: -
--

CREATE INDEX idx_produits_nom_normalise_trgm ON referentiel.produits_master USING gin (nom_normalise public.gin_trgm_ops);


--
-- Name: idx_produits_stockable; Type: INDEX; Schema: referentiel; Owner: -
--

CREATE INDEX idx_produits_stockable ON referentiel.produits_master USING btree (est_stockable);


--
-- Name: prix_fournisseurs trigger_historique_prix; Type: TRIGGER; Schema: prix; Owner: -
--

CREATE TRIGGER trigger_historique_prix AFTER UPDATE ON prix.prix_fournisseurs FOR EACH ROW EXECUTE FUNCTION prix.enregistrer_historique_prix();


--
-- Name: historique_prix historique_prix_prix_fournisseur_id_prix_fournisseurs_id_fk; Type: FK CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.historique_prix
    ADD CONSTRAINT historique_prix_prix_fournisseur_id_prix_fournisseurs_id_fk FOREIGN KEY (prix_fournisseur_id) REFERENCES prix.prix_fournisseurs(id);


--
-- Name: prix_fournisseurs prix_fournisseurs_fournisseur_id_fournisseurs_id_fk; Type: FK CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.prix_fournisseurs
    ADD CONSTRAINT prix_fournisseurs_fournisseur_id_fournisseurs_id_fk FOREIGN KEY (fournisseur_id) REFERENCES prix.fournisseurs(id);


--
-- Name: prix_fournisseurs prix_fournisseurs_produit_master_id_produits_master_id_fk; Type: FK CONSTRAINT; Schema: prix; Owner: -
--

ALTER TABLE ONLY prix.prix_fournisseurs
    ADD CONSTRAINT prix_fournisseurs_produit_master_id_produits_master_id_fk FOREIGN KEY (produit_master_id) REFERENCES referentiel.produits_master(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 2IGS8MXWatAckF6UWVDPMkf4GUmjNOV1K2iB07OjUGHNy37ffbTzC1M81AM0zuw

