import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { Coffee, Eye, EyeOff, Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';

const ROLE_REDIRECT: Record<UserRole, string> = {
  barista: '/app/dashboard',
  manager: '/app/dashboard',
  owner: '/app/dashboard',
};

const DEMO_ACCOUNTS = [
  { label: 'Owner', username: 'owner', color: '#6F4E37', bg: '#FFF8E7' },
  { label: 'Manager', username: 'manager', color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Barista', username: 'barista', color: '#059669', bg: '#ecfdf5' },
];

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  if (user) {
    return <Navigate to={ROLE_REDIRECT[user.role]} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = login(username, password);
    setLoading(false);
    if (result.success) {
      const u = JSON.parse(localStorage.getItem('cs_user') || '{}');
      navigate(ROLE_REDIRECT[u.role as UserRole] || '/app/dashboard');
    } else {
      setError(result.message || 'Login gagal');
    }
  };

  const fillDemo = (uname: string) => {
    setUsername(uname);
    setPassword('kopi123');
    setError('');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #3d2b1f 0%, #6F4E37 40%, #8B6347 70%, #C19A6B 100%)',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      {/* Background texture overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          {/* Header */}
          <div className="px-8 py-8 text-center" style={{ background: '#5C3D2E' }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
              style={{ background: '#FFD700', boxShadow: '0 4px 20px rgba(255,215,0,0.4)' }}>
              <Coffee size={40} style={{ color: '#6F4E37' }} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Coffee Street
            </h1>
            <p style={{ color: '#C19A6B', fontSize: 14, marginTop: 4 }}>Management System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8" style={{ background: 'white' }}>
            <h2 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Montserrat, sans-serif', color: '#3d2b1f' }}>
              Masuk ke Akun Anda
            </h2>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4"
                style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  Username
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                    style={{
                      border: '1.5px solid #e5e7eb',
                      background: '#fafafa',
                      color: '#374151',
                    }}
                    onFocus={e => (e.target.style.border = '1.5px solid #6F4E37')}
                    onBlur={e => (e.target.style.border = '1.5px solid #e5e7eb')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-all"
                    style={{ border: '1.5px solid #e5e7eb', background: '#fafafa', color: '#374151' }}
                    onFocus={e => (e.target.style.border = '1.5px solid #6F4E37')}
                    onBlur={e => (e.target.style.border = '1.5px solid #e5e7eb')}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9ca3af' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#6F4E37' }}
                />
                <label htmlFor="remember" className="text-sm" style={{ color: '#6b7280' }}>
                  Ingat saya
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(111,78,55,0.35)',
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Masuk
                  </>
                )}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-6 pt-6 border-t" style={{ borderColor: '#f0e6da' }}>
              <p className="text-xs text-center mb-3" style={{ color: '#9ca3af' }}>
                Demo: Password semua akun adalah <strong>kopi123</strong>
              </p>
              <div className="flex gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.username}
                    onClick={() => fillDemo(acc.username)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: acc.bg, color: acc.color, border: `1px solid ${acc.color}20` }}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Coffee Street Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}