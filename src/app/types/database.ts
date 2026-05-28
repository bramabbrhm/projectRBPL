// ─────────────────────────────────────────────
// Database types aligned with Supabase schema
// ─────────────────────────────────────────────

export type UserRole = 'barista' | 'manager' | 'owner';
export type PaymentMethod = 'Cash' | 'QRIS' | 'E-Wallet';
export type StockStatus = 'Normal' | 'Warning' | 'Critical';
export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Absen';
export type PayrollStatus = 'Sudah Dibayar' | 'Belum Dibayar';
export type PurchaseStatus = 'Menunggu' | 'Diterima' | 'Dibatalkan';
export type ProductCategory = 'coffee' | 'non-coffee' | 'snack';
export type NotificationType = 'low_stock' | 'critical_stock' | 'payroll' | 'system';

// ── Profiles (extends auth.users) ──
export interface Profile {
  id: string;                 // uuid matches auth.users.id
  full_name: string;
  role: UserRole;
  avatar_initials: string;
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Categories ──
export interface Category {
  id: string;
  name: string;
  slug: ProductCategory;
  created_at: string;
}

// ── Products ──
export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  emoji: string;
  stock: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// ── Inventory (raw materials) ──
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  available: number;
  unit: string;
  min_stock: number;
  status: StockStatus;
  created_at: string;
  updated_at: string;
}

// ── Suppliers ──
export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Purchases ──
export interface Purchase {
  id: string;
  supplier_id: string;
  supplier?: Supplier;
  ordered_by: string;
  ordered_by_profile?: Profile;
  total_amount: number;
  status: PurchaseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  inventory_id: string;
  inventory?: InventoryItem;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ── Transactions ──
export interface Transaction {
  id: string;
  cashier_id: string;
  cashier?: Profile;
  payment_method: PaymentMethod;
  subtotal: number;
  tax: number;
  total: number;
  cash_received: number | null;
  change_amount: number | null;
  notes: string | null;
  created_at: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product?: Product;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ── Attendance ──
export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee?: Profile;
  date: string;            // ISO date YYYY-MM-DD
  time_in: string | null;  // HH:MM:SS
  time_out: string | null;
  status: AttendanceStatus;
  work_hours: number | null;
  late_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// ── Payroll ──
export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee?: Profile;
  period_start: string;   // ISO date
  period_end: string;
  hours_worked: number;
  hourly_rate: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: PayrollStatus;
  paid_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Notifications ──
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  target_role: UserRole | 'all';
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
}

// ── Dashboard analytics DTOs ──
export interface DashboardStats {
  revenue_today: number;
  revenue_month: number;
  expense_month: number;
  profit_month: number;
  transactions_today: number;
  transactions_month: number;
  critical_stock_count: number;
  warning_stock_count: number;
  pending_payroll_count: number;
}

export interface MonthlyChartData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

// ── API response wrapper ──
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}
