import { supabase } from '../lib/supabase';
import type { UserRole, ServiceResponse } from '../types/database';

export interface AuthUser {
  id: string;       // Real Supabase auth.users UUID — always
  email: string;
  role: UserRole;
  name: string;
  initials: string;
}

const DEMO: Record<string, { role: UserRole; name: string; initials: string; password: string; hourly_rate: number }> = {
  'owner@coffeestreet.com':   { role: 'owner',   name: 'Budi Santoso', initials: 'BS', password: 'kopi123', hourly_rate: 0 },
  'manager@coffeestreet.com': { role: 'manager', name: 'Siti Rahayu',  initials: 'SR', password: 'kopi123', hourly_rate: 25000 },
  'barista@coffeestreet.com': { role: 'barista', name: 'Ahmad Fauzi',  initials: 'AF', password: 'kopi123', hourly_rate: 15000 },
};

function deriveUser(id: string, email: string): AuthUser {
  const key = email.toLowerCase();
  const demo = DEMO[key];
  if (demo) return { id, email, role: demo.role, name: demo.name, initials: demo.initials };

  const role: UserRole = key.includes('owner') ? 'owner' : key.includes('manager') ? 'manager' : 'barista';
  const local = key.split('@')[0].replace(/[._-]/g, ' ');
  const initials = local.split(' ').map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || key[0].toUpperCase();
  return { id, email, role, name: local, initials };
}

// Upserts a profiles row so FK constraints on attendance/transactions/purchases resolve.
// Silently no-ops if the profiles table doesn't exist or the row is already correct.
async function syncProfile(user: AuthUser): Promise<void> {
  const key = user.email.toLowerCase();
  const demo = DEMO[key];
  try {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: user.name,
        role: user.role,
        avatar_initials: user.initials,
        hourly_rate: demo?.hourly_rate ?? 0,
        is_active: true,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Never block auth if the profiles table is missing or RLS rejects the write
  }
}

export const authService = {
  async signIn(email: string, password: string): Promise<ServiceResponse<AuthUser>> {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // If sign-in failed for a known demo account, create it then retry once
    if (error) {
      const demo = DEMO[email.toLowerCase()];
      if (demo && demo.password === password) {
        await supabase.auth.signUp({ email, password });
        const retry = await supabase.auth.signInWithPassword({ email, password });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error || !data?.user) {
      return { data: null, error: error?.message ?? 'Login gagal.' };
    }

    const authUser = deriveUser(data.user.id, data.user.email ?? email);

    // Ensure profiles row exists so FK references don't fail — fire and forget
    void syncProfile(authUser);

    return { data: authUser, error: null };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getSession(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const authUser = deriveUser(session.user.id, session.user.email ?? '');
    void syncProfile(authUser);
    return authUser;
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { callback(null); return; }
      const authUser = deriveUser(session.user.id, session.user.email ?? '');
      void syncProfile(authUser);
      callback(authUser);
    });
  },
};
