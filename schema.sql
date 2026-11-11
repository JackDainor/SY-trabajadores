-- SY CROP – Trabajadores · esquema Neon (PostgreSQL)
-- Ejecutar una vez en la consola SQL de Neon o con: npm run db:setup

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Precios globales (admin puede cambiar)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('precio_prenda', '1.40'),
  ('precio_recta', '1.00'),
  ('precio_over', '0.40')
ON CONFLICT (key) DO NOTHING;

-- Usuarios (admin o trabajador). PIN numérico hasheado.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  pin_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  skip_confirm BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipos: unidad (pareja, 1 login) o por_maquina (grupo 3, roles fijos)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pay_mode TEXT NOT NULL CHECK (pay_mode IN ('unidad', 'por_maquina')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros del equipo. role_machine solo aplica en por_maquina: recta | over
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_machine TEXT CHECK (role_machine IS NULL OR role_machine IN ('recta', 'over')),
  UNIQUE (team_id, user_id)
);

-- Proveedores (solo admin crea; trabajadores eligen)
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cortes / producción registrada por trabajadores
CREATE TABLE IF NOT EXISTS cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  registered_by UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  title TEXT NOT NULL,
  photo_data TEXT,
  pieces INTEGER NOT NULL CHECK (pieces >= 0),
  defects INTEGER NOT NULL DEFAULT 0 CHECK (defects >= 0),
  valid_pieces INTEGER NOT NULL CHECK (valid_pieces >= 0),
  -- desglose opcional por color (JSON: [{"color":"negro","qty":10},...])
  colors JSONB,
  notes TEXT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
  void_reason TEXT,
  voided_by UUID REFERENCES users(id),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuts_team_date ON cuts(team_id, work_date);
CREATE INDEX IF NOT EXISTS idx_cuts_created ON cuts(created_at DESC);

-- Vales / adelantos
-- team_id obligatorio; user_id NULL = vale del equipo (modo unidad)
-- user_id relleno = vale personal (modo por_maquina)
CREATE TABLE IF NOT EXISTS vales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  vale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vales_team_date ON vales(team_id, vale_date);
