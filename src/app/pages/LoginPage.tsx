import { useState } from 'react';
import { Navigate } from 'react-router';
import { Coffee, Eye, EyeOff, Lock, Mail, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3d2b1f 0%, #6F4E37 100%)' }}>
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/app/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.message ?? 'Login gagal. Periksa email dan password Anda.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #3d2b1f 0%, #6F4E37 40%, #8B6347 70%, #C19A6B 100%)',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

      <div className="w-full max-w-md mx-4 relative z-10">
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
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@coffeestreet.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                    style={{ border: '1.5px solid #e5e7eb', background: '#fafafa', color: '#374151' }}
                    onFocus={e => (e.target.style.border = '1.5px solid #6F4E37')}
                    onBlur={e => (e.target.style.border = '1.5px solid #e5e7eb')}
                    required
                    autoComplete="email"
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
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9ca3af' }}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-2"
                style={{
                  background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #6F4E37 0%, #8B6347 100%)',
                  color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(111,78,55,0.35)',
                }}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Masuk
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Coffee Street Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
