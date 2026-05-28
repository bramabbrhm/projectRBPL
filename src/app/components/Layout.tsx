import { Outlet, Navigate, useLocation, Link } from 'react-router';
import { Bell, Search, ChevronDown, LogOut, AlertTriangle, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/pos': 'Point of Sale',
  '/app/receipt': 'Cetak Struk',
  '/app/attendance': 'Absensi',
  '/app/paycheck': 'Paycheck Saya',
  '/app/stock': 'Monitoring Stok',
  '/app/purchase': 'Pembelian Bahan Baku',
  '/app/payroll': 'Manajemen Payroll',
  '/app/reports': 'Laporan Keuangan',
};

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  low_stock:      <AlertTriangle size={14} style={{ color: '#d97706' }} />,
  critical_stock: <AlertTriangle size={14} style={{ color: '#dc2626' }} />,
  payroll:        <Package size={14} style={{ color: '#7c3aed' }} />,
  system:         <Bell size={14} style={{ color: '#6F4E37' }} />,
};

export function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { notifications, unreadCount, markAllRead } = useNotifications(user?.role ?? 'barista');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#F5F5F5' }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6F4E37', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';
  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F5F5F5', fontFamily: 'Roboto, sans-serif' }}>
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 h-16 flex-shrink-0"
          style={{ background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 30 }}>
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              {title}
            </h1>
            <p className="text-xs" style={{ color: '#9ca3af' }}>{dateLabel}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Cari..."
                className="pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
                style={{ background: '#F5F5F5', border: '1px solid #e5e7eb', width: 200, color: '#374151' }}
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotif(!showNotif); setShowUserMenu(false); }}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: '#FFF8E7', border: '1px solid #FFE57A' }}>
                <Bell size={18} style={{ color: '#6F4E37' }} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{ background: '#ef4444', color: 'white', fontSize: 10 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-12 w-80 rounded-xl overflow-hidden z-50"
                  style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #f0e6da' }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ background: '#6F4E37', borderColor: '#8B6347' }}>
                    <span className="text-sm font-semibold text-white">Notifikasi</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: '#FFD700', color: '#6F4E37' }}>
                          {unreadCount} baru
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead}
                          className="text-xs"
                          style={{ color: '#C19A6B' }}>
                          Tandai baca
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Bell size={24} style={{ color: '#d1d5db' }} />
                        <p className="text-xs" style={{ color: '#9ca3af' }}>Tidak ada notifikasi</p>
                      </div>
                    ) : notifications.map(notif => (
                      <div key={notif.id}
                        className="px-4 py-3 border-b flex items-start gap-3"
                        style={{ borderColor: '#f3f4f6', background: notif.is_read ? 'white' : '#fafaf5' }}>
                        <div className="mt-0.5 flex-shrink-0">
                          {NOTIF_ICONS[notif.type] ?? NOTIF_ICONS.system}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium" style={{ color: '#374151' }}>{notif.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{notif.message}</div>
                          <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                            {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#6F4E37' }} />
                        )}
                      </div>
                    ))}
                  </div>
                  {(user.role === 'manager' || user.role === 'owner') && (
                    <div className="px-4 py-3">
                      <Link to="/app/stock" onClick={() => setShowNotif(false)}
                        className="w-full text-sm py-2 rounded-lg font-semibold flex items-center justify-center"
                        style={{ background: '#FFD700', color: '#6F4E37', textDecoration: 'none' }}>
                        Cek Stok Sekarang
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotif(false); }}
                className="flex items-center gap-2 cursor-pointer">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: '#6F4E37', color: '#FFD700' }}>
                  {user.avatar}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold" style={{ color: '#3d2b1f', fontFamily: 'Montserrat, sans-serif' }}>{user.name}</div>
                  <div className="text-xs" style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{user.role}</div>
                </div>
                <ChevronDown size={14} style={{ color: '#9ca3af' }} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-48 rounded-xl overflow-hidden z-50"
                  style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #f0e6da' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
                    <p className="text-sm font-semibold" style={{ color: '#1f2937' }}>{user.name}</p>
                    <p className="text-xs capitalize" style={{ color: '#9ca3af' }}>{user.role}</p>
                  </div>
                  <button
                    onClick={() => { void logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all"
                    style={{ color: '#dc2626' }}>
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Click-outside dismissals */}
      {(showNotif || showUserMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotif(false); setShowUserMenu(false); }} />
      )}
    </div>
  );
}
