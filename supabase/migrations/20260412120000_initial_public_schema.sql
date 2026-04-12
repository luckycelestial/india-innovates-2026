-- Rebuilt from Schema Visualizer "Copy as SQL" with fixes:
-- - USER-DEFINED -> real enum types
-- - ARRAY -> text[]
-- - Safe creation order for foreign keys
-- Supabase enables pgcrypto by default (gen_random_uuid).

-- ---------------------------------------------------------------------------
-- Enums (Visualizer shows these as USER-DEFINED)
-- ---------------------------------------------------------------------------
CREATE TYPE public.ticket_status AS ENUM (
  'open',
  'escalated',
  'resolved',
  'closed'
);

CREATE TYPE public.ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE public.user_role AS ENUM (
  'citizen',
  'officer',
  'sarpanch',
  'district_collector',
  'mla',
  'mp'
);

-- Used for grievances.ai_sentiment, sentiment_posts.sentiment, ward_sentiment_scores.label
CREATE TYPE public.sentiment AS ENUM (
  'negative',
  'very_negative',
  'neutral',
  'positive',
  'very_positive'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.wards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  ward_number character varying,
  city character varying NOT NULL,
  state character varying NOT NULL,
  geojson jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wards_pkey PRIMARY KEY (id)
);

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying UNIQUE,
  password_hash character varying NOT NULL,
  role public.user_role NOT NULL DEFAULT 'citizen'::public.user_role,
  ward_id uuid,
  constituency character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  aadhaar_number character varying UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.call_contexts (
  call_sid text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT call_contexts_pkey PRIMARY KEY (call_sid)
);

CREATE TABLE public.schemes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  department character varying NOT NULL,
  description text NOT NULL,
  eligibility_criteria text,
  benefits text,
  category character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schemes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.grievances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tracking_id character varying NOT NULL UNIQUE,
  citizen_id uuid NOT NULL,
  officer_id uuid,
  department_id uuid,
  ward_id uuid,
  title character varying NOT NULL,
  description text NOT NULL,
  language character varying NOT NULL DEFAULT 'en'::character varying,
  status public.ticket_status NOT NULL DEFAULT 'open'::public.ticket_status,
  priority public.ticket_priority NOT NULL DEFAULT 'medium'::public.ticket_priority,
  ai_category character varying,
  ai_sentiment public.sentiment,
  ai_confidence double precision,
  channel character varying NOT NULL DEFAULT 'web'::character varying,
  resolution_note text,
  sla_deadline timestamp with time zone,
  resolved_at timestamp with time zone,
  escalated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  photo_url text,
  before_photo_url text,
  after_photo_url text,
  escalation_level integer DEFAULT 0,
  location text,
  CONSTRAINT grievances_pkey PRIMARY KEY (id),
  CONSTRAINT grievances_citizen_id_fkey FOREIGN KEY (citizen_id) REFERENCES public.users (id),
  CONSTRAINT grievances_officer_id_fkey FOREIGN KEY (officer_id) REFERENCES public.users (id),
  CONSTRAINT grievances_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id),
  CONSTRAINT grievances_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards (id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  body text,
  type character varying NOT NULL DEFAULT 'info'::character varying,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id)
);

CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time without time zone,
  location character varying,
  event_type character varying DEFAULT 'meeting'::character varying,
  ai_brief text,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id)
);

CREATE TABLE public.sentiment_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ward_id uuid,
  source character varying NOT NULL DEFAULT 'twitter'::character varying,
  raw_text text NOT NULL,
  language character varying NOT NULL DEFAULT 'en'::character varying,
  sentiment public.sentiment,
  sentiment_score double precision,
  topics text[],
  collected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sentiment_posts_pkey PRIMARY KEY (id),
  CONSTRAINT sentiment_posts_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards (id)
);

CREATE TABLE public.ticket_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grievance_id uuid NOT NULL,
  actor_id uuid,
  action character varying NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_logs_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_logs_grievance_id_fkey FOREIGN KEY (grievance_id) REFERENCES public.grievances (id),
  CONSTRAINT ticket_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users (id)
);

CREATE TABLE public.ward_sentiment_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL,
  score double precision NOT NULL,
  label public.sentiment,
  top_issues text[],
  post_count integer DEFAULT 0,
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ward_sentiment_scores_pkey PRIMARY KEY (id),
  CONSTRAINT ward_sentiment_scores_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards (id)
);
