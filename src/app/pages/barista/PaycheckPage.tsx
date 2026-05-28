import { DollarSign, Clock, CheckCircle, Loader2, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyPaycheck } from '../../hooks/usePayroll';
import { useMonthSummary } from '../../hooks/useAttendance';
import { exportPayrollToPDF } from '../../services/exportService';
import type { PayrollRecord } from '../../types/database';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function PaycheckPage() {
  const { user } = useAuth();
  const { records, loading } = useMyPaycheck(user?.id ?? '');
  const summary = useMonthSummary(user?.id ?? '');

  const latestRecord = records[0] ?? null;
  const totalEarned = records.reduce((s, r) => s + r.net_salary, 0);

  const handlePrint = async () => {
    if (!records.length) return;
    const now = new Date();
    await exportPayrollToPDF([latestRecord!], now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));
  };

  const formatPeriod = (rec: PayrollRecord) => {
    return `${new Date(rec.period_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${new Date(rec.period_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Header Banner */}
      <div className="rounded-2xl p-6 mb-6"
        style={{ background: 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)', boxShadow: '0 4px 20px rgba(111,78,55,0.3)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#C19A6B' }}>Slip Gaji</p>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {user?.name}
        </h2>
        <p style={{ color: '#C19A6B', fontSize: 14, marginTop: 4 }}>
          {loading ? '—' : latestRecord ? formatPeriod(latestRecord) : 'Belum ada data payroll'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Payslip */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="rounded-2xl flex items-center justify-center"
              style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: 300 }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : !latestRecord ? (
            <div className="rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: 300 }}>
              <DollarSign size={40} style={{ color: '#d1d5db' }} />
              <p className="text-sm" style={{ color: '#9ca3af' }}>Belum ada slip gaji tersedia</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
                <h3 className="font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
                  Slip Gaji Terkini
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={latestRecord.status === 'Sudah Dibayar'
                      ? { background: '#ecfdf5', color: '#059669' }
                      : { background: '#fffbeb', color: '#d97706' }}>
                    {latestRecord.status}
                  </span>
                  <button onClick={handlePrint}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: '#FFF8E7', color: '#6F4E37' }}>
                    <Printer size={14} /> PDF
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { label: 'Periode',        value: formatPeriod(latestRecord) },
                    { label: 'Jam Kerja',      value: `${latestRecord.hours_worked} jam` },
                    { label: 'Tarif per Jam',  value: formatRupiah(latestRecord.hourly_rate) },
                    { label: 'Gaji Kotor',     value: formatRupiah(latestRecord.gross_salary) },
                    { label: 'Potongan',       value: `-${formatRupiah(latestRecord.deductions)}`, highlight: 'red' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-3 border-b"
                      style={{ borderColor: '#f3f4f6' }}>
                      <span className="text-sm" style={{ color: '#6b7280' }}>{row.label}</span>
                      <span className="text-sm font-semibold"
                        style={{ color: row.highlight === 'red' ? '#dc2626' : '#1f2937' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-4 px-4 rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, #FFF8E7 0%, #fffde7 100%)', border: '1px solid #FFD70040' }}>
                    <span className="font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#6F4E37' }}>
                      Gaji Bersih
                    </span>
                    <span className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#6F4E37' }}>
                      {formatRupiah(latestRecord.net_salary)}
                    </span>
                  </div>
                  {latestRecord.paid_at && (
                    <p className="text-xs text-center" style={{ color: '#9ca3af' }}>
                      Dibayarkan pada {new Date(latestRecord.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Kehadiran Bulan Ini
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              {[
                { label: 'Hadir',     value: summary.hadir,     color: '#059669', bg: '#ecfdf5' },
                { label: 'Terlambat', value: summary.terlambat, color: '#d97706', bg: '#fffbeb' },
                { label: 'Absen',     value: summary.absen,     color: '#dc2626', bg: '#fee2e2' },
              ].map(s => (
                <div key={s.label} className="rounded-xl py-3" style={{ background: s.bg }}>
                  <div className="text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.label}</div>
                </div>
              ))}
            </div>
            {summary.totalHours > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F5F5F5' }}>
                <Clock size={14} style={{ color: '#6F4E37' }} />
                <span className="text-xs" style={{ color: '#374151' }}>
                  Total {summary.totalHours.toFixed(1)} jam kerja bulan ini
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="font-bold text-sm mb-3" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Riwayat Gaji
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin" style={{ color: '#6F4E37' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {records.slice(0, 4).map(rec => (
                  <div key={rec.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: '#F5F5F5' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#374151' }}>
                        {new Date(rec.period_start).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>{rec.hours_worked}j</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#6F4E37' }}>{formatRupiah(rec.net_salary)}</p>
                      <span className="text-xs" style={{ color: rec.status === 'Sudah Dibayar' ? '#059669' : '#d97706' }}>
                        {rec.status === 'Sudah Dibayar' ? '✓ Lunas' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {records.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: '#9ca3af' }}>Belum ada riwayat</p>
                )}
              </div>
            )}
            {totalEarned > 0 && (
              <div className="mt-3 pt-3 border-t flex justify-between" style={{ borderColor: '#f3f4f6' }}>
                <span className="text-xs" style={{ color: '#9ca3af' }}>Total Diterima</span>
                <span className="text-sm font-bold" style={{ color: '#6F4E37' }}>{formatRupiah(totalEarned)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
