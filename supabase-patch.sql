-- ══════════════════════════════════════════════════════════════════
-- COFFEE STREET — Supabase Schema Patch
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run multiple times (all statements are idempotent)
-- ══════════════════════════════════════════════════════════════════

-- ── Extensions ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums (safe to re-run) ──
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('barista', 'manager', 'owner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('Cash', 'QRIS', 'E-Wallet'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stock_status AS ENUM ('Normal', 'Warning', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE attendance_status AS ENUM ('Hadir', 'Terlambat', 'Absen'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payroll_status AS ENUM ('Sudah Dibayar', 'Belum Dibayar'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE purchase_status AS ENUM ('Menunggu', 'Diterima', 'Dibatalkan'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_category AS ENUM ('coffee', 'non-coffee', 'snack'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('low_stock', 'critical_stock', 'payroll', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Helper: auto-update updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────
-- TABLE: profiles
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  role             user_role NOT NULL DEFAULT 'barista',
  avatar_initials  TEXT NOT NULL DEFAULT '',
  hourly_rate      NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- TABLE: products
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  category      product_category NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '☕',
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- TABLE: inventory  ← The table the error refers to
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Bahan Baku',
  available  NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (available >= 0),
  unit       TEXT NOT NULL DEFAULT 'kg',
  min_stock  NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  status     stock_status NOT NULL DEFAULT 'Normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION compute_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.available = 0 OR NEW.available < (NEW.min_stock * 0.5) THEN
    NEW.status := 'Critical';
  ELSIF NEW.available < NEW.min_stock THEN
    NEW.status := 'Warning';
  ELSE
    NEW.status := 'Normal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_status ON public.inventory;
CREATE TRIGGER trg_inventory_status
  BEFORE INSERT OR UPDATE OF available, min_stock ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION compute_stock_status();

-- ──────────────────────────────────────────────
-- TABLE: suppliers
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  contact_person TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLE: purchases + purchase_items
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id  UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  ordered_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status       purchase_status NOT NULL DEFAULT 'Menunggu',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_purchases_updated_at ON public.purchases;
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id  UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  quantity     NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Auto-increase stock when PO is accepted
CREATE OR REPLACE FUNCTION handle_purchase_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Diterima' AND OLD.status != 'Diterima' THEN
    UPDATE public.inventory i
    SET available = i.available + pi.quantity
    FROM public.purchase_items pi
    WHERE pi.purchase_id = NEW.id AND pi.inventory_id = i.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_purchase_received ON public.purchases;
CREATE TRIGGER trg_purchase_received
  AFTER UPDATE OF status ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION handle_purchase_received();

-- ──────────────────────────────────────────────
-- TABLE: transactions + transaction_items
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payment_method payment_method NOT NULL DEFAULT 'Cash',
  subtotal       NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax            NUMERIC(14,2) NOT NULL DEFAULT 0,
  total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_received  NUMERIC(14,2),
  change_amount  NUMERIC(14,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(12,2) NOT NULL,
  total_price    NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ──────────────────────────────────────────────
-- TABLE: attendance
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  time_in      TIME,
  time_out     TIME,
  status       attendance_status NOT NULL DEFAULT 'Absen',
  work_hours   NUMERIC(5,2),
  late_minutes INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, date)
);
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION compute_attendance_stats()
RETURNS TRIGGER AS $$
DECLARE shift_start TIME := '08:00:00'; BEGIN
  IF NEW.time_in IS NOT NULL AND NEW.time_out IS NOT NULL THEN
    NEW.work_hours := EXTRACT(EPOCH FROM (NEW.time_out - NEW.time_in)) / 3600.0;
  END IF;
  IF NEW.time_in IS NOT NULL THEN
    NEW.late_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NEW.time_in - shift_start))::INTEGER / 60);
  END IF;
  IF NEW.time_in IS NULL THEN NEW.status := 'Absen';
  ELSIF NEW.late_minutes > 15 THEN NEW.status := 'Terlambat';
  ELSE NEW.status := 'Hadir';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_stats ON public.attendance;
CREATE TRIGGER trg_attendance_stats
  BEFORE INSERT OR UPDATE OF time_in, time_out ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_stats();

-- ──────────────────────────────────────────────
-- TABLE: payroll
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  hours_worked  NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate   NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_salary  NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions    NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_salary    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        payroll_status NOT NULL DEFAULT 'Belum Dibayar',
  paid_at       TIMESTAMPTZ,
  processed_by  UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, period_start, period_end)
);
DROP TRIGGER IF EXISTS trg_payroll_updated_at ON public.payroll;
CREATE TRIGGER trg_payroll_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION compute_payroll_salary()
RETURNS TRIGGER AS $$
BEGIN NEW.gross_salary := NEW.hours_worked * NEW.hourly_rate; NEW.net_salary := NEW.gross_salary - NEW.deductions; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_salary ON public.payroll;
CREATE TRIGGER trg_payroll_salary
  BEFORE INSERT OR UPDATE OF hours_worked, hourly_rate, deductions ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION compute_payroll_salary();

-- ──────────────────────────────────────────────
-- TABLE: notifications
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         notification_type NOT NULL,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  target_role  TEXT NOT NULL DEFAULT 'all',
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
-- GRANTS  (required so PostgREST can see the tables)
-- ══════════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — permissive for demo mode
-- (All reads open; writes open for anon so demo users can CRUD)
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies so we can recreate cleanly
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename); END LOOP;
END $$;

-- Open policies — allow all operations for any caller (demo-safe)
CREATE POLICY "open_all" ON public.profiles        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.products        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.inventory       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.suppliers       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.purchases       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.purchase_items  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.transactions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.attendance      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.payroll         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.notifications   FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- SEED DATA (safe — only inserts if rows don't already exist)
-- ══════════════════════════════════════════════════════════════════
INSERT INTO public.products (name, price, category, emoji, stock) VALUES
  ('Espresso',       25000, 'coffee',     '☕', 50),
  ('Cappuccino',     35000, 'coffee',     '☕', 45),
  ('Caramel Latte',  38000, 'coffee',     '☕', 40),
  ('Americano',      28000, 'coffee',     '☕', 55),
  ('Flat White',     33000, 'coffee',     '☕', 30),
  ('Cold Brew',      40000, 'coffee',     '🧊', 25),
  ('Matcha Latte',   38000, 'non-coffee', '🍵', 35),
  ('Chocolate Milk', 30000, 'non-coffee', '🍫', 40),
  ('Taro Latte',     36000, 'non-coffee', '🥤', 28),
  ('Lemon Tea',      25000, 'non-coffee', '🍋', 50),
  ('Croissant',      22000, 'snack',      '🥐', 20),
  ('Cheese Cake',    35000, 'snack',      '🍰', 15),
  ('Banana Bread',   28000, 'snack',      '🍞', 18),
  ('Club Sandwich',  45000, 'snack',      '🥪', 12)
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory (name, category, available, unit, min_stock) VALUES
  ('Biji Kopi Arabika', 'Bahan Baku', 5,   'kg',    10),
  ('Susu Full Cream',   'Bahan Baku', 15,  'liter', 20),
  ('Gula Pasir',        'Bahan Baku', 8,   'kg',    5),
  ('Sirup Karamel',     'Sirup',      3,   'botol', 5),
  ('Powder Matcha',     'Bahan Baku', 2,   'kg',    3),
  ('Powder Coklat',     'Bahan Baku', 6,   'kg',    5),
  ('Cup 12oz',          'Kemasan',    500, 'pcs',   200),
  ('Cup 16oz',          'Kemasan',    180, 'pcs',   200),
  ('Sedotan',           'Kemasan',    800, 'pcs',   300),
  ('Tisu Meja',         'Lain-lain',  50,  'pack',  20)
ON CONFLICT DO NOTHING;

INSERT INTO public.suppliers (name, contact_person, phone) VALUES
  ('PT. Kopi Nusantara',     'Bapak Hendra',  '081234567890'),
  ('CV. Susu Segar Mandiri', 'Ibu Ratna',     '082345678901'),
  ('UD. Bahan Kemasan Jaya', 'Bapak Darmadi', '083456789012'),
  ('Toko Bahan Kopi Utama',  'Bapak Joko',    '084567890123')
ON CONFLICT DO NOTHING;
