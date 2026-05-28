export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'coffee' | 'non-coffee' | 'snack';
  emoji: string;
  stock: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  available: number;
  unit: string;
  minStock: number;
  status: 'Normal' | 'Warning' | 'Critical';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  hoursWorked: number;
  hourlyRate: number;
  paidStatus: 'Sudah Dibayar' | 'Belum Dibayar';
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  paymentMethod: 'Cash' | 'QRIS' | 'E-Wallet';
  cashier: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  status: 'Hadir' | 'Terlambat' | 'Absen';
}

export const products: Product[] = [
  { id: 'p1', name: 'Espresso', price: 25000, category: 'coffee', emoji: '☕', stock: 50 },
  { id: 'p2', name: 'Cappuccino', price: 35000, category: 'coffee', emoji: '☕', stock: 45 },
  { id: 'p3', name: 'Caramel Latte', price: 38000, category: 'coffee', emoji: '☕', stock: 40 },
  { id: 'p4', name: 'Americano', price: 28000, category: 'coffee', emoji: '☕', stock: 55 },
  { id: 'p5', name: 'Flat White', price: 33000, category: 'coffee', emoji: '☕', stock: 30 },
  { id: 'p6', name: 'Cold Brew', price: 40000, category: 'coffee', emoji: '🧊', stock: 25 },
  { id: 'p7', name: 'Matcha Latte', price: 38000, category: 'non-coffee', emoji: '🍵', stock: 35 },
  { id: 'p8', name: 'Chocolate Milk', price: 30000, category: 'non-coffee', emoji: '🍫', stock: 40 },
  { id: 'p9', name: 'Taro Latte', price: 36000, category: 'non-coffee', emoji: '🥤', stock: 28 },
  { id: 'p10', name: 'Lemon Tea', price: 25000, category: 'non-coffee', emoji: '🍋', stock: 50 },
  { id: 'p11', name: 'Croissant', price: 22000, category: 'snack', emoji: '🥐', stock: 20 },
  { id: 'p12', name: 'Cheese Cake', price: 35000, category: 'snack', emoji: '🍰', stock: 15 },
  { id: 'p13', name: 'Banana Bread', price: 28000, category: 'snack', emoji: '🍞', stock: 18 },
  { id: 'p14', name: 'Club Sandwich', price: 45000, category: 'snack', emoji: '🥪', stock: 12 },
];

export const stockItems: StockItem[] = [
  { id: 's1', name: 'Biji Kopi Arabika', category: 'Bahan Baku', available: 5, unit: 'kg', minStock: 10, status: 'Critical' },
  { id: 's2', name: 'Susu Full Cream', category: 'Bahan Baku', available: 15, unit: 'liter', minStock: 20, status: 'Warning' },
  { id: 's3', name: 'Gula Pasir', category: 'Bahan Baku', available: 8, unit: 'kg', minStock: 5, status: 'Normal' },
  { id: 's4', name: 'Sirup Karamel', category: 'Sirup', available: 3, unit: 'botol', minStock: 5, status: 'Warning' },
  { id: 's5', name: 'Powder Matcha', category: 'Bahan Baku', available: 2, unit: 'kg', minStock: 3, status: 'Warning' },
  { id: 's6', name: 'Powder Coklat', category: 'Bahan Baku', available: 6, unit: 'kg', minStock: 5, status: 'Normal' },
  { id: 's7', name: 'Cup 12oz', category: 'Kemasan', available: 500, unit: 'pcs', minStock: 200, status: 'Normal' },
  { id: 's8', name: 'Cup 16oz', category: 'Kemasan', available: 180, unit: 'pcs', minStock: 200, status: 'Warning' },
  { id: 's9', name: 'Sedotan', category: 'Kemasan', available: 800, unit: 'pcs', minStock: 300, status: 'Normal' },
  { id: 's10', name: 'Tisu Meja', category: 'Lain-lain', available: 50, unit: 'pack', minStock: 20, status: 'Normal' },
];

export const employees: Employee[] = [
  { id: 'e1', name: 'Rizky Pratama', role: 'Barista', hoursWorked: 168, hourlyRate: 15000, paidStatus: 'Sudah Dibayar' },
  { id: 'e2', name: 'Sari Dewi', role: 'Kasir', hoursWorked: 160, hourlyRate: 14000, paidStatus: 'Belum Dibayar' },
  { id: 'e3', name: 'Budi Santoso', role: 'Barista', hoursWorked: 176, hourlyRate: 15000, paidStatus: 'Belum Dibayar' },
  { id: 'e4', name: 'Dina Marlina', role: 'Kasir', hoursWorked: 152, hourlyRate: 14000, paidStatus: 'Belum Dibayar' },
  { id: 'e5', name: 'Hendra Wijaya', role: 'Barista', hoursWorked: 168, hourlyRate: 15000, paidStatus: 'Sudah Dibayar' },
];

export const transactions: Transaction[] = [
  {
    id: 'T001',
    date: '25/02/2026',
    time: '08:15',
    items: [{ name: 'Cappuccino', qty: 2, price: 35000 }, { name: 'Croissant', qty: 1, price: 22000 }],
    total: 92000,
    paymentMethod: 'QRIS',
    cashier: 'Rizky Pratama',
  },
  {
    id: 'T002',
    date: '25/02/2026',
    time: '09:30',
    items: [{ name: 'Caramel Latte', qty: 1, price: 38000 }, { name: 'Cheese Cake', qty: 1, price: 35000 }],
    total: 73000,
    paymentMethod: 'Cash',
    cashier: 'Sari Dewi',
  },
  {
    id: 'T003',
    date: '25/02/2026',
    time: '10:45',
    items: [{ name: 'Americano', qty: 3, price: 28000 }],
    total: 84000,
    paymentMethod: 'E-Wallet',
    cashier: 'Rizky Pratama',
  },
  {
    id: 'T004',
    date: '25/02/2026',
    time: '11:20',
    items: [{ name: 'Matcha Latte', qty: 2, price: 38000 }, { name: 'Banana Bread', qty: 2, price: 28000 }],
    total: 132000,
    paymentMethod: 'QRIS',
    cashier: 'Budi Santoso',
  },
  {
    id: 'T005',
    date: '25/02/2026',
    time: '12:30',
    items: [{ name: 'Cold Brew', qty: 1, price: 40000 }, { name: 'Club Sandwich', qty: 1, price: 45000 }],
    total: 85000,
    paymentMethod: 'Cash',
    cashier: 'Sari Dewi',
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: 'a1', date: '25/02/2026', timeIn: '07:55', timeOut: '16:02', status: 'Hadir' },
  { id: 'a2', date: '24/02/2026', timeIn: '08:10', timeOut: '16:15', status: 'Terlambat' },
  { id: 'a3', date: '23/02/2026', timeIn: '07:58', timeOut: '16:00', status: 'Hadir' },
  { id: 'a4', date: '22/02/2026', timeIn: '07:50', timeOut: '16:05', status: 'Hadir' },
  { id: 'a5', date: '21/02/2026', timeIn: '-', timeOut: '-', status: 'Absen' },
  { id: 'a6', date: '20/02/2026', timeIn: '08:00', timeOut: '16:00', status: 'Hadir' },
  { id: 'a7', date: '19/02/2026', timeIn: '07:55', timeOut: '16:10', status: 'Hadir' },
];

export const monthlyRevenue = [
  { month: 'Agu', revenue: 28500000, expense: 12000000, profit: 16500000 },
  { month: 'Sep', revenue: 31200000, expense: 13500000, profit: 17700000 },
  { month: 'Okt', revenue: 29800000, expense: 11800000, profit: 18000000 },
  { month: 'Nov', revenue: 35600000, expense: 14200000, profit: 21400000 },
  { month: 'Des', revenue: 42100000, expense: 16800000, profit: 25300000 },
  { month: 'Jan', revenue: 38700000, expense: 15300000, profit: 23400000 },
  { month: 'Feb', revenue: 41500000, expense: 16100000, profit: 25400000 },
];

export const suppliers = [
  { id: 'sup1', name: 'PT. Kopi Nusantara' },
  { id: 'sup2', name: 'CV. Susu Segar Mandiri' },
  { id: 'sup3', name: 'UD. Bahan Kemasan Jaya' },
  { id: 'sup4', name: 'Toko Bahan Kopi Utama' },
];

export const formatRupiah = (amount: number): string => {
  return `Rp ${amount.toLocaleString('id-ID')}`;
};
