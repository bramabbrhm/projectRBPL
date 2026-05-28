import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, LogIn, LogOut, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance, useMonthSummary } from '../../hooks/useAttendance';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Hadir:    { bg: '#ecfdf5', color: '#059669' },
  Terlambat:{ bg: '#fffbeb', color: '#d97706' },
  Absen:    { bg: '#fee2e2', color: '#dc2626' },
};

const formatTime = (t: string | null) => t ? t.slice(0, 5) : '-';

export function AttendancePage() {
  const { user } = useAuth();
  const { todayRecord, history, loading, actionLoading, checkIn, checkOut, isCheckedIn, isCheckedOut } = useAttendance(user?.id ?? '');
  const summary = useMonthSummary(user?.id ?? '');

  const [now, setNow] = useState(new Date());
  const [showConfirm, setShowConfirm] = useState<null | 'in' | 'out'>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleAction = async (type: 'in' | 'out') => {
    setActionError(null);
    const result = type === 'in' ? await checkIn() : await checkOut();
    if (result.error) setActionError(result.error);
    setShowConfirm(null);
  };

  const checkInTime = todayRecord?.time_in ? formatTime(todayRecord.time_in) : null;
  const shiftActive = isCheckedIn;
  const shiftDone = isCheckedOut;

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-80" style={{ background: 'white', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif', color: '#1f2937' }}>
              Konfirmasi {showConfirm === 'in' ? 'Absen Masuk' : 'Absen Keluar'}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
              Waktu saat ini: <strong>{timeStr}</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: '#F5F5F5', color: '#6b7280' }}>
                Batal
              </button>
              <button
                onClick={() => handleAction(showConfirm)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#6F4E37', color: 'white', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock Card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="px-6 py-10 text-center"
              style={{ background: 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255,215,0,0.2)', border: '2px solid #FFD700' }}>
                <Clock size={32} style={{ color: '#FFD700' }} />
              </div>
              <div className="text-4xl font-bold text-white mb-2 tracking-widest"
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: 4 }}>
                {timeStr}
              </div>
              <div style={{ color: '#C19A6B', fontSize: 13 }}>{dateStr}</div>

              <div className="mt-4 px-4 py-2 rounded-xl inline-flex items-center gap-2"
                style={{ background: shiftActive ? 'rgba(74,222,128,0.15)' : shiftDone ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)' }}>
                <div className="w-2 h-2 rounded-full" style={{
                  background: shiftActive ? '#4ade80' : shiftDone ? '#60a5fa' : '#ef4444'
                }} />
                <span className="text-sm" style={{ color: shiftActive ? '#4ade80' : shiftDone ? '#60a5fa' : '#ef4444' }}>
                  {shiftActive
                    ? `Shift Aktif · Masuk ${checkInTime}`
                    : shiftDone
                      ? `Selesai · ${checkInTime} – ${formatTime(todayRecord?.time_out ?? null)}`
                      : 'Belum Absen'}
                </span>
              </div>
            </div>

            <div className="px-5 py-5 space-y-3" style={{ background: 'white' }}>
              <button
                onClick={() => !shiftActive && !shiftDone && setShowConfirm('in')}
                disabled={shiftActive || shiftDone || loading}
                className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
                style={{
                  background: (shiftActive || shiftDone) ? '#f0fdf4' : '#059669',
                  color: (shiftActive || shiftDone) ? '#6b7280' : 'white',
                  cursor: (shiftActive || shiftDone) ? 'not-allowed' : 'pointer',
                  border: (shiftActive || shiftDone) ? '2px solid #d1fae5' : 'none',
                }}>
                <LogIn size={20} />
                {shiftActive ? `Sudah Absen Masuk (${checkInTime})` : 'Absen Masuk'}
              </button>

              <button
                onClick={() => shiftActive && setShowConfirm('out')}
                disabled={!shiftActive || loading}
                className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
                style={{
                  background: !shiftActive ? '#F5F5F5' : '#6F4E37',
                  color: !shiftActive ? '#9ca3af' : 'white',
                  cursor: !shiftActive ? 'not-allowed' : 'pointer',
                }}>
                <LogOut size={20} />
                {shiftDone ? `Sudah Absen Keluar (${formatTime(todayRecord?.time_out ?? null)})` : 'Absen Keluar'}
              </button>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="mt-4 rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Ringkasan Bulan Ini
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
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
              <div className="mt-3 text-center text-xs" style={{ color: '#6b7280' }}>
                Total jam kerja: <strong>{summary.totalHours.toFixed(1)} jam</strong>
              </div>
            )}
          </div>
        </div>

        {/* Attendance History */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: '#f3f4f6' }}>
            <Calendar size={20} style={{ color: '#6F4E37' }} />
            <h3 className="font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Riwayat Absensi
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin" style={{ color: '#6F4E37' }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F5F5F5' }}>
                    {['Tanggal', 'Jam Masuk', 'Jam Keluar', 'Durasi', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: '#9ca3af' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>
                        Belum ada riwayat absensi
                      </td>
                    </tr>
                  ) : history.map((rec, i) => {
                    const timeIn = rec.time_in ? formatTime(rec.time_in) : '-';
                    const timeOut = rec.time_out ? formatTime(rec.time_out) : '-';
                    const duration = rec.work_hours ? `${Math.floor(rec.work_hours)}j ${Math.round((rec.work_hours % 1) * 60)}m` : '-';
                    const style = STATUS_STYLE[rec.status] ?? STATUS_STYLE.Absen;
                    const dateLabel = new Date(rec.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium" style={{ color: '#1f2937' }}>{dateLabel}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={14} style={{ color: rec.time_in ? '#059669' : '#d1d5db' }} />
                            <span className="text-sm" style={{ color: '#374151' }}>{timeIn}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <XCircle size={14} style={{ color: rec.time_out ? '#ef4444' : '#d1d5db' }} />
                            <span className="text-sm" style={{ color: '#374151' }}>{timeOut}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm" style={{ color: '#6b7280' }}>{duration}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: style.bg, color: style.color }}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
