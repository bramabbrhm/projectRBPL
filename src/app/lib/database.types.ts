// Auto-generated Supabase database type shim.
// For full type safety, run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/app/lib/database.types.ts
// This minimal version satisfies the createClient<Database> generic.

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      products: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      inventory: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      suppliers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      purchases: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      purchase_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      transactions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      transaction_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      attendance: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      payroll: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      notifications: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
