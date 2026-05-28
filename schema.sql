-- ══════════════════════════════════════════════════════════════════
-- COFFEE STREET MANAGEMENT SYSTEM — Complete Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ══════════════════════════════════════════════════════════════════

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('barista', 'manager', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('Cash', 'QRIS', 'E-Wallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM ('Normal', 'Warning', 'Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('Hadir', 'Terlambat', 'Absen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM ('Sudah Dibayar', 'Belum Dibayar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_status AS ENUM ('Menunggu', 'Diterima', 'Dibatalkan');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_category AS ENUM ('coffee', 'non-coffee', 'snack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('low_stock', 'critical_stock', 'payroll', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- HELPER FUNCTION: auto-update updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- TABLE: profiles
-- Extends Supabase auth.users with role & payroll info
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  role             user_role NOT NULL DEFAULT 'barista',
  avatar_initials  TEXT NOT NULL DEFAULT '',
  hourly_rate      NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'barista'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_initials', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- TABLE: products
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
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

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- TABLE: inventory (raw materials)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
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

CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-compute stock status when available/min_stock changes
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

CREATE TRIGGER trg_inventory_status
  BEFORE INSERT OR UPDATE OF available, min_stock ON inventory
  FOR EACH ROW EXECUTE FUNCTION compute_stock_status();

-- ─────────────────────────────────────────────
-- TABLE: suppliers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  contact_person TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: purchases + purchase_items
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  ordered_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status       purchase_status NOT NULL DEFAULT 'Menunggu',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS purchase_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id  UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  quantity     NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price  NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

-- When purchase is marked 'Diterima', add stock to inventory
CREATE OR REPLACE FUNCTION handle_purchase_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Diterima' AND OLD.status != 'Diterima' THEN
    UPDATE inventory i
    SET available = i.available + pi.quantity
    FROM purchase_items pi
    WHERE pi.purchase_id = NEW.id AND pi.inventory_id = i.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_purchase_received
  AFTER UPDATE OF status ON purchases
  FOR EACH ROW EXECUTE FUNCTION handle_purchase_received();

-- ─────────────────────────────────────────────
-- TABLE: transactions + transaction_items
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  payment_method payment_method NOT NULL DEFAULT 'Cash',
  subtotal       NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax            NUMERIC(14,2) NOT NULL DEFAULT 0,
  total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_received  NUMERIC(14,2),
  change_amount  NUMERIC(14,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(DATE(created_at));

CREATE TABLE IF NOT EXISTS transaction_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(12,2) NOT NULL,
  total_price    NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);

-- Auto-reduce product stock after transaction
CREATE OR REPLACE FUNCTION reduce_product_stock_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET stock = GREATEST(0, stock - NEW.quantity)
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reduce_stock
  AFTER INSERT ON transaction_items
  FOR EACH ROW EXECUTE FUNCTION reduce_product_stock_after_transaction();

-- Auto-generate low-stock notification when product stock drops low
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock < 10 AND OLD.stock >= 10 THEN
    INSERT INTO notifications (type, title, message, target_role, reference_id)
    VALUES (
      CASE WHEN NEW.stock < 5 THEN 'critical_stock' ELSE 'low_stock' END,
      CASE WHEN NEW.stock < 5 THEN 'Stok Kritis: ' || NEW.name ELSE 'Stok Menipis: ' || NEW.name END,
      'Sisa stok ' || NEW.name || ': ' || NEW.stock || ' porsi. Segera restok.',
      'manager',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_low_stock_notification
  AFTER UPDATE OF stock ON products
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- ─────────────────────────────────────────────
-- TABLE: attendance
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-compute work_hours, late_minutes, and status on check-out
CREATE OR REPLACE FUNCTION compute_attendance_stats()
RETURNS TRIGGER AS $$
DECLARE
  shift_start TIME := '08:00:00';
  late_threshold INTEGER := 15; -- minutes
BEGIN
  -- Compute work_hours when time_out is set
  IF NEW.time_in IS NOT NULL AND NEW.time_out IS NOT NULL THEN
    NEW.work_hours := EXTRACT(EPOCH FROM (NEW.time_out - NEW.time_in)) / 3600.0;
  END IF;

  -- Compute late_minutes
  IF NEW.time_in IS NOT NULL THEN
    NEW.late_minutes := GREATEST(0,
      EXTRACT(EPOCH FROM (NEW.time_in - shift_start))::INTEGER / 60
    );
  END IF;

  -- Derive attendance status
  IF NEW.time_in IS NULL THEN
    NEW.status := 'Absen';
  ELSIF NEW.late_minutes > late_threshold THEN
    NEW.status := 'Terlambat';
  ELSE
    NEW.status := 'Hadir';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_stats
  BEFORE INSERT OR UPDATE OF time_in, time_out ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_stats();

-- ─────────────────────────────────────────────
-- TABLE: payroll
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  hours_worked  NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate   NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_salary  NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions    NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_salary    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        payroll_status NOT NULL DEFAULT 'Belum Dibayar',
  paid_at       TIMESTAMPTZ,
  processed_by  UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);

CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-compute gross/net salary from hours × rate
CREATE OR REPLACE FUNCTION compute_payroll_salary()
RETURNS TRIGGER AS $$
BEGIN
  NEW.gross_salary := NEW.hours_worked * NEW.hourly_rate;
  NEW.net_salary   := NEW.gross_salary - NEW.deductions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payroll_salary
  BEFORE INSERT OR UPDATE OF hours_worked, hourly_rate, deductions ON payroll
  FOR EACH ROW EXECUTE FUNCTION compute_payroll_salary();

-- Mark paid_at when status changes to 'Sudah Dibayar'
CREATE OR REPLACE FUNCTION handle_payroll_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Sudah Dibayar' AND OLD.status = 'Belum Dibayar' THEN
    NEW.paid_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payroll_paid
  BEFORE UPDATE OF status ON payroll
  FOR EACH ROW EXECUTE FUNCTION handle_payroll_paid();

-- ─────────────────────────────────────────────
-- TABLE: notifications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         notification_type NOT NULL,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  target_role  TEXT NOT NULL DEFAULT 'all',
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── profiles ──
CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Owner/manager can update any profile" ON profiles FOR UPDATE USING (current_user_role() IN ('owner', 'manager'));

-- ── products ──
CREATE POLICY "All authenticated can read products" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manager/owner can modify products" ON products FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── inventory ──
CREATE POLICY "All authenticated can read inventory" ON inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manager/owner can modify inventory" ON inventory FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── suppliers ──
CREATE POLICY "All authenticated can read suppliers" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manager/owner can modify suppliers" ON suppliers FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── purchases ──
CREATE POLICY "Manager/owner can read purchases" ON purchases FOR SELECT USING (current_user_role() IN ('manager', 'owner'));
CREATE POLICY "Manager/owner can modify purchases" ON purchases FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── purchase_items ──
CREATE POLICY "Manager/owner can manage purchase items" ON purchase_items FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── transactions ──
CREATE POLICY "All authenticated can insert transactions" ON transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Barista can read own transactions" ON transactions FOR SELECT USING (cashier_id = auth.uid() OR current_user_role() IN ('manager', 'owner'));
CREATE POLICY "Manager/owner can read all transactions" ON transactions FOR SELECT USING (current_user_role() IN ('manager', 'owner'));

-- ── transaction_items ──
CREATE POLICY "All authenticated can insert transaction items" ON transaction_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated can read transaction items" ON transaction_items FOR SELECT USING (auth.role() = 'authenticated');

-- ── attendance ──
CREATE POLICY "Employees can manage own attendance" ON attendance FOR ALL USING (employee_id = auth.uid());
CREATE POLICY "Manager/owner can read all attendance" ON attendance FOR SELECT USING (current_user_role() IN ('manager', 'owner'));
CREATE POLICY "Manager/owner can modify any attendance" ON attendance FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── payroll ──
CREATE POLICY "Employees can read own payroll" ON payroll FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "Manager/owner can manage payroll" ON payroll FOR ALL USING (current_user_role() IN ('manager', 'owner'));

-- ── notifications ──
CREATE POLICY "Read own-role notifications" ON notifications FOR SELECT
  USING (target_role = 'all' OR target_role = current_user_role()::text);
CREATE POLICY "Manager/owner can create notifications" ON notifications FOR INSERT
  WITH CHECK (current_user_role() IN ('manager', 'owner'));
CREATE POLICY "Users can mark notifications read" ON notifications FOR UPDATE
  USING (target_role = 'all' OR target_role = current_user_role()::text);

-- ══════════════════════════════════════════════════════════════════
-- SEED DATA
-- ══════════════════════════════════════════════════════════════════

-- Products
INSERT INTO products (name, price, category, emoji, stock) VALUES
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

-- Inventory
INSERT INTO inventory (name, category, available, unit, min_stock) VALUES
  ('Biji Kopi Arabika',  'Bahan Baku', 5,   'kg',    10),
  ('Susu Full Cream',    'Bahan Baku', 15,  'liter', 20),
  ('Gula Pasir',         'Bahan Baku', 8,   'kg',    5),
  ('Sirup Karamel',      'Sirup',      3,   'botol', 5),
  ('Powder Matcha',      'Bahan Baku', 2,   'kg',    3),
  ('Powder Coklat',      'Bahan Baku', 6,   'kg',    5),
  ('Cup 12oz',           'Kemasan',    500, 'pcs',   200),
  ('Cup 16oz',           'Kemasan',    180, 'pcs',   200),
  ('Sedotan',            'Kemasan',    800, 'pcs',   300),
  ('Tisu Meja',          'Lain-lain',  50,  'pack',  20)
ON CONFLICT DO NOTHING;

-- Suppliers
INSERT INTO suppliers (name, contact_person, phone) VALUES
  ('PT. Kopi Nusantara',       'Bapak Hendra',  '081234567890'),
  ('CV. Susu Segar Mandiri',   'Ibu Ratna',     '082345678901'),
  ('UD. Bahan Kemasan Jaya',   'Bapak Darmadi', '083456789012'),
  ('Toko Bahan Kopi Utama',    'Bapak Joko',    '084567890123')
ON CONFLICT DO NOTHING;

-- Initial low-stock notifications
INSERT INTO notifications (type, title, message, target_role, reference_id)
SELECT
  CASE WHEN status = 'Critical' THEN 'critical_stock' ELSE 'low_stock' END,
  CASE WHEN status = 'Critical' THEN 'Stok Kritis: ' || name ELSE 'Stok Menipis: ' || name END,
  'Sisa ' || available || ' ' || unit || '. Segera restok.',
  'manager',
  id::text
FROM inventory
WHERE status IN ('Critical', 'Warning')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- VIEWS for dashboard analytics
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW daily_revenue AS
SELECT
  DATE(created_at) AS date,
  COUNT(*)          AS transaction_count,
  SUM(subtotal)     AS subtotal,
  SUM(tax)          AS tax_collected,
  SUM(total)        AS total_revenue
FROM transactions
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  TO_CHAR(created_at, 'Mon')      AS month_label,
  COUNT(*)                         AS transaction_count,
  SUM(total)                       AS total_revenue
FROM transactions
GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon')
ORDER BY month DESC;

CREATE OR REPLACE VIEW monthly_expenses AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  TO_CHAR(created_at, 'Mon')      AS month_label,
  SUM(total_amount)                AS total_expense
FROM purchases
WHERE status = 'Diterima'
GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon')
ORDER BY month DESC;

-- ══════════════════════════════════════════════════════════════════
-- DEMO USERS (create these in Supabase Auth → Authentication → Users)
-- Then run the UPDATE below to set their roles
-- ══════════════════════════════════════════════════════════════════
-- After creating users via Supabase Dashboard or Auth API, run:
--
-- UPDATE profiles SET role = 'owner',   full_name = 'Pak Budi Santosa',   avatar_initials = 'BS', hourly_rate = 0     WHERE id = '<owner-user-uuid>';
-- UPDATE profiles SET role = 'manager', full_name = 'Ahmad Fauzi',         avatar_initials = 'AF', hourly_rate = 20000 WHERE id = '<manager-user-uuid>';
-- UPDATE profiles SET role = 'barista', full_name = 'Rizky Pratama',       avatar_initials = 'RP', hourly_rate = 15000 WHERE id = '<barista-user-uuid>';
-- UPDATE profiles SET role = 'barista', full_name = 'Sari Dewi',           avatar_initials = 'SD', hourly_rate = 14000 WHERE id = '<kasir-user-uuid>';
