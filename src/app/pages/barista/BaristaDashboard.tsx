import { Link } from 'react-router';
import {
  ShoppingCart, TrendingUp, Clock, CheckCircle, AlertCircle,
  Coffee, ArrowRight, Printer, CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTodayTransactions } from '../../hooks/useTransactions';
import { useAttendance } from '../../hooks/useAttendance';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const StatCard = ({ icon, label, value, sub, color, bg }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string; bg: string;
}) => (
  <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <div>
      <p className="text-sm" style={{ color: '#9ca3af' }}>{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>}
    </div>
  </div>
);

export function BaristaDashboard() {
  const { user } = useAuth();
  const { transactions, stats, loading: txLoading } = useTodayTransactions(user?.id);
  const { todayRecord, isCheckedIn } = useAttendance(user?.id ?? '');

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Pagi' : now.getHours() < 17 ? 'Siang' : 'Malam';
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const checkInTime = todayRecord?.time_in ? todayRecord.time_in.slice(0, 5) : null;

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Welcome Banner */}
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)', boxShadow: '0 4px 20px rgba(111,78,55,0.3)' }}>
        <div className="absolute right-0 top-0 bottom-0 opacity-10">
          <Coffee size={160} style={{ color: 'white', marginTop: -20, marginRight: -20 }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Selamat {greeting}, {user?.name?.split(' ')[0]}! ☕
          </h2>
          <p style={{ color: '#C19A6B', fontSize: 14, marginTop: 4 }}>{dateLabel}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{
              background: isCheckedIn ? '#4ade80' : '#ef4444',
              animation: isCheckedIn ? 'pulse 2s infinite' : 'none',
            }} />
            <span className="text-sm text-white">
              {isCheckedIn ? `Shift Aktif · Masuk ${checkInTime}` : 'Belum Absen Masuk'}
            </span>
          </div>
        </div>
        {checkInTime && (
          <div className="flex-shrink-0 hidden md:block">
            <div className="text-right">
              <p className="text-white text-xs opacity-70">Jam Masuk</p>
              <p className="text-2xl font-bold" style={{ color: '#FFD700', fontFamily: 'Montserrat, sans-serif' }}>{checkInTime}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<ShoppingCart size={24} />}
          label="Total Transaksi Hari Ini"
          value={txLoading ? '—' : `${stats.count} Transaksi`}
          sub="berhasil diproses"
          color="#6F4E37" bg="#FFF8E7"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          label="Total Pendapatan Hari Ini"
          value={txLoading ? '—' : formatRupiah(stats.revenue)}
          sub="Dari semua metode pembayaran"
          color="#059669" bg="#ecfdf5"
        />
        <StatCard
          icon={isCheckedIn ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          label="Status Shift"
          value={isCheckedIn ? 'Aktif' : 'Belum Absen'}
          sub={isCheckedIn ? `Masuk pukul ${checkInTime}` : 'Lakukan absen masuk'}
          color={isCheckedIn ? '#059669' : '#d97706'} bg={isCheckedIn ? '#ecfdf5' : '#fffbeb'}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
            Aksi Cepat
          </h3>
          <div className="space-y-3">
            {[
              { to: '/app/pos',        icon: <ShoppingCart size={20} />, label: 'Buka Kasir (POS)', color: '#6F4E37', bg: '#FFF8E7' },
              { to: '/app/attendance', icon: <Clock size={20} />,        label: 'Absensi',          color: '#059669', bg: '#ecfdf5' },
              { to: '/app/receipt',    icon: <Printer size={20} />,      label: 'Cetak Struk',      color: '#7c3aed', bg: '#f5f3ff' },
              { to: '/app/paycheck',   icon: <CreditCard size={20} />,   label: 'Lihat Paycheck',   color: '#d97706', bg: '#fffbeb' },
            ].map(action => (
              <Link key={action.to} to={action.to}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{ background: '#F5F5F5', textDecoration: 'none' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: action.bg }}>
                  <div style={{ color: action.color }}>{action.icon}</div>
                </div>
                <span className="text-sm font-medium flex-1" style={{ color: '#374151' }}>{action.label}</span>
                <ArrowRight size={14} style={{ color: '#9ca3af' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
            <h3 className="font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Transaksi Terakhir
            </h3>
            <Link to="/app/pos" className="text-xs font-semibold" style={{ color: '#6F4E37', textDecoration: 'none' }}>
              Lihat Semua
            </Link>
          </div>
          <div>
            {txLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6F4E37' }} />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Coffee size={32} style={{ color: '#d1d5db' }} />
                <p className="text-sm" style={{ color: '#9ca3af' }}>Belum ada transaksi hari ini</p>
              </div>
            ) : (
              <div>
                {transactions.slice(0, 4).map((t, i) => (
                  <div key={t.id} className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: i < Math.min(transactions.length - 1, 3) ? '1px solid #f3f4f6' : 'none' }}>
                    <div>
                      <p className="text-xs font-mono" style={{ color: '#9ca3af' }}>
                        {t.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm font-medium" style={{ color: '#374151' }}>
                        {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {t.payment_method}
                      </p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#6F4E37' }}>
                      {formatRupiah(t.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
