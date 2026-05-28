import { Link } from 'react-router';
import {
  Package, ShoppingBag, Users, BarChart2, TrendingDown,
  AlertTriangle, ArrowRight, CheckCircle, Clock, Loader2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboard';
import { useLowStockItems } from '../../hooks/useInventory';
import { useTodayTransactions } from '../../hooks/useTransactions';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const StatCard = ({ icon, label, value, sub, color, bg, badge, loading }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: string; bg: string; badge?: string; loading?: boolean;
}) => (
  <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="flex-1">
      <p className="text-sm" style={{ color: '#9ca3af' }}>{label}</p>
      {loading ? (
        <div className="h-6 w-24 rounded-lg mt-1" style={{ background: '#f3f4f6' }} />
      ) : (
        <p className="text-xl font-bold mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>{value}</p>
      )}
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>}
    </div>
    {badge && (
      <span className="text-xs font-bold px-2 py-1 rounded-lg"
        style={{ background: '#fee2e2', color: '#dc2626' }}>{badge}</span>
    )}
  </div>
);

export function ManagerDashboard() {
  const { user } = useAuth();
  const { stats, chartData, loading } = useDashboardStats();
  const { items: lowStockItems } = useLowStockItems();
  const { transactions, stats: txStats, loading: txLoading } = useTodayTransactions();

  const chartDataScaled = chartData.slice(-5).map(d => ({
    ...d,
    revenue: d.revenue / 1000000,
    expense: d.expense / 1000000,
  }));

  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    Warning:  { bg: '#fffbeb', color: '#d97706' },
    Critical: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Welcome */}
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)', boxShadow: '0 4px 20px rgba(111,78,55,0.3)' }}>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Selamat Datang, {user?.name}! 👋
          </h2>
          <p style={{ color: '#C19A6B', fontSize: 14, marginTop: 4 }}>{dateLabel} · Pantau operasional harian</p>
        </div>
        {lowStockItems.length > 0 && (
          <Link to="/app/stock"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', textDecoration: 'none', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={16} />
            {lowStockItems.length} Item Stok Rendah
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<BarChart2 size={26} />} label="Pendapatan Hari Ini"
          value={txLoading ? '—' : formatRupiah(txStats.revenue)}
          sub={txLoading ? '' : `${txStats.count} transaksi`}
          color="#059669" bg="#ecfdf5" loading={txLoading}
        />
        <StatCard
          icon={<Package size={26} />} label="Stok Critical"
          value={loading ? '—' : stats?.critical_stock_count ?? 0}
          sub={stats?.warning_stock_count ? `+${stats.warning_stock_count} warning` : undefined}
          color="#dc2626" bg="#fee2e2" badge={stats?.critical_stock_count ? '!' : undefined} loading={loading}
        />
        <StatCard
          icon={<Clock size={26} />} label="Payroll Pending"
          value={loading ? '—' : stats?.pending_payroll_count ?? 0}
          sub="karyawan belum dibayar" color="#d97706" bg="#fffbeb" loading={loading}
        />
        <StatCard
          icon={<Users size={26} />} label="Pendapatan Bulan Ini"
          value={loading ? '—' : formatRupiah(stats?.revenue_month ?? 0)}
          color="#7c3aed" bg="#f5f3ff" loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Chart */}
        <div className="lg:col-span-3 rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
            Revenue vs Expense (5 Bulan) — dalam Juta Rp
          </h3>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 200 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDataScaled}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}M`, '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Pendapatan" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions */}
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="font-bold text-sm mb-3" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Aksi Cepat
            </h3>
            <div className="space-y-2">
              {[
                { to: '/app/stock', icon: <Package size={18} />, label: 'Monitor Stok', color: '#dc2626', bg: '#fee2e2' },
                { to: '/app/purchase', icon: <ShoppingBag size={18} />, label: 'Buat PO', color: '#7c3aed', bg: '#f5f3ff' },
                { to: '/app/payroll', icon: <Users size={18} />, label: 'Kelola Payroll', color: '#d97706', bg: '#fffbeb' },
              ].map(action => (
                <Link key={action.to} to={action.to}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{ background: '#F5F5F5', textDecoration: 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: action.bg }}>
                    <div style={{ color: action.color }}>{action.icon}</div>
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#374151' }}>{action.label}</span>
                  <ArrowRight size={14} className="ml-auto" style={{ color: '#9ca3af' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
                Stok Perlu Perhatian
              </h3>
              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map(item => {
                  const style = STATUS_STYLE[item.status] ?? STATUS_STYLE.Warning;
                  return (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: style.bg }}>
                      <span className="text-xs font-medium" style={{ color: style.color }}>{item.name}</span>
                      <span className="text-xs font-bold" style={{ color: style.color }}>
                        {item.available} {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Transactions */}
      {!txLoading && transactions.length > 0 && (
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
            <h3 className="font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Transaksi Hari Ini
            </h3>
            <span className="text-xs" style={{ color: '#9ca3af' }}>{transactions.length} transaksi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F5F5F5' }}>
                  {['ID', 'Waktu', 'Kasir', 'Metode', 'Total'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#9ca3af' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: '#6b7280' }}>
                      {t.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>
                      {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>
                      {(t.cashier as { full_name: string })?.full_name ?? '-'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: '#F5F5F5', color: '#6b7280' }}>
                        {t.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: '#6F4E37' }}>
                      {formatRupiah(t.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
