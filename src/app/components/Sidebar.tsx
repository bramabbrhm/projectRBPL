import { ComponentType, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, ShoppingCart, Printer, Clock, CreditCard,
  Package, ShoppingBag, Users, BarChart2, LogOut,
  Coffee, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { inventoryService } from '../services/inventoryService';

const MENU_BY_ROLE: Record<UserRole, { label: string; icon: ComponentType<{ size?: number; className?: string }>; path: string }[]> = {
  barista: [
    { label: 'Dashboard',    icon: LayoutDashboard, path: '/app/dashboard' },
    { label: 'Transaksi',    icon: ShoppingCart,    path: '/app/pos' },
    { label: 'Cetak Struk',  icon: Printer,         path: '/app/receipt' },
    { label: 'Absensi',      icon: Clock,           path: '/app/attendance' },
    { label: 'Paycheck',     icon: CreditCard,      path: '/app/paycheck' },
  ],
  manager: [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/app/dashboard' },
    { label: 'Monitoring Stok', icon: Package,         path: '/app/stock' },
    { label: 'Pembelian',       icon: ShoppingBag,     path: '/app/purchase' },
    { label: 'Payroll',         icon: Users,           path: '/app/payroll' },
    { label: 'Laporan',         icon: BarChart2,        path: '/app/reports' },
  ],
  owner: [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/app/dashboard' },
    { label: 'Laporan Keuangan',icon: BarChart2,        path: '/app/reports' },
    { label: 'Monitoring Stok', icon: Package,         path: '/app/stock' },
    { label: 'Pembelian',       icon: ShoppingBag,     path: '/app/purchase' },
    { label: 'Payroll',         icon: Users,           path: '/app/payroll' },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  barista: 'Karyawan / Barista',
  manager: 'Manager',
  owner: 'Owner',
};

const ROLE_COLOR: Record<UserRole, string> = {
  barista: '#C19A6B',
  manager: '#FFD700',
  owner:   '#FFD700',
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [criticalCount, setCriticalCount] = useState(0);

  useEffect(() => {
    inventoryService.getStockCounts().then(counts => {
      setCriticalCount(counts.critical + counts.warning);
    });
  }, []);

  if (!user) return null;

  const menu = MENU_BY_ROLE[user.role] || [];

  return (
    <aside
      className="flex flex-col h-screen fixed left-0 top-0 w-64 z-40"
      style={{ background: 'linear-gradient(180deg, #5C3D2E 0%, #6F4E37 60%, #7D5945 100%)', fontFamily: 'Montserrat, sans-serif' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFD700' }}>
          <Coffee size={22} style={{ color: '#6F4E37' }} />
        </div>
        <div>
          <div className="text-white text-sm font-bold tracking-wide leading-tight">Coffee Street</div>
          <div className="text-xs leading-tight" style={{ color: '#C19A6B' }}>Management System</div>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: ROLE_COLOR[user.role], color: '#6F4E37' }}>
            {user.avatar}
          </div>
          <div>
            <div className="text-white text-xs font-semibold leading-tight">{user.name}</div>
            <div className="text-xs" style={{ color: '#C19A6B' }}>{ROLE_LABEL[user.role]}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto">
        <div className="text-xs font-semibold px-2 mb-2 uppercase tracking-widest" style={{ color: 'rgba(193,154,107,0.7)' }}>
          Menu
        </div>
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-150 group"
              style={{
                background: isActive ? 'rgba(255,215,0,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #FFD700' : '3px solid transparent',
              }}
            >
              <Icon
                size={18}
                className="flex-shrink-0"
                style={{ color: isActive ? '#FFD700' : 'rgba(255,255,255,0.7)' }}
              />
              <span className="text-sm flex-1"
                style={{ color: isActive ? '#FFD700' : 'rgba(255,255,255,0.85)', fontWeight: isActive ? 600 : 400 }}>
                {item.label}
              </span>
              {isActive && <ChevronRight size={14} style={{ color: '#FFD700' }} />}
              {item.label === 'Monitoring Stok' && criticalCount > 0 && !isActive && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: '#ef4444', color: 'white' }}>
                  {criticalCount > 9 ? '9+' : criticalCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Alert Section for Manager/Owner */}
        {(user.role === 'manager' || user.role === 'owner') && criticalCount > 0 && (
          <div className="mx-2 mt-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} style={{ color: '#ef4444' }} />
              <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Stok Kritis!</span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {criticalCount} item perlu perhatian
            </p>
            <Link to="/app/stock" className="text-xs mt-1 inline-block" style={{ color: '#FFD700' }}>
              Lihat detail →
            </Link>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <button
          onClick={() => void logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-150"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ff8080' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
